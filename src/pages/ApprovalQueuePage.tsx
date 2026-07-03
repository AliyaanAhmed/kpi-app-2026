import { Check, ChevronDown, ClipboardX, MessageSquare, Send, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
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

function targetSignal(submission: KpiSubmission) {
  if (submission.actualScore === undefined) return { tone: 'text-muted', bg: 'bg-surface' }
  if (submission.actualScore >= submission.targetScore) return { label: 'Target met', tone: 'text-success', bg: 'bg-success/10' }
  if (submission.actualScore >= submission.targetScore * 0.75) return { label: 'Near target', tone: 'text-warning', bg: 'bg-warning/10' }
  return { label: 'Below target', tone: 'text-danger', bg: 'bg-danger/10' }
}

function instanceStatusLabel(status: FocalPointSubmissionInstance['status']) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function displayKpiId(id: string) {
  return id.replace(/^kpi-/i, '').toUpperCase()
}

function PerformanceValidationQueue() {
  const { activeCycleId } = useAppStore()
  const { showSuccessToast } = useToast()
  const [sectorFilter, setSectorFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [clarifying, setClarifying] = useState<KpiSubmission | null>(null)
  const [performanceComments, setPerformanceComments] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const users = mockApi.getUsers()
  const kpis = mockApi.getKpis()
  const instances = mockApi.getFocalPointInstances(activeCycleId)
  const visibleInstances = instances
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
  const sectorTabs = [
    { id: 'all', label: 'All Sectors', count: instances.reduce((sum, instance) => sum + instance.submissions.length, 0) },
    ...sectors.map((sector) => ({
      id: sector.id,
      label: sector.name,
      count: instances.reduce((sum, instance) => sum + instance.submissions.filter((submission) => {
        const kpi = kpis.find((item) => item.id === submission.kpiId)
        return departments.find((department) => department.id === kpi?.departmentId)?.sectorId === sector.id
      }).length, 0),
    })),
  ]
  const departmentTabs = [
    { id: 'all', label: 'All Departments', count: visibleInstances.reduce((sum, instance) => sum + instance.submissions.length, 0) },
    ...departments
      .filter((department) => sectorFilter === 'all' || department.sectorId === sectorFilter)
      .map((department) => ({
        id: department.id,
        label: department.name,
        count: instances.reduce((sum, instance) => sum + instance.submissions.filter((submission) => mockApi.getKpi(submission.kpiId)?.departmentId === department.id).length, 0),
      }))
      .filter((tab) => tab.count > 0),
  ]
  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:bg-primary-tint hover:text-primary',
    )

  function reviewKpi(submission: KpiSubmission) {
    const comment = performanceComments[submission.id]?.trim() || submission.performanceTeamComment?.trim()
    if (!comment) return
    mockApi.reviewByPerformanceTeam(submission.id, comment)
    showSuccessToast('KPI reviewed', 'Performance Team comment has been added to this KPI.')
  }

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

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl">Validation Queue</h2>
            <p className="mt-2 text-sm text-muted">Focal point submissions are grouped as workflow instances, with KPI-level review inside each department group.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Focal Point Instances</p></div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.reduce((sum, item) => sum + item.submissions.length, 0)}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">KPIs</p></div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-center"><p className="font-display text-2xl font-extrabold">{visibleInstances.filter((item) => item.status === 'reviewed_by_performance_team').length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Ready</p></div>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="grid gap-4 xl:grid-cols-[110px_minmax(0,1fr)] xl:items-start">
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
                {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', sectorFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 border-t border-border pt-4 xl:grid-cols-[110px_minmax(0,1fr)] xl:items-start">
          <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Departments</span>
          <div className="flex flex-wrap gap-2">
            {departmentTabs.map((tab) => (
              <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {visibleInstances.map((instance, index) => {
          const focalPoint = users.find((user) => user.id === instance.focalPointId)
          const departmentNames = Array.from(new Set(instance.submissions.map((submission) => mockApi.getDepartment(mockApi.getKpi(submission.kpiId)?.departmentId ?? '')?.name).filter(Boolean)))
          const reviewed = instance.submissions.filter((submission) => ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
          const progress = Math.round((reviewed / Math.max(1, instance.submissions.length)) * 100)
          const canSubmitDirector = instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'reviewed_by_performance_team')
          const canPublish = instance.submissions.length > 0 && instance.submissions.every((submission) => ['approved_by_director', 'director_approved'].includes(submission.status))
          const isOpen = openId === instance.id
          return (
            <motion.article className="overflow-hidden rounded-[24px] border border-border bg-surface transition hover:border-primary/25 hover:shadow-card" key={instance.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <button className="flex min-w-0 items-start gap-3 text-left" onClick={() => setOpenId(isOpen ? null : instance.id)} type="button">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-extrabold">{focalPoint?.name ?? 'Focal Point'}</h3>
                    <p className="mt-1 truncate text-sm text-muted">{departmentNames.join(', ') || 'No departments'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="status-pill border-primary/15 bg-primary-tint text-primary">{instanceStatusLabel(instance.status)}</span>
                      <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold text-muted">{instance.submissions.length} KPIs</span>
                    </div>
                    <div className="mt-4 max-w-[520px]">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>Review Progress</span><span>{reviewed}/{instance.submissions.length}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary-tint"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button className="btn-primary h-9 text-xs" disabled={!canSubmitDirector} onClick={() => submitGroup(instance)} type="button"><Send className="h-4 w-4" /> Submit to Director</button>
                  <button className="btn-secondary h-9 text-xs" disabled={!canPublish} onClick={() => publishGroup(instance)} type="button"><ShieldCheck className="h-4 w-4" /> Publish</button>
                  <button className="btn-secondary h-9 w-9 rounded-full p-0" onClick={() => setOpenId(isOpen ? null : instance.id)} type="button" aria-label={isOpen ? 'Collapse focal point submission' : 'Expand focal point submission'}>
                    <ChevronDown className={cn('h-4 w-4 text-muted transition', isOpen && 'rotate-180')} />
                  </button>
                </div>
              </div>
              {isOpen ? (
                <div className="border-t border-border bg-surface-raised/45 p-4">
                  <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
                    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h4 className="font-extrabold">KPI review details</h4>
                        <p className="mt-1 text-xs text-muted">One focal point can own KPIs from multiple departments; each KPI keeps one assigned focal point.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {departmentNames.map((name) => (
                          <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold text-muted" key={name}>{name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full min-w-[1220px] text-left text-sm">
                        <thead className="bg-surface-raised text-xs uppercase text-muted">
                          <tr><th className="px-4 py-3">ID</th><th>KPI Name</th><th>AI Review Score</th><th>Actual / Target</th><th>AI Analysis</th><th>Performance Team Comment</th><th>Department</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                          {instance.submissions.map((submission) => {
                            const kpi = mockApi.getKpi(submission.kpiId)
                            const department = departments.find((item) => item.id === kpi?.departmentId)
                            const score = queueAiScore(submission)
                            const signal = targetSignal(submission)
                            return (
                              <tr className="border-t border-border hover:bg-primary-tint/40" key={submission.id}>
                                <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(submission.kpiId)}</span></td>
                                <td><Link className="font-bold transition hover:text-primary" to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link></td>
                                <td><span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}><Sparkles className="h-4 w-4" />{score}</span></td>
                                <td><span className={cn('rounded-full px-2.5 py-1 text-sm font-bold', signal.bg, signal.tone)}>{submission.actualScore ?? '-'} / {submission.targetScore}{signal.label ? ` - ${signal.label}` : ''}</span></td>
                                <td><p className="max-w-[280px] text-sm leading-6 text-muted">{score < 70 ? 'Review evidence and narrative before sending onward.' : 'Evidence and narrative look ready for validation.'}</p></td>
                                <td>
                                  {['submitted_to_performance_team', 'with_performance_team'].includes(submission.status) ? (
                                    <input
                                      className="h-9 w-[260px] rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                      placeholder="Add Performance Team comment"
                                      value={performanceComments[submission.id] ?? submission.performanceTeamComment ?? ''}
                                      onChange={(event) => setPerformanceComments((current) => ({ ...current, [submission.id]: event.target.value }))}
                                    />
                                  ) : (
                                    <p className="max-w-[260px] text-sm leading-6 text-muted">{submission.performanceTeamComment || 'No Performance Team comment.'}</p>
                                  )}
                                </td>
                                <td>{department?.name ?? 'Unassigned Department'}</td>
                                <td><StatusPill value={submission.status} /></td>
                                <td>
                                  <div className="flex gap-2">
                                    {['submitted_to_performance_team', 'with_performance_team'].includes(submission.status) ? <button className="btn-secondary h-8 text-xs" disabled={!((performanceComments[submission.id] ?? submission.performanceTeamComment ?? '').trim())} title="Enter Performance Team comment before review." onClick={() => reviewKpi(submission)} type="button"><Check className="h-3.5 w-3.5" /> Review</button> : null}
                                    {['submitted_to_performance_team', 'with_performance_team'].includes(submission.status) ? <button className="btn-secondary h-8 text-xs" onClick={() => setClarifying(submission)} type="button"><MessageSquare className="h-3.5 w-3.5" /> Clarify</button> : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.article>
          )
        })}
        {!visibleInstances.length ? (
          <div className="card p-10">
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [clarifying, setClarifying] = useState<KpiSubmission | null>(null)
  const [directorComments, setDirectorComments] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const user = mockApi.getCurrentUser()
  const kpis = mockApi.getKpis()
  const users = mockApi.getUsers()
  const department = user.departmentId ? mockApi.getDepartment(user.departmentId) : undefined
  const instances = mockApi.getFocalPointInstances(activeCycleId)
  const visibleInstances = instances
    .map((instance) => {
      const filteredSubmissions = instance.submissions.filter((submission) => {
        const kpi = kpis.find((item) => item.id === submission.kpiId)
        const isDepartmentKpi = kpi?.departmentId === user.departmentId
        const isDirectorQueueStatus = ['submitted_to_director', 'reviewed_by_director'].includes(submission.status)
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && submission.status === 'submitted_to_director') ||
          (statusFilter === 'reviewed' && submission.status === 'reviewed_by_director')
        return isDepartmentKpi && isDirectorQueueStatus && matchesStatus
      })
      return { ...instance, submissions: filteredSubmissions }
    })
    .filter((instance) => instance.submissions.length > 0)
  const allDirectorSubmissions = instances.flatMap((instance) =>
    instance.submissions.filter((submission) => {
      const kpi = kpis.find((item) => item.id === submission.kpiId)
      return kpi?.departmentId === user.departmentId && ['submitted_to_director', 'reviewed_by_director'].includes(submission.status)
    }),
  )
  const counts = useMemo(
    () => ({
      all: allDirectorSubmissions.length,
      pending: allDirectorSubmissions.filter((item) => item.status === 'submitted_to_director').length,
      reviewed: allDirectorSubmissions.filter((item) => item.status === 'reviewed_by_director').length,
    }),
    [allDirectorSubmissions],
  )

  function reviewKpi(submission: KpiSubmission) {
    const comment = directorComments[submission.id]?.trim() || submission.directorComment?.trim()
    if (!comment) return
    mockApi.reviewByDirector(submission.id, comment)
    showSuccessToast('KPI reviewed', 'Director comment has been added to this KPI.')
  }

  function approveGroup(instance: FocalPointSubmissionInstance) {
    instance.submissions.forEach((submission) => mockApi.approveKpi(submission.id, 'Focal point submission approved by Department Director.'))
    showSuccessToast('Approved by Director', 'Reviewed focal point submission moved back to Performance Team for publishing.')
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
            <span className="status-pill border-success/20 bg-success/10 text-success">Reviewed: {counts.reviewed}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          { id: 'all' as const, label: 'All', count: counts.all },
          { id: 'pending' as const, label: 'Pending Review', count: counts.pending },
          { id: 'reviewed' as const, label: 'Reviewed', count: counts.reviewed },
        ].map((tab) => (
          <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
            {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface-raised text-muted')}>{tab.count}</span>
          </button>
        ))}
      </section>

      <section className="space-y-4">
        {visibleInstances.map((instance, index) => {
          const focalPoint = users.find((user) => user.id === instance.focalPointId)
          const reviewed = instance.submissions.filter((submission) => submission.status === 'reviewed_by_director').length
          const progress = Math.round((reviewed / Math.max(1, instance.submissions.length)) * 100)
          const canApprove = instance.submissions.length > 0 && instance.submissions.every((submission) => submission.status === 'reviewed_by_director')
          const isOpen = openId === instance.id
          return (
            <motion.article className="overflow-hidden rounded-[24px] border border-border bg-surface transition hover:border-primary/25 hover:shadow-card" key={instance.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <button className="flex min-w-0 items-start gap-3 text-left" onClick={() => setOpenId(isOpen ? null : instance.id)} type="button">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-extrabold">{focalPoint?.name ?? 'Focal Point'}</h3>
                    <p className="mt-1 truncate text-sm text-muted">{department?.name ?? 'Department'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="status-pill border-primary/15 bg-primary-tint text-primary">{canApprove ? 'Ready for Approval' : 'Director Review'}</span>
                      <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold text-muted">{instance.submissions.length} KPIs</span>
                    </div>
                    <div className="mt-4 max-w-[520px]">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>Review Progress</span><span>{reviewed}/{instance.submissions.length}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary-tint"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button className="btn-primary h-9 text-xs" disabled={!canApprove} onClick={() => approveGroup(instance)} type="button"><ShieldCheck className="h-4 w-4" /> Approve</button>
                  <button className="btn-secondary h-9 w-9 rounded-full p-0" onClick={() => setOpenId(isOpen ? null : instance.id)} type="button" aria-label={isOpen ? 'Collapse focal point submission' : 'Expand focal point submission'}>
                    <ChevronDown className={cn('h-4 w-4 text-muted transition', isOpen && 'rotate-180')} />
                  </button>
                </div>
              </div>
              {isOpen ? (
                <div className="border-t border-border bg-surface-raised/45 p-4">
                  <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
                    <div className="overflow-auto">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="bg-surface-raised text-xs uppercase text-muted">
                          <tr><th className="px-4 py-3">ID</th><th>KPI Name</th><th>AI Review Score</th><th>Director Comment</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                          {instance.submissions.map((submission) => {
                            const kpi = kpis.find((item) => item.id === submission.kpiId)
                            const score = queueAiScore(submission)
                            return (
                              <tr className="border-t border-border hover:bg-primary-tint/40" key={submission.id}>
                                <td className="px-4 py-3"><span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{displayKpiId(submission.kpiId)}</span></td>
                                <td><Link className="font-bold transition hover:text-primary" to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link></td>
                                <td><span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-base font-extrabold', score >= 80 ? 'bg-success/10 text-success' : score >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}><Sparkles className="h-4 w-4" />{score}</span></td>
                                <td>
                                  {submission.status === 'submitted_to_director' ? (
                                    <input
                                      className="h-9 w-[280px] rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                      placeholder="Add Director comment"
                                      value={directorComments[submission.id] ?? submission.directorComment ?? ''}
                                      onChange={(event) => setDirectorComments((current) => ({ ...current, [submission.id]: event.target.value }))}
                                    />
                                  ) : (
                                    <p className="max-w-[280px] text-sm leading-6 text-muted">{submission.directorComment || 'No Director comment.'}</p>
                                  )}
                                </td>
                                <td><StatusPill value={submission.status} /></td>
                                <td>
                                  <div className="flex gap-2">
                                    {submission.status === 'submitted_to_director' ? <button className="btn-secondary h-8 text-xs" disabled={!((directorComments[submission.id] ?? submission.directorComment ?? '').trim())} title="Enter Director comment before review." onClick={() => reviewKpi(submission)} type="button"><Check className="h-3.5 w-3.5" /> Review</button> : null}
                                    {submission.status === 'submitted_to_director' ? <button className="btn-secondary h-8 text-xs" onClick={() => setClarifying(submission)} type="button"><MessageSquare className="h-3.5 w-3.5" /> Clarify</button> : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
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
    </div>
  )
}

export function ApprovalQueuePage({ mode }: ApprovalQueuePageProps) {
  if (mode === 'performance') return <PerformanceValidationQueue />
  return <DirectorApprovalQueue />
}
