import { Check, MessageSquare, Send, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../context/ToastContext'
import type { KpiSubmission } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

interface ApprovalQueuePageProps {
  mode: 'performance' | 'director'
}

export function ApprovalQueuePage({ mode }: ApprovalQueuePageProps) {
  const { activeCycleId } = useAppStore()
  const { showSuccessToast } = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clarifying, setClarifying] = useState<KpiSubmission | null>(null)
  const [note, setNote] = useState('')
  const user = mockApi.getCurrentUser()
  const kpis = mockApi.getKpis()
  const departments = mockApi.getDepartments()
  const users = mockApi.getUsers()
  const allowedStatuses = mode === 'performance' ? ['with_performance_team', 'director_approved'] : ['submitted_to_director']
  const visibleSubmissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const rows = visibleSubmissions
    .filter((submission) => allowedStatuses.includes(submission.status))
    .filter((submission) => {
      if (mode !== 'director') return true
      const kpi = kpis.find((item) => item.id === submission.kpiId)
      return kpi?.departmentId === user.departmentId
    })
  const counts = useMemo(
    () => ({
      all: rows.length,
      review: rows.filter((item) => item.status === 'with_performance_team' || item.status === 'submitted_to_director').length,
      approved: rows.filter((item) => item.status === 'director_approved').length,
    }),
    [rows],
  )

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function submitSelected() {
    selectedIds.forEach((id) => {
      if (mode === 'performance') mockApi.submitToDirector(id)
      else mockApi.approveKpi(id)
    })
    showSuccessToast(mode === 'performance' ? 'Selected KPIs submitted' : 'Selected KPIs approved')
    setSelectedIds([])
  }

  function publishSelected() {
    mockApi.publishKpis(selectedIds)
    showSuccessToast('Selected KPIs published')
    setSelectedIds([])
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
            <p className="eyebrow">{mode === 'performance' ? 'Performance Team' : 'Department Director'}</p>
            <h2 className="mt-1 text-3xl">{mode === 'performance' ? 'Validation Queue' : 'Approval Queue'}</h2>
            <p className="mt-2 text-sm text-muted">
              Review submissions, return clarification, and move KPIs through the governed approval path.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([label, count]) => (
              <span className="status-pill border-primary/15 bg-primary-tint text-primary" key={label}>{label}: {count}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div>
            <p className="font-semibold">Bulk Selection</p>
            <p className="text-xs text-muted">{selectedIds.length} selected / {rows.length} visible</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className="btn-secondary h-9 text-xs" disabled={!selectedIds.length} onClick={() => setClarifying(rows.find((row) => selectedIds.includes(row.id)) ?? null)}>
              <MessageSquare className="h-4 w-4" /> Raise Clarification
            </button>
            {mode === 'performance' ? (
              <>
                <button className="btn-primary h-9 text-xs" disabled={!selectedIds.length} onClick={submitSelected}><Send className="h-4 w-4" /> Submit to Director</button>
                <button className="btn-secondary h-9 text-xs" disabled={!selectedIds.length} onClick={publishSelected}><ShieldCheck className="h-4 w-4" /> Publish Approved</button>
              </>
            ) : (
              <button className="btn-primary h-9 text-xs" disabled={!selectedIds.length} onClick={submitSelected}><Check className="h-4 w-4" /> Approve Selected</button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {rows.map((submission) => {
          const kpi = kpis.find((item) => item.id === submission.kpiId)
          const department = departments.find((item) => item.id === kpi?.departmentId)
          const focalPoint = users.find((item) => item.id === submission.focalPointId)
          return (
            <article className="card p-5 transition hover:-translate-y-0.5 hover:shadow-premium" key={submission.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <button
                    className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full border ${selectedIds.includes(submission.id) ? 'border-primary bg-primary text-white' : 'border-border bg-surface'}`}
                    onClick={() => toggle(submission.id)}
                    type="button"
                    aria-label="Select submission"
                  >
                    {selectedIds.includes(submission.id) ? <Check className="h-4 w-4" /> : null}
                  </button>
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2"><span className="font-mono text-xs text-muted">{submission.id}</span><StatusPill value={submission.status} /></div>
                    <Link className="text-lg font-bold text-text transition hover:text-primary" to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link>
                    <p className="mt-1 text-sm text-muted">{department?.name} / {focalPoint?.name}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Target</p><p className="font-display text-2xl">{submission.targetScore}</p></div>
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Actual</p><p className="font-display text-2xl">{submission.actualScore ?? '-'}</p></div>
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Evidence</p><p className="font-display text-2xl">{submission.attachments.length}</p></div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4">
                <p className="text-sm leading-6 text-muted">{submission.answers[0]?.answer || 'No response submitted.'}</p>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button className="btn-secondary h-9 text-xs" onClick={() => setClarifying(submission)}><MessageSquare className="h-4 w-4" /> Raise Clarification</button>
                {mode === 'performance' && submission.status === 'with_performance_team' ? <button className="btn-primary h-9 text-xs" onClick={() => { mockApi.submitToDirector(submission.id); showSuccessToast('Submitted to Director') }}><Send className="h-4 w-4" /> Submit to Director</button> : null}
                {mode === 'performance' && submission.status === 'director_approved' ? <button className="btn-primary h-9 text-xs" onClick={() => { mockApi.publishKpis([submission.id]); showSuccessToast('KPI published') }}><ShieldCheck className="h-4 w-4" /> Publish</button> : null}
                {mode === 'director' ? <button className="btn-primary h-9 text-xs" onClick={() => { mockApi.approveKpi(submission.id); showSuccessToast('KPI approved') }}><Check className="h-4 w-4" /> Approve</button> : null}
              </div>
            </article>
          )
        })}
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
