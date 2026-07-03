import { StatusPill } from '../components/ui/StatusPill'
import { AppSelect } from '../components/ui/AppSelect'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleUserRound, ClipboardX, Search, Sparkles } from 'lucide-react'
import { cn } from '../lib/cn'
import type { KpiSubmission, SubmissionStatus } from '../domain/types'
import { useToast } from '../context/ToastContext'

type KpiStatusFilter =
  | 'all'
  | 'active'
  | 'draft'
  | 'submitted'
  | 'performance_assigned'
  | 'focal_points'
  | 'submitted_to_director'
  | 'reviewed_by_director'
  | 'director_approved'
  | 'published'
  | 'clarification_focal'
  | 'clarification_director'

type AiFilter = 'all' | 'insufficient_evidence' | 'evidence_mismatch' | 'low_quality'

function displayKpiId(id: string) {
  return id.replace(/^kpi-/i, '').toUpperCase()
}

function aiReviewScoreForSubmission(submission?: { actualScore?: number; targetScore: number; attachments: unknown[]; answers: { answer: string }[] }) {
  if (!submission) return 0
  const answered = submission.answers.filter((answer) => answer.answer.trim().length >= 20).length
  const evidenceBonus = Math.min(18, submission.attachments.length * 9)
  const scoreBonus = submission.actualScore === undefined ? 0 : Math.min(22, Math.round((submission.actualScore / Math.max(1, submission.targetScore)) * 18))
  return Math.min(96, 42 + answered * 8 + evidenceBonus + scoreBonus)
}

function assignmentForKpi(kpiId: string, activeCycleId: string) {
  const kpi = mockApi.getKpi(kpiId)
  const submission = mockApi.getVisibleSubmissionsForRole('admin', 'u-admin', activeCycleId).find((item) => item.kpiId === kpiId)
  const users = mockApi.getUsers()
  const focalPoint = submission?.focalPointId
    ? users.find((item) => item.id === submission.focalPointId)
    : kpi
      ? users.find((item) => item.id === mockApi.getAssignedFocalPointId(kpi, activeCycleId))
      : undefined
  const department = kpi ? mockApi.getDepartment(kpi.departmentId) : undefined
  const director = department ? users.find((item) => item.id === department.directorId) : undefined
  const performanceUser = users.find((item) => item.role === 'performance_team')
  const status = submission?.status ?? 'active'

  if (['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(status)) {
    return { role: 'Focal Point', name: focalPoint?.name ?? 'Unassigned Focal Point' }
  }
  if (['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'approved_by_director', 'director_approved'].includes(status)) {
    return { role: 'Performance Team', name: performanceUser?.name ?? 'Performance Team Queue' }
  }
  if (status === 'submitted_to_director' || status === 'reviewed_by_director') {
    return { role: 'Department Director', name: director?.name ?? 'Department Director Queue' }
  }
  if (status === 'published') {
    return { role: 'Published View', name: 'Executive / DGE visibility' }
  }
  return { role: 'Workflow Owner', name: focalPoint?.name ?? 'Unassigned' }
}

export function KpisPage() {
  const { activeCycleId } = useAppStore()
  const [sectorFilter, setSectorFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<KpiStatusFilter>('all')
  const [aiFilter, setAiFilter] = useState<AiFilter>('all')
  const [query, setQuery] = useState('')
  const { showSuccessToast, showErrorToast } = useToast()
  const user = mockApi.getCurrentUser()
  const roleKpis = mockApi.getKpisForRole(user.role, user.id, activeCycleId)
  const departments = mockApi.getDepartments()
  const sectors = mockApi.getSectors()
  const assignedDepartment = user.departmentId ? departments.find((department) => department.id === user.departmentId) : undefined
  const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const submissionByKpi = useMemo(() => new Map(submissions.map((submission) => [submission.kpiId, submission])), [submissions])
  const kpis = useMemo(
    () => user.role === 'admin'
      ? roleKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'active')
      : roleKpis,
    [roleKpis, submissionByKpi, user.role],
  )
  const visibleDepartmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
  const visibleDepartments = departments.filter((department) => visibleDepartmentIds.has(department.id))
  const visibleSectorIds = new Set(visibleDepartments.map((department) => department.sectorId))
  const visibleSectors = sectors.filter((sector) => visibleSectorIds.has(sector.id))
  const defaultPerformanceSectorId = visibleSectors[0]?.id
  useEffect(() => {
    setSectorFilter(user.role === 'performance_team' && defaultPerformanceSectorId ? defaultPerformanceSectorId : 'all')
    setDepartmentFilter('all')
    setStatusFilter('all')
    setAiFilter('all')
    setQuery('')
  }, [activeCycleId, defaultPerformanceSectorId, user.id, user.role])
  const statusMatches = useCallback((status: SubmissionStatus) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return status === 'active'
    if (statusFilter === 'draft') return status === 'draft'
    if (statusFilter === 'submitted') return ['submitted', 'submitted_to_performance_team', 'with_performance_team'].includes(status)
    if (statusFilter === 'performance_assigned') return ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'approved_by_director', 'director_approved'].includes(status)
    if (statusFilter === 'focal_points') return ['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(status)
    if (statusFilter === 'reviewed_by_director') return ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(status)
    if (statusFilter === 'director_approved') return ['approved_by_director', 'director_approved'].includes(status)
    if (statusFilter === 'clarification_focal') return ['clarification_focal', 'clarification_from_performance'].includes(status)
    if (statusFilter === 'clarification_director') return ['clarification_director', 'clarification_from_director'].includes(status)
    return status === statusFilter
  }, [statusFilter])
  const filteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        const submission = submissionByKpi.get(kpi.id)
        const status = submission?.status ?? 'active'
        const matchesSector = sectorFilter === 'all' || department?.sectorId === sectorFilter
        const matchesDepartment = departmentFilter === 'all' || kpi.departmentId === departmentFilter
        const matchesQuery = `${kpi.name} ${kpi.description} ${kpi.category} ${department?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = !['focal_point', 'performance_team', 'department_director'].includes(user.role) || statusMatches(status)
        const aiScore = aiReviewScoreForSubmission(submission)
        const matchesAi =
          user.role !== 'focal_point' ||
          aiFilter === 'all' ||
          (aiFilter === 'insufficient_evidence' && !submission?.attachments.length) ||
          (aiFilter === 'evidence_mismatch' && submission?.actualScore !== undefined && submission.actualScore >= submission.targetScore && !submission.attachments.length) ||
          (aiFilter === 'low_quality' && aiScore < 70)
        return matchesSector && matchesDepartment && matchesQuery && matchesStatus && matchesAi
      }),
    [aiFilter, departmentFilter, departments, kpis, query, sectorFilter, statusMatches, submissionByKpi, user.role],
  )
  const departmentTabs = useMemo(
    () => [
      { id: 'all', label: 'All Departments', count: kpis.length },
      ...visibleDepartments.map((department) => ({
        id: department.id,
        label: department.name,
        count: kpis.filter((kpi) => kpi.departmentId === department.id).length,
      })),
    ],
    [kpis, visibleDepartments],
  )
  const sectorTabs = useMemo(
    () => [
      { id: 'all', label: 'All Sectors', count: kpis.length },
      ...visibleSectors.map((sector) => {
        const sectorDepartmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
        return {
          id: sector.id,
          label: sector.name,
          count: kpis.filter((kpi) => sectorDepartmentIds.has(kpi.departmentId)).length,
        }
      }),
    ],
    [departments, kpis, visibleSectors],
  )
  const performanceSectorTabs = sectorTabs
  const performanceSectorFilteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        return sectorFilter === 'all' || department?.sectorId === sectorFilter
      }),
    [departments, kpis, sectorFilter],
  )
  const performanceDepartmentTabs = useMemo(
    () => [
      { id: 'all', label: 'All Departments', count: performanceSectorFilteredKpis.length },
      ...visibleDepartments
        .filter((department) => sectorFilter === 'all' || department.sectorId === sectorFilter)
        .map((department) => ({
          id: department.id,
          label: department.name,
          count: performanceSectorFilteredKpis.filter((kpi) => kpi.departmentId === department.id).length,
        })),
    ],
    [performanceSectorFilteredKpis, sectorFilter, visibleDepartments],
  )
  const baseDepartmentFilteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        const matchesSector = sectorFilter === 'all' || department?.sectorId === sectorFilter
        const matchesDepartment = departmentFilter === 'all' || kpi.departmentId === departmentFilter
        return matchesSector && matchesDepartment
      }),
    [departmentFilter, departments, kpis, sectorFilter],
  )
  const statusTabs = [
    { id: 'all' as const, label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'active' as const,
      label: 'Pending Entry',
      count: baseDepartmentFilteredKpis.filter((kpi) => {
        const status = submissionByKpi.get(kpi.id)?.status ?? 'active'
        return status === 'active'
      }).length,
    },
    {
      id: 'draft' as const,
      label: 'Completed',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'draft').length,
    },
  ]
  const aiTabs: { id: AiFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All AI', count: baseDepartmentFilteredKpis.length },
    {
      id: 'insufficient_evidence',
      label: 'Insufficient Evidence',
      count: baseDepartmentFilteredKpis.filter((kpi) => !(submissionByKpi.get(kpi.id)?.attachments.length)).length,
    },
    {
      id: 'evidence_mismatch',
      label: 'Evidence Not Match Values',
      count: baseDepartmentFilteredKpis.filter((kpi) => {
        const submission = submissionByKpi.get(kpi.id)
        return submission?.actualScore !== undefined && submission.actualScore >= submission.targetScore && !submission.attachments.length
      }).length,
    },
    {
      id: 'low_quality',
      label: 'Quality Score Is Low',
      count: baseDepartmentFilteredKpis.filter((kpi) => aiReviewScoreForSubmission(submissionByKpi.get(kpi.id)) < 70).length,
    },
  ]
  const performanceStatusTabs: { id: KpiStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'performance_assigned',
      label: 'Assigned to Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'approved_by_director', 'director_approved'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
    {
      id: 'submitted_to_director',
      label: 'Submitted to Director',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'submitted_to_director').length,
    },
    {
      id: 'published',
      label: 'Published',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'published').length,
    },
    {
      id: 'clarification_focal',
      label: 'Clarification from Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['clarification_focal', 'clarification_from_performance'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
    {
      id: 'clarification_director',
      label: 'Clarification from Director',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['clarification_director', 'clarification_from_director'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
  ]
  const directorStatusTabs: { id: KpiStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'submitted_to_director',
      label: 'Pending Review',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'submitted_to_director').length,
    },
    {
      id: 'reviewed_by_director',
      label: 'Reviewed',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
  ]
  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active
        ? 'bg-primary text-white shadow-soft'
        : 'border border-border bg-surface-raised text-text hover:bg-primary-tint hover:text-primary',
    )
  const directorPendingVisible = filteredKpis
    .map((kpi) => submissionByKpi.get(kpi.id))
    .filter((submission): submission is KpiSubmission => submission !== undefined && submission.status === 'submitted_to_director')
  const canBulkDirectorReview = directorPendingVisible.length > 0 && directorPendingVisible.every((submission) => submission.directorComment?.trim())
  const bulkMarkDirectorReviewed = () => {
    if (!directorPendingVisible.length) {
      showErrorToast('No pending KPIs', 'There are no submitted KPIs visible for director review.')
      return
    }
    if (!canBulkDirectorReview) {
      showErrorToast('Director comment required', 'Every KPI needs a Director comment before bulk review.')
      return
    }
    directorPendingVisible.forEach((submission) => mockApi.reviewByDirector(submission.id, submission.directorComment ?? 'Director review completed.'))
    showSuccessToast('KPIs reviewed', `${directorPendingVisible.length} KPI records were marked as reviewed.`)
  }

  return (
    <section className="space-y-4">
      <div className="px-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Role and cycle filtered</p>
            <h2 className="text-xl">KPI Browser</h2>
            <p className="mt-1 text-sm text-muted">
              {user.role === 'department_director' && assignedDepartment
                ? `${filteredKpis.length} KPI records visible for ${assignedDepartment.name} only.`
                : `${filteredKpis.length} visible KPI records for the selected cycle.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.role === 'department_director' ? (
              <button className="btn-primary h-9 text-xs" disabled={!canBulkDirectorReview} onClick={bulkMarkDirectorReviewed} title="All visible pending KPIs need Director comments before bulk review." type="button">
                Bulk Mark as Reviewed
              </button>
            ) : null}
            <StatusPill value={user.role} />
          </div>
        </div>
        {user.role === 'focal_point' ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {departmentTabs.map((tab) => (
                <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                  {tab.label}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-tint px-4 py-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="font-semibold text-text">You can submit to Performance Team once all KPIs are completed.</p>
            </div>
          </div>
        ) : null}
        {user.role === 'performance_team' ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-sm font-extrabold">Performance filters</h3>
                <p className="mt-1 text-xs text-muted">Select one sector, narrow by department, then filter by workflow movement.</p>
              </div>
              <div className="form-field-surface flex h-10 w-full items-center gap-2 px-3 text-muted xl:w-[440px]">
                <Search className="h-4 w-4" />
                <input className="h-full flex-1 bg-transparent text-sm font-medium text-text outline-none" placeholder="Search KPI, category, or department..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Sectors</span>
                <div className="flex flex-wrap gap-2">
                  {performanceSectorTabs.map((tab) => (
                    <button
                      className={tabClass(sectorFilter === tab.id)}
                      key={tab.id}
                      onClick={() => {
                        setSectorFilter(tab.id)
                        setDepartmentFilter('all')
                      }}
                      type="button"
                    >
                      {tab.label}
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', sectorFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Departments</span>
                <div className="flex flex-wrap gap-2">
                  {performanceDepartmentTabs.map((tab) => (
                    <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                      {tab.label}
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Flow</span>
                <div className="flex flex-wrap gap-2">
                {performanceStatusTabs.map((tab) => (
                  <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {user.role !== 'performance_team' ? (
        <div className={cn('mt-4 grid gap-3', user.role === 'focal_point' ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ['department_director', 'executive_director', 'director_general'].includes(user.role) ? 'lg:grid-cols-1' : 'lg:grid-cols-[1fr_260px]')}>
          <div className="form-field-surface flex h-10 items-center gap-2 px-3 text-muted">
            <Search className="h-4 w-4" />
            <input className="h-full flex-1 bg-transparent text-sm font-medium text-text outline-none" placeholder="Search KPI, category, or department..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {user.role === 'focal_point' ? (
            <div className="grid h-10 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Sparkles className="h-4 w-4" />
                AI
              </div>
              <AppSelect
                value={aiFilter}
                onValueChange={(value) => setAiFilter(value as AiFilter)}
                options={aiTabs.map((tab) => ({ value: tab.id, label: `${tab.label} (${tab.count})` }))}
              />
            </div>
          ) : null}
          {!['focal_point', 'department_director', 'executive_director', 'director_general'].includes(user.role) ? (
            <AppSelect
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              options={
                user.role === 'department_director' && assignedDepartment
                  ? [{ value: 'all', label: assignedDepartment.name }]
                  : [{ value: 'all', label: 'All visible departments' }, ...visibleDepartments.map((department) => ({ value: department.id, label: department.name }))]
              }
            />
          ) : null}
        </div>
        ) : null}
        {user.role === 'director_general' ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
              <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Sectors</span>
              <div className="flex flex-wrap gap-2">
                {sectorTabs.map((tab) => (
                  <button
                    className={tabClass(sectorFilter === tab.id)}
                    key={tab.id}
                    onClick={() => {
                      setSectorFilter(tab.id)
                      setDepartmentFilter('all')
                    }}
                    type="button"
                  >
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', sectorFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
              <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Departments</span>
              <div className="flex flex-wrap gap-2">
                {performanceDepartmentTabs.map((tab) => (
                  <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {user.role === 'executive_director' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {departmentTabs.map((tab) => (
              <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {user.role === 'department_director' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {directorStatusTabs.map((tab) => (
              <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {user.role === 'focal_point' ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {statusTabs.map((tab) => (
              <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="card overflow-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="sticky top-0 bg-primary-tint text-xs uppercase text-muted">
            {user.role === 'admin' ? (
              <tr><th className="px-4 py-3">KPI</th><th>Department</th><th>Category</th><th>Status</th></tr>
            ) : user.role === 'focal_point' ? (
              <tr><th className="px-4 py-3">ID</th><th>KPI Name</th><th>AI Review Score</th><th>Is Completed</th><th>Department</th><th>Status</th></tr>
            ) : user.role === 'department_director' ? (
              <tr><th className="px-4 py-3">ID</th><th>KPI Name</th><th>AI Score</th><th>Actual</th><th>Target</th><th>Focal Point</th><th>Status</th></tr>
            ) : (
              <tr><th className="px-4 py-3">KPI</th><th>Department</th><th>Assigned To</th><th>Category</th><th>Status</th></tr>
            )}
          </thead>
          <tbody>
            {filteredKpis.map((kpi) => {
              const assignment = assignmentForKpi(kpi.id, activeCycleId)
              const submission = submissions.find((item) => item.kpiId === kpi.id)
              const score = aiReviewScoreForSubmission(submission)
              return (
                <tr className="border-t border-border hover:bg-primary-tint" key={kpi.id}>
                  {user.role === 'focal_point' ? (
                    <>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(kpi.id)}</span></td>
                      <td>
                        <Link className="font-semibold text-text transition hover:text-primary" to={`/kpis/${kpi.id}/fill`}>{kpi.name}</Link>
                        <p className="text-xs text-muted">{kpi.description}</p>
                      </td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}>
                          <Sparkles className="h-3 w-3" /> {score}
                        </span>
                      </td>
                      <td><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', (submission?.status === 'draft' || submission?.actualScore !== undefined) ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>{(submission?.status === 'draft' || submission?.actualScore !== undefined) ? 'Completed' : 'Pending Entry'}</span></td>
                      <td>{departments.find((department) => department.id === kpi.departmentId)?.name}</td>
                      <td><StatusPill value={submission?.status ?? 'active'} /></td>
                    </>
                  ) : user.role === 'department_director' ? (
                    <>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(kpi.id)}</span></td>
                      <td>
                        <Link className="font-semibold text-text transition hover:text-primary" to={`/kpis/${kpi.id}`}>{kpi.name}</Link>
                      </td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}>
                          <Sparkles className="h-3 w-3" /> {score}
                        </span>
                      </td>
                      <td className="font-mono font-bold">{submission?.actualScore ?? '-'}</td>
                      <td className="font-mono font-bold">{submission?.targetScore ?? '-'}</td>
                      <td>
                        <div className="flex min-w-[190px] items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                            <CircleUserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{assignment.name}</p>
                            <p className="text-xs text-muted">Focal Point</p>
                          </div>
                        </div>
                      </td>
                      <td><StatusPill value={submission?.status ?? 'active'} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="mb-2 inline-flex rounded-full bg-primary-tint px-2.5 py-1 font-mono text-[11px] font-extrabold text-primary">{displayKpiId(kpi.id)}</span>
                        <Link className="block font-semibold text-text transition hover:text-primary" to={`/kpis/${kpi.id}`}>{kpi.name}</Link>
                        <p className="text-xs text-muted">{kpi.description}</p>
                      </td>
                      <td>{departments.find((department) => department.id === kpi.departmentId)?.name}</td>
                      {user.role === 'admin' ? (
                        <>
                          <td>{kpi.category}</td>
                          <td><StatusPill value={submission?.status ?? 'active'} /></td>
                        </>
                      ) : (
                        <>
                      <td>
                        <div className="flex min-w-[210px] items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                            <CircleUserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{assignment.name}</p>
                            <p className="text-xs text-muted">{assignment.role}</p>
                          </div>
                        </div>
                      </td>
                      <td>{kpi.category}</td>
                      <td><StatusPill value={submission?.status ?? 'active'} /></td>
                        </>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
            {!filteredKpis.length ? (
              <tr>
                <td className="px-4 py-12" colSpan={user.role === 'admin' ? 4 : user.role === 'focal_point' ? 6 : user.role === 'department_director' ? 7 : 5}>
                  <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                      <ClipboardX className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-base font-extrabold text-text">No KPIs found</p>
                    <p className="mt-2 text-sm leading-6 text-muted">No KPI records match the selected role, cycle, search, or filters. Try clearing filters or switching cycle.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
