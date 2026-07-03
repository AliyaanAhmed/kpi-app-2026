import type {
  Attachment,
  ChangeRequest,
  ChangeRequestType,
  Cycle,
  FocalPointSubmissionInstance,
  Kpi,
  KpiSubmission,
  KpiTemplate,
  Role,
  SubmissionStatus,
  User,
} from '../domain/types'
import { useAppStore } from '../store/appStore'

function data() {
  return useAppStore.getState().data
}

function currentUser() {
  const store = useAppStore.getState()
  return store.data.users.find((user) => user.id === store.activeUserId) ?? store.data.users[0]
}

function stamp(submission: KpiSubmission, toStatus: SubmissionStatus, note?: string) {
  const actor = currentUser()
  const updated: KpiSubmission = {
    ...submission,
    status: toStatus,
    history: [
      ...submission.history,
      {
        id: `hist-${submission.id}-${Date.now()}`,
        actorId: actor.id,
        actorRole: actor.role,
        fromStatus: submission.status,
        toStatus,
        note,
        timestamp: new Date().toISOString(),
      },
    ],
  }
  useAppStore.getState().upsertSubmission(updated)
  return updated
}

function cycleKpis(cycleId: string) {
  const appData = data()
  const cycle = appData.cycles.find((item) => item.id === cycleId)
  const template = appData.templates.find((item) => item.id === cycle?.templateId)
  return appData.kpis.filter((kpi) => template?.kpiIds.includes(kpi.id))
}

function assignedFocalPointId(kpi: Kpi, cycleId: string) {
  const appData = data()
  const existing = appData.submissions.find((submission) => submission.cycleId === cycleId && submission.kpiId === kpi.id)
  if (existing) return existing.focalPointId
  const cycle = appData.cycles.find((item) => item.id === cycleId)
  const template = appData.templates.find((item) => item.id === cycle?.templateId)
  const templateIndex = Math.max(0, template?.kpiIds.indexOf(kpi.id) ?? 0)
  const team = appData.teams.find((item) => item.departmentId === kpi.departmentId)
  return team?.focalPointIds[templateIndex % Math.max(1, team.focalPointIds.length)]
}

function canRoleSeeKpi(role: Role, userId: string, cycleId: string, kpi: Kpi) {
  const appData = data()
  const user = appData.users.find((item) => item.id === userId)
  if (!user) return false
  if (role === 'admin' || role === 'performance_team') return true
  if (role === 'focal_point') return assignedFocalPointId(kpi, cycleId) === userId
  if (role === 'department_director') return kpi.departmentId === user.departmentId
  if (role === 'executive_director') {
    const submission = appData.submissions.find((item) => item.cycleId === cycleId && item.kpiId === kpi.id)
    return (
      submission?.status === 'published' &&
      appData.departments.find((department) => department.id === kpi.departmentId)?.sectorId === user.sectorId
    )
  }
  if (role === 'director_general') {
    return appData.submissions.some((item) => item.cycleId === cycleId && item.kpiId === kpi.id && item.status === 'published')
  }
  return false
}

function buildDraftSubmission(kpi: Kpi, cycleId: string, focalPointId: string): KpiSubmission {
  const appData = data()
  const team = appData.teams.find((item) => item.departmentId === kpi.departmentId)
  const cycle = appData.cycles.find((item) => item.id === cycleId)
  return {
    id: `sub-${cycleId}-${kpi.id}-${focalPointId}`,
    kpiId: kpi.id,
    cycleId,
    focalPointId,
    teamId: team?.id ?? `team-${kpi.departmentId}`,
    targetScore: cycle?.targetScore ?? 90,
    actualScore: undefined,
    answers: kpi.questions.map((question) => ({ questionId: question.id, answer: '' })),
    attachments: [],
    status: 'active',
    history: [
      {
        id: `hist-${cycleId}-${kpi.id}-active`,
        actorId: focalPointId,
        actorRole: 'focal_point',
        fromStatus: 'active',
        toStatus: 'active',
        note: 'KPI activated for the selected cycle.',
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

function isChangeRequestCycleEligible(cycle: Cycle) {
  const label = cycle.label.toLowerCase()
  if (/\bq[12]\b/.test(label)) return true
  const startMonth = new Date(`${cycle.startDate}T00:00:00`).getMonth()
  return startMonth >= 0 && startMonth <= 5
}

function currentKpiValue(kpi: Kpi, cycleId: string, type: ChangeRequestType) {
  if (type === 'target_score') {
    const submission = data().submissions.find((item) => item.kpiId === kpi.id && item.cycleId === cycleId)
    return String(submission?.targetScore ?? data().cycles.find((cycle) => cycle.id === cycleId)?.targetScore ?? 0)
  }
  if (type === 'definition') return kpi.description
  return kpi.name
}

function applyApprovedChangeRequest(changeRequest: ChangeRequest) {
  const appData = data()
  const kpi = appData.kpis.find((item) => item.id === changeRequest.kpiId)
  if (!kpi) return

  if (changeRequest.type === 'target_score') {
    const targetScore = Number(changeRequest.proposedValue)
    if (!Number.isFinite(targetScore)) return
    appData.submissions
      .filter((submission) => submission.cycleId === changeRequest.cycleId && submission.kpiId === changeRequest.kpiId)
      .forEach((submission) => useAppStore.getState().upsertSubmission({ ...submission, targetScore }))
    return
  }

  if (changeRequest.type === 'definition') {
    useAppStore.getState().upsertKpi({ ...kpi, description: changeRequest.proposedValue })
    return
  }

  useAppStore.getState().upsertKpi({ ...kpi, name: changeRequest.proposedValue })
}

function instanceStatus(submissions: KpiSubmission[]): FocalPointSubmissionInstance['status'] {
  if (submissions.some((submission) => ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status))) return 'clarification'
  if (submissions.length && submissions.every((submission) => submission.status === 'published')) return 'published'
  if (submissions.length && submissions.every((submission) => ['approved_by_director', 'director_approved', 'published'].includes(submission.status))) return 'approved_by_director'
  if (submissions.length && submissions.every((submission) => ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))) return 'reviewed_by_director'
  if (submissions.length && submissions.every((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))) return 'submitted_to_director'
  if (submissions.length && submissions.every((submission) => ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))) return 'reviewed_by_performance_team'
  if (submissions.length && submissions.every((submission) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))) return 'submitted_to_performance_team'
  return 'draft'
}

function focalPointInstances(cycleId: string): FocalPointSubmissionInstance[] {
  const appData = data()
  const cycleKpiIds = new Set(cycleKpis(cycleId).map((kpi) => kpi.id))
  const grouped = appData.submissions
    .filter((submission) => submission.cycleId === cycleId && cycleKpiIds.has(submission.kpiId))
    .reduce((map, submission) => {
      const list = map.get(submission.focalPointId) ?? []
      list.push(submission)
      map.set(submission.focalPointId, list)
      return map
    }, new Map<string, KpiSubmission[]>())

  return Array.from(grouped.entries()).map(([focalPointId, submissions]) => {
    const departmentIds = Array.from(new Set(
      submissions
        .map((submission) => appData.kpis.find((kpi) => kpi.id === submission.kpiId)?.departmentId)
        .filter((departmentId): departmentId is string => Boolean(departmentId)),
    ))
    const sectorIds = Array.from(new Set(
      departmentIds
        .map((departmentId) => appData.departments.find((department) => department.id === departmentId)?.sectorId)
        .filter((sectorId): sectorId is string => Boolean(sectorId)),
    ))
    return {
      id: `instance-${cycleId}-${focalPointId}`,
      cycleId,
      focalPointId,
      departmentIds,
      sectorIds,
      status: instanceStatus(submissions),
      submissions,
    }
  })
}

export const mockApi = {
  getCurrentUser: currentUser,
  getUsers: () => data().users,
  getCycles: () => data().cycles,
  getActiveCycle: () => data().cycles.find((cycle) => cycle.id === useAppStore.getState().activeCycleId),
  getKpis: () => data().kpis,
  getTemplates: () => data().templates,
  getSectors: () => data().sectors,
  getDepartments: () => data().departments,
  getTeams: () => data().teams,
  getSubmissions: () => data().submissions,
  getFocalPointInstances: focalPointInstances,
  getChangeRequests: () => data().changeRequests,
  getSubmission: (id: string) => data().submissions.find((submission) => submission.id === id),
  getCycleKpis: cycleKpis,
  getAssignedFocalPointId: assignedFocalPointId,
  getSubmissionForKpi: (kpiId: string, cycleId: string, userId?: string) =>
    data().submissions.find(
      (submission) =>
        submission.kpiId === kpiId &&
        submission.cycleId === cycleId &&
        (!userId || submission.focalPointId === userId),
    ),
  getKpi: (id: string) => data().kpis.find((kpi) => kpi.id === id),
  getTemplate: (id: string) => data().templates.find((template) => template.id === id),
  getDepartment: (id: string) => data().departments.find((department) => department.id === id),
  getTemplateKpis: (templateId: string) => {
    const template = data().templates.find((item) => item.id === templateId)
    return data().kpis.filter((kpi) => template?.kpiIds.includes(kpi.id))
  },
  getTemplateDepartments: (templateId: string) => {
    const kpis = mockApi.getTemplateKpis(templateId)
    const departmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
    return data().departments.filter((department) => departmentIds.has(department.id))
  },
  getVisibleSubmissionsForRole: (role: Role, userId: string, cycleId: string) => {
    const appData = data()
    const user = appData.users.find((item) => item.id === userId)
    const existing = appData.submissions.filter((submission) => {
      if (submission.cycleId !== cycleId) return false
      const kpi = appData.kpis.find((item) => item.id === submission.kpiId)
      if (!kpi || !user) return false
      if (role === 'admin' || role === 'performance_team') return true
      if (role === 'focal_point') return submission.focalPointId === userId
      if (role === 'department_director') return kpi.departmentId === user.departmentId
      if (role === 'executive_director') {
        return (
          submission.status === 'published' &&
          appData.departments.find((department) => department.id === kpi.departmentId)?.sectorId === user.sectorId
        )
      }
      if (role === 'director_general') return submission.status === 'published'
      return false
    })
    if (role === 'executive_director' || role === 'director_general') return existing

    const existingKpiIds = new Set(existing.map((submission) => submission.kpiId))
    const draftAssignments = cycleKpis(cycleId)
      .filter((kpi) => !existingKpiIds.has(kpi.id) && canRoleSeeKpi(role, userId, cycleId, kpi))
      .map((kpi) => buildDraftSubmission(kpi, cycleId, assignedFocalPointId(kpi, cycleId) ?? userId))

    return [...existing, ...draftAssignments]
  },
  getKpisForRole: (role: Role, userId: string, cycleId: string) => {
    return cycleKpis(cycleId).filter((kpi) => canRoleSeeKpi(role, userId, cycleId, kpi))
  },
  ensureSubmissionForKpi: (kpiId: string, cycleId: string, userId: string) => {
    const existing = data().submissions.find(
      (submission) => submission.kpiId === kpiId && submission.cycleId === cycleId && submission.focalPointId === userId,
    )
    if (existing) return existing
    const kpi = data().kpis.find((item) => item.id === kpiId)
    if (!kpi || assignedFocalPointId(kpi, cycleId) !== userId) return undefined
    const submission = buildDraftSubmission(kpi, cycleId, userId)
    useAppStore.getState().upsertSubmission(submission)
    return submission
  },
  upsertKpi: (kpi: Kpi) => useAppStore.getState().upsertKpi(kpi),
  upsertTemplate: (template: KpiTemplate) => useAppStore.getState().upsertTemplate(template),
  upsertCycle: (cycle: Cycle) => useAppStore.getState().upsertCycle(cycle),
  upsertUser: (user: User) => useAppStore.getState().upsertUser(user),
  upsertChangeRequest: (changeRequest: ChangeRequest) => useAppStore.getState().upsertChangeRequest(changeRequest),
  isChangeRequestCycleEligible,
  createChangeRequest: (payload: Omit<ChangeRequest, 'id' | 'status' | 'createdAt' | 'currentValue'>) => {
    const cycle = data().cycles.find((item) => item.id === payload.cycleId)
    const kpi = data().kpis.find((item) => item.id === payload.kpiId)
    if (!cycle || !kpi || !isChangeRequestCycleEligible(cycle)) return undefined
    const changeRequest: ChangeRequest = {
      ...payload,
      id: `cr-${Date.now()}`,
      currentValue: currentKpiValue(kpi, payload.cycleId, payload.type),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    useAppStore.getState().upsertChangeRequest(changeRequest)
    return changeRequest
  },
  decideChangeRequest: (id: string, decision: 'approved' | 'rejected', adminNote?: string, proposedValue?: string) => {
    const existing = data().changeRequests.find((item) => item.id === id)
    if (!existing || existing.status !== 'pending') return existing
    const updated: ChangeRequest = {
      ...existing,
      proposedValue: proposedValue ?? existing.proposedValue,
      status: decision,
      adminNote,
      decidedAt: new Date().toISOString(),
      decidedBy: currentUser().id,
    }
    if (decision === 'approved') applyApprovedChangeRequest(updated)
    useAppStore.getState().upsertChangeRequest(updated)
    return updated
  },
  saveKpiDraft: (
    id: string,
    payload: { actualScore?: number; answers: { questionId: string; answer: string }[]; attachments: Attachment[] },
  ) => {
    const submission = data().submissions.find((item) => item.id === id)
    if (!submission || !['active', 'draft', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)) return submission
    const updated = {
      ...submission,
      status: 'draft' as const,
      actualScore: payload.actualScore,
      answers: payload.answers,
      attachments: payload.attachments,
      history: submission.status === 'active'
        ? [
            ...submission.history,
            {
              id: `hist-${submission.id}-${Date.now()}`,
              actorId: currentUser().id,
              actorRole: currentUser().role,
              fromStatus: 'active' as const,
              toStatus: 'draft' as const,
              note: 'Focal Point saved KPI response as draft.',
              timestamp: new Date().toISOString(),
            },
          ]
        : submission.history,
    }
    useAppStore.getState().upsertSubmission(updated)
    return updated
  },
  submitKpi: (id: string, note = 'Submitted by Focal Point') => {
    const submission = data().submissions.find((item) => item.id === id)
    if (!submission || !['draft', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)) return submission
    return stamp(submission, 'submitted_to_performance_team', note)
  },
  submitFocalPointKpis: (userId: string, cycleId: string, note = 'Bulk submitted by Focal Point') => {
    const visibleSubmissions = mockApi.getVisibleSubmissionsForRole('focal_point', userId, cycleId)
    return visibleSubmissions
      .map((submission) => {
        const persisted =
          data().submissions.find((item) => item.id === submission.id) ??
          mockApi.ensureSubmissionForKpi(submission.kpiId, cycleId, userId)
        if (!persisted || !['draft', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(persisted.status)) return persisted
        return stamp(persisted, 'submitted_to_performance_team', note)
      })
      .filter((submission): submission is KpiSubmission => Boolean(submission))
  },
  raiseClarification: (id: string, note: string) => {
    const submission = data().submissions.find((item) => item.id === id)
    if (!submission) return submission
    const toStatus = ['submitted_to_director', 'reviewed_by_director'].includes(submission.status) ? 'clarification_from_director' : 'clarification_from_performance'
    return stamp(submission, toStatus, note)
  },
  reviewByPerformanceTeam: (id: string, comment: string, note = 'Reviewed by Performance Team') => {
    const submission = data().submissions.find((item) => item.id === id)
    const trimmedComment = comment.trim()
    if (!submission || !['submitted_to_performance_team', 'with_performance_team'].includes(submission.status) || !trimmedComment) return submission
    const updated: KpiSubmission = { ...submission, performanceTeamComment: trimmedComment }
    useAppStore.getState().upsertSubmission(updated)
    return stamp(updated, 'reviewed_by_performance_team', note)
  },
  submitToDirector: (id: string, note = 'Validated and submitted to Department Director') => {
    const submission = data().submissions.find((item) => item.id === id)
    if (!submission || !['reviewed_by_performance_team', 'with_performance_team'].includes(submission.status)) return submission
    return stamp(submission, 'submitted_to_director', note)
  },
  reviewByDirector: (id: string, comment: string, note = 'Reviewed by Department Director') => {
    const submission = data().submissions.find((item) => item.id === id)
    const trimmedComment = comment.trim()
    if (!submission || submission.status !== 'submitted_to_director' || !trimmedComment) return submission
    const updated: KpiSubmission = { ...submission, directorComment: trimmedComment }
    useAppStore.getState().upsertSubmission(updated)
    return stamp(updated, 'reviewed_by_director', note)
  },
  approveKpi: (id: string, note = 'Approved by Department Director') => {
    const submission = data().submissions.find((item) => item.id === id)
    if (!submission || !['reviewed_by_director', 'submitted_to_director'].includes(submission.status)) return submission
    return stamp(submission, 'approved_by_director', note)
  },
  publishKpis: (ids: string[], note = 'Published by Performance Team') =>
    ids
      .map((id) => data().submissions.find((item) => item.id === id))
      .filter((submission): submission is KpiSubmission => Boolean(submission))
      .map((submission) =>
        ['approved_by_director', 'director_approved'].includes(submission.status) ? stamp(submission, 'published', note) : submission,
      ),
}
