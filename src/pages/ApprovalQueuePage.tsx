import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardX, MessageSquare, Send, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
import { AppSelect } from '../components/ui/AppSelect'
import { useToast } from '../context/ToastContext'
import type { FocalPointSubmissionInstance, KpiSubmission } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'
import { cn } from '../lib/cn'

interface ApprovalQueuePageProps {
  mode: 'performance' | 'director'
}

function queueAiScore(submission: KpiSubmission) {
  const answered = submission.answers.filter((answer) => answer.answer.trim().length >= 25).length
  const evidenceBonus = Math.min(22, submission.attachments.length * 11)
  const scoreBonus = submission.actualScore === undefined ? 0 : Math.min(20, Math.round((submission.actualScore / Math.max(1, submission.targetScore)) * 18))
  return Math.min(98, 40 + answered * 8 + evidenceBonus + scoreBonus)
}

function displayKpiId(id: string) {
  return id.replace(/^kpi-/i, '').toUpperCase()
}

const directorFlowStatuses = ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published']

function PerformanceValidationQueue() {
  const { activeCycleId } = useAppStore()
  const { showSuccessToast } = useToast()
  const location = useLocation()
  const restoredInstanceId = (location.state as { selectedInstanceId?: string } | null)?.selectedInstanceId
  const [sectorFilter, setSectorFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'submitted_to_director'>('all')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(restoredInstanceId ?? null)
  const [selectedPerformanceSubmissionIds, setSelectedPerformanceSubmissionIds] = useState<string[]>([])
  const [gridDepartmentFilter, setGridDepartmentFilter] = useState('all')
  const [gridDimensionFilter, setGridDimensionFilter] = useState('all')
  const [gridAiFilter, setGridAiFilter] = useState('all')
  const [gridStatusFilter, setGridStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [clarifying, setClarifying] = useState<KpiSubmission | null>(null)
  const [bulkClarifyOpen, setBulkClarifyOpen] = useState(false)
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false)
  const performanceComments: Record<string, string> = {}
  const [note, setNote] = useState('')
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const users = mockApi.getUsers()
  const kpis = mockApi.getKpis()
  const instances = mockApi.getFocalPointInstances(activeCycleId)
  const sectorOptions = [
    { value: 'all', label: 'All Sectors' },
    ...sectors.map((sector) => ({ value: sector.id, label: sector.name })),
  ]
  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments
      .filter((department) => sectorFilter === 'all' || department.sectorId === sectorFilter)
      .map((department) => ({ value: department.id, label: department.name })),
  ]
  const baseInstances = instances
    .map((instance) => {
      const filteredSubmissions = instance.submissions.filter((submission) => {
        const kpi = kpis.find((item) => item.id === submission.kpiId)
        const department = departments.find((item) => item.id === kpi?.departmentId)
        const matchesSector = sectorFilter === 'all' || department?.sectorId === sectorFilter
        const matchesDepartment = departmentFilter === 'all' || department?.id === departmentFilter
        return matchesSector && matchesDepartment
      })
      return { ...instance, submissions: filteredSubmissions }
    })
    .filter((instance) => instance.submissions.length > 0)
  const instanceMatchesStatus = (instance: FocalPointSubmissionInstance, status: typeof statusFilter) => {
    if (status === 'all') return true
    if (status === 'pending') return instance.submissions.some((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status))
    if (status === 'reviewed') return instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'reviewed_by_performance_team')
    return instance.submissions.some((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))
  }
  const visibleInstances = baseInstances.filter((instance) => instanceMatchesStatus(instance, statusFilter))
  const statusTabs = [
    { id: 'all' as const, label: 'All', count: baseInstances.length },
    { id: 'pending' as const, label: 'Pending Review', count: baseInstances.filter((instance) => instanceMatchesStatus(instance, 'pending')).length },
    { id: 'reviewed' as const, label: 'Reviewed', count: baseInstances.filter((instance) => instanceMatchesStatus(instance, 'reviewed')).length },
    { id: 'submitted_to_director' as const, label: 'Submitted to Director', count: baseInstances.filter((instance) => instanceMatchesStatus(instance, 'submitted_to_director')).length },
  ]
  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:bg-primary-tint hover:text-primary',
    )

  const selectedInstance = selectedInstanceId ? visibleInstances.find((instance) => instance.id === selectedInstanceId) : undefined

  function submitGroup(instance: FocalPointSubmissionInstance) {
    instance.submissions.forEach((submission) => mockApi.submitToDirector(submission.id, 'Focal point submission sent to Department Director.'))
    showSuccessToast('Submitted to Director', 'Reviewed focal point submission moved to Director review.')
  }

  function publishGroup(instance: FocalPointSubmissionInstance) {
    mockApi.publishKpis(instance.submissions.map((submission) => submission.id))
    showSuccessToast('Published', 'Approved focal point submission has been published.')
  }

  function confirmClarification() {
    if (!clarifying || !note.trim()) return
    mockApi.raiseClarification(clarifying.id, note)
    showSuccessToast('Clarification returned', 'The KPI is back with the Focal Point for updates.')
    setClarifying(null)
    setNote('')
  }

  function reviewSelectedKpis(ids: string[]) {
    const missingComment = ids.some((id) => {
      const submission = selectedInstance?.submissions.find((item) => item.id === id)
      return !((performanceComments[id] ?? submission?.performanceTeamComment ?? '').trim())
    })
    if (missingComment) return
    ids.forEach((id) => {
      const submission = selectedInstance?.submissions.find((item) => item.id === id)
      mockApi.reviewByPerformanceTeam(id, performanceComments[id] ?? submission?.performanceTeamComment ?? '')
    })
    showSuccessToast('KPIs reviewed', `${ids.length} KPI record${ids.length === 1 ? '' : 's'} reviewed by Performance Team.`)
    setSelectedPerformanceSubmissionIds([])
  }

  function submitSelectedToDirector(ids: string[]) {
    ids.forEach((id) => mockApi.submitToDirector(id, 'Clarification response sent back to Department Director.'))
    showSuccessToast('Submitted to Director', `${ids.length} KPI record${ids.length === 1 ? '' : 's'} sent to Department Director.`)
    setSelectedPerformanceSubmissionIds([])
  }

  function confirmBulkClarification() {
    if (!note.trim() || !selectedPerformanceSubmissionIds.length) return
    selectedPerformanceSubmissionIds.forEach((id) => mockApi.raiseClarification(id, note))
    showSuccessToast('Clarification returned', `${selectedPerformanceSubmissionIds.length} KPI record${selectedPerformanceSubmissionIds.length === 1 ? '' : 's'} returned to the Focal Point.`)
    setBulkClarifyOpen(false)
    setSelectedPerformanceSubmissionIds([])
    setNote('')
  }

  function instanceStats(instance: FocalPointSubmissionInstance) {
    const reviewed = instance.submissions.filter((submission) => ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
    const avgAiScore = Math.round(instance.submissions.reduce((sum, submission) => sum + queueAiScore(submission), 0) / Math.max(1, instance.submissions.length))
    const needsComment = instance.submissions.filter((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status) && !submission.performanceTeamComment).length
    const weakEvidence = instance.submissions.filter((submission) => submission.attachments.length === 0).length
    const evidenceMismatch = instance.submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0).length
    const pendingValidation = Math.max(0, instance.submissions.length - reviewed)
    const progress = Math.round((reviewed / Math.max(1, instance.submissions.length)) * 100)
    return { reviewed, avgAiScore, needsComment, progress, weakEvidence, evidenceMismatch, pendingValidation }
  }

  if (selectedInstance) {
    const focalPoint = users.find((user) => user.id === selectedInstance.focalPointId)
    const departmentNames = Array.from(new Set(selectedInstance.submissions.map((submission) => mockApi.getDepartment(mockApi.getKpi(submission.kpiId)?.departmentId ?? '')?.name).filter(Boolean)))
    const stats = instanceStats(selectedInstance)
    const canSubmitDirector = selectedInstance.submissions.length > 0 && selectedInstance.submissions.every((submission) => submission.status === 'reviewed_by_performance_team')
    const canPublish = selectedInstance.submissions.length > 0 && selectedInstance.submissions.every((submission) => ['approved_by_director', 'director_approved'].includes(submission.status))
    const selectedSubmissions = selectedInstance.submissions.filter((submission) => selectedPerformanceSubmissionIds.includes(submission.id))
    const selectedStatuses = new Set(selectedSubmissions.map((submission) => submission.status))
    const hasSingleActionState = selectedStatuses.size === 1
    const canBulkReview = hasSingleActionState && selectedStatuses.has('submitted_to_performance_team')
    const canBulkSubmitDirector = hasSingleActionState && selectedStatuses.has('reviewed_by_performance_team') && selectedSubmissions.every((submission) => {
      const hasDirectorFlow = selectedInstance.submissions.some((item) => directorFlowStatuses.includes(item.status))
      const wasDirectorClarification = submission.history.some((event) => event.toStatus === 'clarification_from_director')
      return hasDirectorFlow || wasDirectorClarification
    })
    const canBulkClarify = hasSingleActionState && selectedStatuses.has('submitted_to_performance_team')
    const selectedMissingComment = selectedSubmissions.some((submission) => !((performanceComments[submission.id] ?? submission.performanceTeamComment ?? '').trim()))
    const getAnswer = (submission: KpiSubmission, label: string) => {
      const kpi = mockApi.getKpi(submission.kpiId)
      const question = kpi?.questions.find((item) => item.label.toLowerCase().includes(label))
      return submission.answers.find((answer) => answer.questionId === question?.id)?.answer.trim() ?? ''
    }
    const hasWeakText = (value: string) => value.length > 0 && value.length < 35
    const gridDepartments = Array.from(new Set(selectedInstance.submissions.map((submission) => mockApi.getKpi(submission.kpiId)?.departmentId).filter(Boolean)))
      .map((id) => departments.find((department) => department.id === id))
      .filter(Boolean)
    const gridDimensions = Array.from(new Set(selectedInstance.submissions.map((submission) => mockApi.getKpi(submission.kpiId)?.category).filter(Boolean)))
    const gridDepartmentOptions = [{ value: 'all', label: 'All Departments' }, ...gridDepartments.map((department) => ({ value: department!.id, label: department!.name }))]
    const gridDimensionOptions = [{ value: 'all', label: 'All Dimensions' }, ...gridDimensions.map((dimension) => ({ value: dimension!, label: dimension! }))]
    const gridAiOptions = [
      { value: 'all', label: 'All AI Checks' },
      { value: 'insufficient_evidence', label: 'Insufficient Evidence' },
      { value: 'evidence_mismatch', label: 'Evidence Mismatch' },
      { value: 'low_quality', label: 'Low AI Score' },
    ]
    const filteredGridSubmissions = selectedInstance.submissions.filter((submission) => {
      const kpi = mockApi.getKpi(submission.kpiId)
      const matchesDepartment = gridDepartmentFilter === 'all' || kpi?.departmentId === gridDepartmentFilter
      const matchesDimension = gridDimensionFilter === 'all' || kpi?.category === gridDimensionFilter
      const matchesStatus =
        gridStatusFilter === 'all' ||
        (gridStatusFilter === 'pending' && ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status)) ||
        (gridStatusFilter === 'reviewed' && ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))
      const matchesAi =
        gridAiFilter === 'all' ||
        (gridAiFilter === 'insufficient_evidence' && submission.attachments.length === 0) ||
        (gridAiFilter === 'evidence_mismatch' && submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0) ||
        (gridAiFilter === 'low_quality' && queueAiScore(submission) < 70)
      return matchesDepartment && matchesDimension && matchesStatus && matchesAi
    })
    const gridStatusTabs = [
      { id: 'all' as const, label: 'All', count: selectedInstance.submissions.length },
      { id: 'pending' as const, label: 'Pending Review', count: selectedInstance.submissions.filter((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status)).length },
      { id: 'reviewed' as const, label: 'Reviewed', count: selectedInstance.submissions.filter((submission) => ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length },
    ]
    const allSelected = filteredGridSubmissions.length > 0 && filteredGridSubmissions.every((submission) => selectedPerformanceSubmissionIds.includes(submission.id))
    const aiRows = [
      {
        label: 'KPIs with insufficient evidence',
        description: 'Evidence is missing or not enough for Performance Team validation.',
        submissions: selectedInstance.submissions.filter((submission) => submission.attachments.length === 0),
      },
      {
        label: 'KPIs where evidence may not match entered actual value',
        description: 'Actual value looks strong, but supporting evidence is missing or weak.',
        submissions: selectedInstance.submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0),
      },
      {
        label: 'KPIs where analysis is weak, missing, or unclear',
        description: 'Analysis needs clearer interpretation before validation.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakText(getAnswer(submission, 'analysis')) || !getAnswer(submission, 'analysis')),
      },
      {
        label: 'KPIs where challenges are missing or not specific',
        description: 'Challenge narrative should explain blockers and ownership.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakText(getAnswer(submission, 'challenge')) || !getAnswer(submission, 'challenge')),
      },
      {
        label: 'KPIs where recommendations are missing or generic',
        description: 'Recommendations should include specific corrective action.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakText(getAnswer(submission, 'recommendation')) || !getAnswer(submission, 'recommendation')),
      },
      {
        label: 'KPIs that may need better wording before validation',
        description: 'AI quality score indicates the wording can be improved.',
        submissions: selectedInstance.submissions.filter((submission) => queueAiScore(submission) < 70),
      },
    ]
    const toggleSelection = (id: string) => {
      setSelectedPerformanceSubmissionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    }
    return (
      <div className="space-y-5">
        <motion.section className="raised-card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <button className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold text-muted transition hover:text-primary" onClick={() => { setSelectedInstanceId(null); setSelectedPerformanceSubmissionIds([]) }} type="button">
            <ArrowLeft className="h-4 w-4" /> Back to Validation Queue
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-3xl">{focalPoint?.name ?? 'Focal Point'} Submission</h2>
              <p className="mt-2 text-sm text-muted">{departmentNames.join(', ') || 'No departments'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span title="When all KPIs of this submission are reviewed, it can be submitted to Director.">
                <button className="btn-primary h-10 text-xs" disabled={!canSubmitDirector} onClick={() => submitGroup(selectedInstance)} type="button"><Send className="h-4 w-4" /> Submit to Director</button>
              </span>
              <button className="btn-primary h-10 text-xs" disabled={!canPublish} onClick={() => publishGroup(selectedInstance)} type="button"><ShieldCheck className="h-4 w-4" /> Publish</button>
            </div>
          </div>
          <div className="mt-5 w-full rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-soft)] text-[var(--ai-strong)]">
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold"
              onClick={() => setAiSummaryOpen((open) => !open)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI summary: {stats.weakEvidence} KPIs have weak evidence and {stats.evidenceMismatch} KPIs do not match with evidence uploaded.
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', aiSummaryOpen ? 'rotate-180' : '')} />
            </button>
            {aiSummaryOpen ? (
              <motion.div
                className="border-t border-[var(--ai-border)] p-3"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {aiRows.map((row, index) => (
                    <motion.div
                      className="rounded-2xl border border-[var(--ai-border)] bg-white/75 p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--ai)] dark:bg-white/5"
                      key={row.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-extrabold leading-5 text-text">{row.label}</p>
                        <span className="rounded-full px-2.5 py-1 font-mono text-sm font-extrabold" style={{ backgroundColor: 'color-mix(in srgb, var(--ai) 12%, transparent)', color: 'var(--ai-strong)' }}>
                          {row.submissions.length}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{row.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {row.submissions.slice(0, 8).map((submission) => (
                          <Link
                            className="rounded-full border border-[var(--ai-border)] bg-white px-2 py-1 font-mono text-[11px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                            key={submission.id}
                            state={{ returnTo: '/approval/validate', selectedInstanceId: selectedInstance.id, returnLabel: 'Back to Validation Queue' }}
                            to={`/kpis/${submission.kpiId}`}
                          >
                            {displayKpiId(submission.kpiId)}
                          </Link>
                        ))}
                        {!row.submissions.length ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted dark:bg-white/5">No KPI IDs flagged</span>
                        ) : null}
                        {row.submissions.length > 8 ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted dark:bg-white/5">+{row.submissions.length - 8}</span>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </div>
        </motion.section>

        <section className="card p-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {gridStatusTabs.map((tab) => (
                <button className={tabClass(gridStatusFilter === tab.id)} key={tab.id} onClick={() => setGridStatusFilter(tab.id)} type="button">
                  {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', gridStatusFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:w-[720px]">
              <AppSelect value={gridDepartmentFilter} onValueChange={setGridDepartmentFilter} options={gridDepartmentOptions} placeholder="Department" />
              <AppSelect value={gridDimensionFilter} onValueChange={setGridDimensionFilter} options={gridDimensionOptions} placeholder="Dimension" />
              <AppSelect className="border-[var(--ai-border)] bg-[var(--ai-soft)] text-[var(--ai-strong)]" value={gridAiFilter} onValueChange={setGridAiFilter} options={gridAiOptions} placeholder="AI Filter" />
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-extrabold text-text">{selectedSubmissions.length} selected</p>
              <p className="mt-1 text-xs font-semibold text-muted">Select KPIs with the same status to enable bulk Performance Team actions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary h-9 text-xs" disabled={!canBulkReview || !selectedSubmissions.length || selectedMissingComment} title="Performance Team comment is required before review." onClick={() => reviewSelectedKpis(selectedPerformanceSubmissionIds)} type="button">
                <Check className="h-4 w-4" /> Mark as Reviewed
              </button>
              <button className="btn-secondary h-9 text-xs" disabled={!canBulkClarify || !selectedSubmissions.length} onClick={() => setBulkClarifyOpen(true)} type="button">
                <MessageSquare className="h-4 w-4" /> Clarify
              </button>
              <button className="btn-primary h-9 text-xs" disabled={!canBulkSubmitDirector || !selectedSubmissions.length} onClick={() => submitSelectedToDirector(selectedPerformanceSubmissionIds)} type="button">
                <Send className="h-4 w-4" /> Submit to Department Director
              </button>
            </div>
          </div>
        </section>

        <motion.article className="card overflow-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    aria-label="Select all KPIs"
                    checked={allSelected}
                    className="h-4 w-4 rounded border-border accent-primary"
                    onChange={(event) => setSelectedPerformanceSubmissionIds(event.target.checked ? filteredGridSubmissions.map((submission) => submission.id) : [])}
                    type="checkbox"
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th>KPI Name</th>
                <th>AI Review Score</th>
                <th>Actual Score</th>
                <th>Target</th>
                <th>Department</th>
                <th>Assigned To</th>
                <th>Dimension</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGridSubmissions.map((submission) => {
                const kpi = mockApi.getKpi(submission.kpiId)
                const department = departments.find((item) => item.id === kpi?.departmentId)
                const director = department ? users.find((user) => user.id === department.directorId) : undefined
                const performanceOwner = users.find((user) => user.role === 'performance_team')
                const focalOwner = users.find((user) => user.id === submission.focalPointId)
                const assignedTo = ['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)
                  ? focalOwner?.name ?? focalPoint?.name ?? 'Focal Point'
                  : ['submitted_to_director', 'reviewed_by_director'].includes(submission.status)
                    ? director?.name ?? 'Department Director'
                    : ['published'].includes(submission.status)
                      ? 'Published View'
                      : performanceOwner?.name ?? 'Performance Team'
                const score = queueAiScore(submission)
                return (
                  <tr className="border-t border-border hover:bg-primary-tint/40" key={submission.id}>
                    <td className="px-4 py-3">
                      <input
                        aria-label={`Select ${kpi?.name ?? submission.kpiId}`}
                        checked={selectedPerformanceSubmissionIds.includes(submission.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                        onChange={() => toggleSelection(submission.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(submission.kpiId)}</span></td>
                    <td><Link className="font-bold transition hover:text-primary" state={{ returnTo: '/approval/validate', selectedInstanceId: selectedInstance.id, returnLabel: 'Back to Validation Queue' }} to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link></td>
                    <td><span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}><Sparkles className="h-4 w-4" />{score}</span></td>
                    <td><span className="font-mono text-sm font-extrabold text-text">{submission.actualScore ?? '-'}</span></td>
                    <td><span className="font-mono text-sm font-extrabold text-text">{submission.targetScore}</span></td>
                    <td>{department?.name ?? 'Unassigned Department'}</td>
                    <td>
                      <div className="flex min-w-[190px] items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="min-w-0 truncate text-sm font-semibold">{assignedTo}</p>
                      </div>
                    </td>
                    <td>{kpi?.category ?? '-'}</td>
                    <td><StatusPill value={submission.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.article>

        <Modal
          open={bulkClarifyOpen}
          onOpenChange={(open) => !open && setBulkClarifyOpen(false)}
          icon={<MessageSquare className="h-5 w-5" />}
          eyebrow="Clarification"
          title="Return selected KPIs for clarification"
          description="All selected KPIs will move back to the Focal Point with this clarification note."
          footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setBulkClarifyOpen(false)}>Cancel</button><button className="btn-primary" disabled={!note.trim()} onClick={confirmBulkClarification}>Send Clarification</button></div>}
        >
          <textarea
            className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Write the clarification note..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Modal>

        <Modal
          open={Boolean(clarifying)}
          onOpenChange={(open) => !open && setClarifying(null)}
          icon={<MessageSquare className="h-5 w-5" />}
          eyebrow="Clarification"
          title="Return KPI for clarification"
          description="This writes a status-history event and returns the KPI to the Focal Point for updates."
          footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setClarifying(null)}>Cancel</button><button className="btn-primary" onClick={confirmClarification}>Send Clarification</button></div>}
        >
          <textarea
            className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Write the clarification note..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl">Validation Queue</h2>
            <p className="mt-2 text-sm text-muted">Focal point submissions are grouped by owner. Open a card to review KPI records in full width.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Focal Point Instances</p></div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.reduce((sum, item) => sum + item.submissions.length, 0)}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">KPIs</p></div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.filter((item) => item.status === 'reviewed_by_performance_team').length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Ready</p></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
              {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="grid shrink-0 gap-3 md:grid-cols-2 xl:w-[500px]">
          <AppSelect
            value={sectorFilter}
            onValueChange={(value) => {
              setSectorFilter(value)
              setDepartmentFilter('all')
            }}
            options={sectorOptions}
          />
          <AppSelect value={departmentFilter} onValueChange={setDepartmentFilter} options={departmentOptions} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleInstances.map((instance, index) => {
          const focalPoint = users.find((user) => user.id === instance.focalPointId)
          const departmentNames = Array.from(new Set(instance.submissions.map((submission) => mockApi.getDepartment(mockApi.getKpi(submission.kpiId)?.departmentId ?? '')?.name).filter(Boolean)))
          const stats = instanceStats(instance)
          const canSubmitDirector = instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'reviewed_by_performance_team')
          const canPublish = instance.submissions.length > 0 && instance.submissions.every((submission) => ['approved_by_director', 'director_approved'].includes(submission.status))
          return (
            <motion.article className="group rounded-[24px] border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card" key={instance.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <button className="block w-full text-left" onClick={() => setSelectedInstanceId(instance.id)} type="button">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <h3 className="truncate text-xl font-extrabold transition group-hover:text-primary">{focalPoint?.name ?? 'Focal Point'}</h3>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-muted transition group-hover:border-primary group-hover:text-primary" aria-label="Open review detail">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">{departmentNames.join(', ') || 'No departments'}</p>
                    <div className="mt-3 rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-soft)] px-3 py-2 text-sm font-semibold text-[var(--ai-strong)]">
                      <Sparkles className="mr-2 inline h-4 w-4" />
                      AI summary: {stats.weakEvidence} KPIs have weak evidence and {stats.evidenceMismatch} KPIs do not match with evidence uploaded.
                    </div>
                    <p className="mt-2 text-sm font-bold text-text">
                      Validation: {instance.submissions.length} KPIs - {stats.reviewed} Completed, {stats.pendingValidation} Pending
                    </p>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>Review Progress</span><span>{stats.reviewed}/{instance.submissions.length} KPI reviewed</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary-tint"><div className="h-full rounded-full bg-primary" style={{ width: `${stats.progress}%` }} /></div>
                    </div>
                  </div>
                </div>
              </button>
              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <span title="When all KPIs of this submission are reviewed, it can be submitted to Director.">
                  <button className="btn-primary h-9 text-xs" disabled={!canSubmitDirector} onClick={() => submitGroup(instance)} type="button"><Send className="h-4 w-4" /> Submit to Director</button>
                </span>
                <button className="btn-primary h-9 text-xs" disabled={!canPublish} onClick={() => publishGroup(instance)} type="button"><ShieldCheck className="h-4 w-4" /> Publish</button>
              </div>
            </motion.article>
          )
        })}
        {!visibleInstances.length ? (
          <div className="card p-10 xl:col-span-2">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary"><ClipboardX className="h-6 w-6" /></div>
              <p className="mt-4 text-base font-extrabold text-text">No focal point submissions found</p>
              <p className="mt-2 text-sm leading-6 text-muted">Try a different sector, department, or cycle to review focal point KPI submissions.</p>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(clarifying)}
        onOpenChange={(open) => !open && setClarifying(null)}
        icon={<MessageSquare className="h-5 w-5" />}
        eyebrow="Clarification"
        title="Return KPI for clarification"
        description="This writes a status-history event and returns the KPI to the Focal Point for editing."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setClarifying(null)}>Cancel</button><button className="btn-primary" onClick={confirmClarification}>Send Clarification</button></div>}
      >
        <textarea
          className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          placeholder="Write the clarification note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </div>
  )
}

function DirectorApprovalQueue() {
  const { activeCycleId } = useAppStore()
  const { showSuccessToast } = useToast()
  const location = useLocation()
  const restoredInstanceId = (location.state as { selectedInstanceId?: string } | null)?.selectedInstanceId
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(restoredInstanceId ?? null)
  const [selectedDirectorSubmissionIds, setSelectedDirectorSubmissionIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'ready_to_publish' | 'published'>('all')
  const [directorGridDimensionFilter, setDirectorGridDimensionFilter] = useState('all')
  const [directorGridAiFilter, setDirectorGridAiFilter] = useState('all')
  const [directorGridStatusFilter, setDirectorGridStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [directorAiSummaryOpen, setDirectorAiSummaryOpen] = useState(false)
  const [clarifying, setClarifying] = useState<KpiSubmission | null>(null)
  const [bulkClarifyOpen, setBulkClarifyOpen] = useState(false)
  const [approvingInstance, setApprovingInstance] = useState<FocalPointSubmissionInstance | null>(null)
  const [directorApprovalComment, setDirectorApprovalComment] = useState('')
  const [note, setNote] = useState('')
  const user = mockApi.getCurrentUser()
  const kpis = mockApi.getKpis()
  const users = mockApi.getUsers()
  const department = user.departmentId ? mockApi.getDepartment(user.departmentId) : undefined
  const instances = mockApi.getFocalPointInstances(activeCycleId)
  const departmentInstances = instances
    .map((instance) => {
      const filteredSubmissions = instance.submissions.filter((submission) => {
        const kpi = kpis.find((item) => item.id === submission.kpiId)
        const isDepartmentKpi = kpi?.departmentId === user.departmentId
        return isDepartmentKpi
      })
      return { ...instance, submissions: filteredSubmissions }
    })
    .filter((instance) => instance.submissions.length > 0)
  const directorInstanceMatchesStatus = (instance: FocalPointSubmissionInstance, status: typeof statusFilter) => {
    if (status === 'all') return true
    if (status === 'pending') return instance.submissions.some((submission) => submission.status === 'submitted_to_director')
    if (status === 'reviewed') return instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'reviewed_by_director')
    if (status === 'ready_to_publish') return instance.submissions.length > 0 && instance.submissions.every((submission) => ['approved_by_director', 'director_approved'].includes(submission.status))
    return instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'published')
  }
  const visibleInstances = departmentInstances.filter((instance) => directorInstanceMatchesStatus(instance, statusFilter))
  const counts = useMemo(
    () => ({
      all: departmentInstances.length,
      pending: departmentInstances.filter((instance) => directorInstanceMatchesStatus(instance, 'pending')).length,
      reviewed: departmentInstances.filter((instance) => directorInstanceMatchesStatus(instance, 'reviewed')).length,
      readyToPublish: departmentInstances.filter((instance) => directorInstanceMatchesStatus(instance, 'ready_to_publish')).length,
      published: departmentInstances.filter((instance) => directorInstanceMatchesStatus(instance, 'published')).length,
    }),
    [departmentInstances],
  )
  const selectedInstance = selectedInstanceId ? visibleInstances.find((instance) => instance.id === selectedInstanceId) : undefined

  function approveGroup(instance: FocalPointSubmissionInstance) {
    const comment = directorApprovalComment.trim()
    const note = comment ? `Director approval comment: ${comment}` : 'Focal point submission approved by Department Director.'
    instance.submissions.forEach((submission) => mockApi.approveKpi(submission.id, note))
    showSuccessToast('Approved by Director', 'Reviewed focal point submission moved back to Performance Team for publishing.')
    setApprovingInstance(null)
    setDirectorApprovalComment('')
  }

  function reviewSelectedKpis(ids: string[]) {
    ids.forEach((id) => mockApi.reviewByDirector(id))
    showSuccessToast('KPIs reviewed', `${ids.length} KPI record${ids.length === 1 ? '' : 's'} marked as reviewed.`)
    setSelectedDirectorSubmissionIds([])
  }

  function confirmBulkClarification() {
    if (!note.trim() || !selectedDirectorSubmissionIds.length) return
    selectedDirectorSubmissionIds.forEach((id) => mockApi.raiseClarification(id, note))
    showSuccessToast('Clarification returned', `${selectedDirectorSubmissionIds.length} KPI record${selectedDirectorSubmissionIds.length === 1 ? '' : 's'} returned to the Focal Point.`)
    setBulkClarifyOpen(false)
    setSelectedDirectorSubmissionIds([])
    setNote('')
  }

  function confirmClarification() {
    if (!clarifying || !note.trim()) return
    mockApi.raiseClarification(clarifying.id, note)
    showSuccessToast('Clarification returned', 'The KPI is back with the Focal Point for updates.')
    setClarifying(null)
    setNote('')
  }

  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:bg-primary-tint hover:text-primary',
    )

  function directorInstanceStats(instance: FocalPointSubmissionInstance) {
    const reviewed = instance.submissions.filter((submission) => submission.status === 'reviewed_by_director').length
    const pending = instance.submissions.filter((submission) => submission.status === 'submitted_to_director').length
    const avgAiScore = Math.round(instance.submissions.reduce((sum, submission) => sum + queueAiScore(submission), 0) / Math.max(1, instance.submissions.length))
    return { reviewed, pending, avgAiScore }
  }

  if (selectedInstance) {
    const focalPoint = users.find((item) => item.id === selectedInstance.focalPointId)
    const fullInstance = departmentInstances.find((item) => item.id === selectedInstance.id) ?? selectedInstance
    const reviewed = fullInstance.submissions.filter((submission) => submission.status === 'reviewed_by_director').length
    const progress = Math.round((reviewed / Math.max(1, fullInstance.submissions.length)) * 100)
    const canApprove = fullInstance.submissions.length > 0 && fullInstance.submissions.every((submission) => submission.status === 'reviewed_by_director')
    const directorWeakEvidence = selectedInstance.submissions.filter((submission) => submission.attachments.length === 0).length
    const directorEvidenceMismatch = selectedInstance.submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0).length
    const directorAnswer = (submission: KpiSubmission, label: string) => {
      const kpi = kpis.find((item) => item.id === submission.kpiId)
      const question = kpi?.questions.find((item) => item.label.toLowerCase().includes(label))
      return submission.answers.find((answer) => answer.questionId === question?.id)?.answer.trim() ?? ''
    }
    const hasWeakDirectorText = (value: string) => value.length > 0 && value.length < 35
    const directorAiRows = [
      {
        label: 'KPIs with insufficient evidence',
        description: 'Evidence is missing or not enough for director review.',
        submissions: selectedInstance.submissions.filter((submission) => submission.attachments.length === 0),
      },
      {
        label: 'KPIs where evidence may not match entered actual value',
        description: 'Actual value looks strong, but supporting evidence is missing or weak.',
        submissions: selectedInstance.submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0),
      },
      {
        label: 'KPIs where analysis is weak, missing, or unclear',
        description: 'Analysis needs clearer interpretation before approval.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakDirectorText(directorAnswer(submission, 'analysis')) || !directorAnswer(submission, 'analysis')),
      },
      {
        label: 'KPIs where challenges are missing or not specific',
        description: 'Challenge narrative should explain blockers and ownership.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakDirectorText(directorAnswer(submission, 'challenge')) || !directorAnswer(submission, 'challenge')),
      },
      {
        label: 'KPIs where recommendations are missing or generic',
        description: 'Recommendations should include specific corrective action.',
        submissions: selectedInstance.submissions.filter((submission) => hasWeakDirectorText(directorAnswer(submission, 'recommendation')) || !directorAnswer(submission, 'recommendation')),
      },
      {
        label: 'KPIs that may need better wording before validation',
        description: 'AI quality score indicates the wording can be improved.',
        submissions: selectedInstance.submissions.filter((submission) => queueAiScore(submission) < 70),
      },
    ]
    const selectedSubmissions = selectedInstance.submissions.filter((submission) => selectedDirectorSubmissionIds.includes(submission.id))
    const selectedStatuses = new Set(selectedSubmissions.map((submission) => submission.status))
    const hasSingleActionState = selectedStatuses.size === 1 && selectedStatuses.has('submitted_to_director')
    const directorGridDimensions = Array.from(new Set(selectedInstance.submissions.map((submission) => kpis.find((item) => item.id === submission.kpiId)?.category).filter(Boolean)))
    const directorGridDimensionOptions = [{ value: 'all', label: 'All Dimensions' }, ...directorGridDimensions.map((dimension) => ({ value: dimension!, label: dimension! }))]
    const directorGridAiOptions = [
      { value: 'all', label: 'All AI Checks' },
      { value: 'insufficient_evidence', label: 'Insufficient Evidence' },
      { value: 'evidence_mismatch', label: 'Evidence Mismatch' },
      { value: 'low_quality', label: 'Low AI Score' },
    ]
    const filteredDirectorGridSubmissions = selectedInstance.submissions.filter((submission) => {
      const kpi = kpis.find((item) => item.id === submission.kpiId)
      const matchesDimension = directorGridDimensionFilter === 'all' || kpi?.category === directorGridDimensionFilter
      const matchesStatus =
        directorGridStatusFilter === 'all' ||
        (directorGridStatusFilter === 'pending' && submission.status === 'submitted_to_director') ||
        (directorGridStatusFilter === 'reviewed' && ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))
      const matchesAi =
        directorGridAiFilter === 'all' ||
        (directorGridAiFilter === 'insufficient_evidence' && submission.attachments.length === 0) ||
        (directorGridAiFilter === 'evidence_mismatch' && submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0) ||
        (directorGridAiFilter === 'low_quality' && queueAiScore(submission) < 70)
      return matchesDimension && matchesStatus && matchesAi
    })
    const directorGridStatusTabs = [
      { id: 'all' as const, label: 'All', count: selectedInstance.submissions.length },
      { id: 'pending' as const, label: 'Pending Review', count: selectedInstance.submissions.filter((submission) => submission.status === 'submitted_to_director').length },
      { id: 'reviewed' as const, label: 'Reviewed', count: selectedInstance.submissions.filter((submission) => ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length },
    ]
    const allSelected = filteredDirectorGridSubmissions.length > 0 && filteredDirectorGridSubmissions.every((submission) => selectedDirectorSubmissionIds.includes(submission.id))
    const toggleSelection = (id: string) => {
      setSelectedDirectorSubmissionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    }

    return (
      <div className="space-y-5">
        <motion.section className="raised-card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <button className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold text-muted transition hover:text-primary" onClick={() => { setSelectedInstanceId(null); setSelectedDirectorSubmissionIds([]) }} type="button">
            <ArrowLeft className="h-4 w-4" /> Back to Approval Queue
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl">{focalPoint?.name ?? 'Focal Point'} Approval</h2>
              <p className="mt-2 text-sm text-muted">{department?.name ?? 'Department'} KPI submissions ready for director review.</p>
              <div className="mt-4 max-w-xl">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>Review Progress</span><span>{reviewed}/{fullInstance.submissions.length}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-primary-tint"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
            <span title="Please review all KPIs of the focal point before approving.">
              <button className="btn-primary h-10 text-xs" disabled={!canApprove} onClick={() => setApprovingInstance(fullInstance)} type="button"><ShieldCheck className="h-4 w-4" /> Approve</button>
            </span>
          </div>
          <div className="mt-5 w-full rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-soft)] text-[var(--ai-strong)]">
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold"
              onClick={() => setDirectorAiSummaryOpen((open) => !open)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI summary: {directorWeakEvidence} KPIs have weak evidence and {directorEvidenceMismatch} KPIs do not match with evidence uploaded.
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', directorAiSummaryOpen ? 'rotate-180' : '')} />
            </button>
            {directorAiSummaryOpen ? (
              <motion.div
                className="border-t border-[var(--ai-border)] p-3"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {directorAiRows.map((row, index) => (
                    <motion.div
                      className="rounded-2xl border border-[var(--ai-border)] bg-white/75 p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--ai)] dark:bg-white/5"
                      key={row.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-extrabold leading-5 text-text">{row.label}</p>
                        <span className="rounded-full px-2.5 py-1 font-mono text-sm font-extrabold" style={{ backgroundColor: 'color-mix(in srgb, var(--ai) 12%, transparent)', color: 'var(--ai-strong)' }}>
                          {row.submissions.length}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{row.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {row.submissions.slice(0, 8).map((submission) => (
                          <Link
                            className="rounded-full border border-[var(--ai-border)] bg-white px-2 py-1 font-mono text-[11px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                            key={submission.id}
                            state={{ returnTo: '/approval/queue', selectedInstanceId: selectedInstance.id, returnLabel: 'Back to Approval Queue' }}
                            to={`/kpis/${submission.kpiId}`}
                          >
                            {displayKpiId(submission.kpiId)}
                          </Link>
                        ))}
                        {!row.submissions.length ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted dark:bg-white/5">No KPI IDs flagged</span>
                        ) : null}
                        {row.submissions.length > 8 ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-muted dark:bg-white/5">+{row.submissions.length - 8}</span>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </div>
        </motion.section>

        <section className="card p-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {directorGridStatusTabs.map((tab) => (
                <button className={tabClass(directorGridStatusFilter === tab.id)} key={tab.id} onClick={() => setDirectorGridStatusFilter(tab.id)} type="button">
                  {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', directorGridStatusFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:w-[480px]">
              <AppSelect value={directorGridDimensionFilter} onValueChange={setDirectorGridDimensionFilter} options={directorGridDimensionOptions} placeholder="Dimension" />
              <AppSelect className="border-[var(--ai-border)] bg-[var(--ai-soft)] text-[var(--ai-strong)]" value={directorGridAiFilter} onValueChange={setDirectorGridAiFilter} options={directorGridAiOptions} placeholder="AI Filter" />
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-extrabold text-text">{selectedSubmissions.length} selected</p>
              <p className="mt-1 text-xs font-semibold text-muted">Select KPIs with the same status to enable bulk director actions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary h-9 text-xs" disabled={!hasSingleActionState || !selectedSubmissions.length} onClick={() => reviewSelectedKpis(selectedDirectorSubmissionIds)} type="button">
                <Check className="h-4 w-4" /> Mark as Reviewed
              </button>
              <button className="btn-secondary h-9 text-xs" disabled={!hasSingleActionState || !selectedSubmissions.length} onClick={() => setBulkClarifyOpen(true)} type="button">
                <MessageSquare className="h-4 w-4" /> Clarify
              </button>
            </div>
          </div>
        </section>

        <motion.article className="card overflow-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    aria-label="Select all KPIs"
                    checked={allSelected}
                    className="h-4 w-4 rounded border-border accent-primary"
                    onChange={(event) => setSelectedDirectorSubmissionIds(event.target.checked ? filteredDirectorGridSubmissions.map((submission) => submission.id) : [])}
                    type="checkbox"
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th>KPI Name</th>
                <th>AI Review Score</th>
                <th>Actual Score</th>
                <th>Target</th>
                <th>Assigned To</th>
                <th>Dimension</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDirectorGridSubmissions.map((submission) => {
                const kpi = kpis.find((item) => item.id === submission.kpiId)
                const score = queueAiScore(submission)
                const directorOwner = users.find((user) => user.id === department?.directorId)
                return (
                  <tr className="border-t border-border hover:bg-primary-tint/40" key={submission.id}>
                    <td className="px-4 py-3">
                      <input
                        aria-label={`Select ${kpi?.name ?? submission.kpiId}`}
                        checked={selectedDirectorSubmissionIds.includes(submission.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                        onChange={() => toggleSelection(submission.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(submission.kpiId)}</span></td>
                    <td><Link className="font-bold transition hover:text-primary" state={{ returnTo: '/approval/queue', selectedInstanceId: selectedInstance.id, returnLabel: 'Back to Approval Queue' }} to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link></td>
                    <td><span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}><Sparkles className="h-4 w-4" />{score}</span></td>
                    <td><span className="font-mono text-sm font-extrabold text-text">{submission.actualScore ?? '-'}</span></td>
                    <td><span className="font-mono text-sm font-extrabold text-text">{submission.targetScore}</span></td>
                    <td>
                      <div className="flex min-w-[190px] items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="min-w-0 truncate text-sm font-semibold">{directorOwner?.name ?? 'Department Director'}</p>
                      </div>
                    </td>
                    <td>{kpi?.category ?? '-'}</td>
                    <td><StatusPill value={submission.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.article>

        <Modal
          open={bulkClarifyOpen}
          onOpenChange={(open) => !open && setBulkClarifyOpen(false)}
          icon={<MessageSquare className="h-5 w-5" />}
          eyebrow="Clarification"
          title="Return selected KPIs for clarification"
          description="All selected KPIs will move back to the Focal Point with this clarification note."
          footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setBulkClarifyOpen(false)}>Cancel</button><button className="btn-primary" disabled={!note.trim()} onClick={confirmBulkClarification}>Send Clarification</button></div>}
        >
          <textarea
            className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Write the clarification note..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Modal>

        <Modal
          open={Boolean(approvingInstance)}
          onOpenChange={(open) => !open && setApprovingInstance(null)}
          icon={<ShieldCheck className="h-5 w-5" />}
          eyebrow="Director Approval"
          title="Approve focal point submission"
          description="Add the Director comment for this focal point submission before approval."
          footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setApprovingInstance(null)}>Cancel</button><button className="btn-primary" disabled={!directorApprovalComment.trim()} onClick={() => approvingInstance && approveGroup(approvingInstance)}>Approve Submission</button></div>}
        >
          <textarea
            className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Enter Director's comment..."
            value={directorApprovalComment}
            onChange={(event) => setDirectorApprovalComment(event.target.value)}
          />
        </Modal>

        <Modal
          open={Boolean(clarifying)}
          onOpenChange={(open) => !open && setClarifying(null)}
          icon={<MessageSquare className="h-5 w-5" />}
          eyebrow="Clarification"
          title="Return KPI for clarification"
          description="This writes a status-history event and returns the KPI to the Focal Point for editing."
          footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setClarifying(null)}>Cancel</button><button className="btn-primary" onClick={confirmClarification}>Send Clarification</button></div>}
        >
          <textarea
            className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="Write the clarification note..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl">Approval Queue</h2>
            <p className="mt-2 text-sm text-muted">
              {department?.name ?? 'Department'} KPI submissions grouped by focal point.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="status-pill border-primary/15 bg-primary-tint text-primary">All: {counts.all}</span>
            <span className="status-pill border-warning/20 bg-warning/10 text-warning">Pending Review: {counts.pending}</span>
            <span className="status-pill border-info/20 bg-info/10 text-info">Reviewed: {counts.reviewed}</span>
            <span className="status-pill border-success/20 bg-success/10 text-success">Ready to Publish: {counts.readyToPublish}</span>
            <span className="status-pill border-success/20 bg-success/10 text-success">Published: {counts.published}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          { id: 'all' as const, label: 'All', count: counts.all },
          { id: 'pending' as const, label: 'Pending Review', count: counts.pending },
          { id: 'reviewed' as const, label: 'Reviewed', count: counts.reviewed },
          { id: 'ready_to_publish' as const, label: 'Ready to Publish', count: counts.readyToPublish },
          { id: 'published' as const, label: 'Published', count: counts.published },
        ].map((tab) => (
          <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
            {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleInstances.map((instance, index) => {
          const focalPoint = users.find((user) => user.id === instance.focalPointId)
          const fullInstance = departmentInstances.find((item) => item.id === instance.id) ?? instance
          const stats = directorInstanceStats(fullInstance)
          const reviewed = stats.reviewed
          const progress = Math.round((reviewed / Math.max(1, fullInstance.submissions.length)) * 100)
          const canApprove = fullInstance.submissions.length > 0 && fullInstance.submissions.every((submission) => submission.status === 'reviewed_by_director')
          return (
            <motion.article className="group rounded-[24px] border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card" key={instance.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <button className="block w-full text-left" onClick={() => setSelectedInstanceId(instance.id)} type="button">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <h3 className="truncate text-xl font-extrabold transition group-hover:text-primary">{focalPoint?.name ?? 'Focal Point'}</h3>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-muted transition group-hover:border-primary group-hover:text-primary" aria-label="Open approval detail">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">{department?.name ?? 'Department'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="status-pill border-primary/15 bg-primary-tint text-primary">{canApprove ? 'Ready for Approval' : 'Director Review'}</span>
                      <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold text-muted">{fullInstance.submissions.length} KPIs</span>
                    </div>
                    <div className="mt-3 rounded-2xl border border-[var(--ai-border)] bg-[var(--ai-soft)] px-3 py-2 text-sm font-semibold text-[var(--ai-strong)]">
                      <Sparkles className="mr-2 inline h-4 w-4" />
                      AI summary: {stats.pending} pending director review, {stats.reviewed} reviewed, avg AI score {stats.avgAiScore}.
                    </div>
                    <div className="mt-4 max-w-[520px]">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>Review Progress</span><span>{reviewed}/{fullInstance.submissions.length}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary-tint"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                </div>
              </button>
              <div className="mt-5 flex justify-end border-t border-border pt-4">
                <span title="Please review all KPIs of the focal point before approving.">
                  <button className="btn-primary h-9 text-xs" disabled={!canApprove} onClick={() => setApprovingInstance(fullInstance)} type="button"><ShieldCheck className="h-4 w-4" /> Approve</button>
                </span>
              </div>
            </motion.article>
          )
        })}
        {!visibleInstances.length ? (
          <div className="card p-10">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary"><ClipboardX className="h-6 w-6" /></div>
              <p className="mt-4 text-base font-extrabold text-text">No director submissions found</p>
              <p className="mt-2 text-sm leading-6 text-muted">No focal point submissions are pending director review for this department and cycle.</p>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(clarifying)}
        onOpenChange={(open) => !open && setClarifying(null)}
        icon={<MessageSquare className="h-5 w-5" />}
        eyebrow="Clarification"
        title="Return KPI for clarification"
        description="This writes a status-history event and returns the KPI to the Focal Point for editing."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setClarifying(null)}>Cancel</button><button className="btn-primary" onClick={confirmClarification}>Send Clarification</button></div>}
      >
        <textarea
          className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          placeholder="Write the clarification note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>

      <Modal
        open={Boolean(approvingInstance)}
        onOpenChange={(open) => !open && setApprovingInstance(null)}
        icon={<ShieldCheck className="h-5 w-5" />}
        eyebrow="Director Approval"
        title="Approve focal point submission"
        description="Add the Director comment for this focal point submission before approval."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setApprovingInstance(null)}>Cancel</button><button className="btn-primary" disabled={!directorApprovalComment.trim()} onClick={() => approvingInstance && approveGroup(approvingInstance)}>Approve Submission</button></div>}
      >
        <textarea
          className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          placeholder="Enter Director's comment..."
          value={directorApprovalComment}
          onChange={(event) => setDirectorApprovalComment(event.target.value)}
        />
      </Modal>
    </div>
  )
}

export function ApprovalQueuePage({ mode }: ApprovalQueuePageProps) {
  if (mode === 'performance') return <PerformanceValidationQueue />
  return <DirectorApprovalQueue />
}
