import { ArrowLeft, Check, FileText, MessageSquare, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../context/ToastContext'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

function WorkflowCommentCard({ title, author, comment }: { title: string; author: string; comment?: string }) {
  return (
    <div className="mt-5 rounded-[22px] border border-primary/15 bg-primary-tint/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-text">{title}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm dark:bg-white/10">{author}</span>
          </div>
          <div className="mt-3 rounded-[18px] border border-border bg-white p-4 shadow-soft dark:bg-surface">
            <p className="text-sm font-medium leading-6 text-text">
              {comment?.trim() || 'No workflow comment has been added yet.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function KpiDetailPage() {
  const { id } = useParams()
  const { activeCycleId } = useAppStore()
  const { showSuccessToast, showErrorToast } = useToast()
  const [clarificationOpen, setClarificationOpen] = useState(false)
  const [clarificationNote, setClarificationNote] = useState('')
  const [performanceComment, setPerformanceComment] = useState('')
  const [directorComment, setDirectorComment] = useState('')
  const user = mockApi.getCurrentUser()
  const kpi = id ? mockApi.getKpi(id) : undefined
  const visibleKpiIds = new Set(mockApi.getKpisForRole(user.role, user.id, activeCycleId).map((item) => item.id))
  const department = kpi ? mockApi.getDepartment(kpi.departmentId) : undefined
  const submission = kpi && visibleKpiIds.has(kpi.id)
    ? mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId).find((item) => item.kpiId === kpi.id)
    : undefined

  if (!kpi || !visibleKpiIds.has(kpi.id)) {
    return <section className="raised-card p-6">KPI not found for this role and selected cycle.</section>
  }

  const activeSubmission = submission
  const effectivePerformanceComment = performanceComment || activeSubmission?.performanceTeamComment || ''
  const effectiveDirectorComment = directorComment || activeSubmission?.directorComment || ''
  const canPerformanceReview = user.role === 'performance_team' && activeSubmission && ['submitted_to_performance_team', 'with_performance_team'].includes(activeSubmission.status)
  const canPerformancePublish = user.role === 'performance_team' && activeSubmission && ['approved_by_director', 'director_approved'].includes(activeSubmission.status)
  const canPerformanceSubmitToDirector = user.role === 'performance_team' && activeSubmission?.status === 'reviewed_by_performance_team' && (
    activeSubmission.history.some((event) => event.toStatus === 'clarification_from_director') ||
    mockApi.getFocalPointInstances(activeCycleId)
      .find((instance) => instance.focalPointId === activeSubmission.focalPointId)
      ?.submissions.some((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))
  )
  const canDirectorReview = user.role === 'department_director' && activeSubmission?.status === 'submitted_to_director'
  const canRaiseClarification = activeSubmission && (
    (user.role === 'performance_team' && ['submitted_to_performance_team', 'with_performance_team'].includes(activeSubmission.status)) ||
    (user.role === 'department_director' && activeSubmission.status === 'submitted_to_director')
  )

  function handlePerformanceReview() {
    if (!activeSubmission) return
    const comment = effectivePerformanceComment.trim()
    if (!comment) {
      showErrorToast('Comment required', 'Enter Performance Team comment before reviewing this KPI.')
      return
    }
    mockApi.reviewByPerformanceTeam(activeSubmission.id, comment)
    showSuccessToast('KPI reviewed', 'Performance Team comment has been saved.')
  }

  function handleDirectorReview() {
    if (!activeSubmission) return
    const comment = effectiveDirectorComment.trim()
    if (!comment) {
      showErrorToast('Comment required', 'Enter Director comment before reviewing this KPI.')
      return
    }
    mockApi.reviewByDirector(activeSubmission.id, comment)
    showSuccessToast('KPI reviewed', 'Director comment has been saved.')
  }

  function handlePerformanceSubmitToDirector() {
    if (!activeSubmission) return
    mockApi.submitToDirector(activeSubmission.id, 'Clarification response sent back to Department Director.')
    showSuccessToast('Submitted to Director', 'The clarified KPI has been returned to Director review.')
  }

  function handleClarification() {
    if (!activeSubmission || !clarificationNote.trim()) return
    mockApi.raiseClarification(activeSubmission.id, clarificationNote.trim())
    showSuccessToast('Clarification returned', 'The KPI is back with the Focal Point for update.')
    setClarificationNote('')
    setClarificationOpen(false)
  }

  return (
    <div className="space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary" to="/kpis"><ArrowLeft className="h-4 w-4" /> Back to KPIs</Link>
      <section className="raised-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">{department?.name}</p>
            <h2 className="mt-1 text-3xl">{kpi.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{kpi.description}</p>
          </div>
          <div className="flex gap-2">
            {submission ? <StatusPill value={submission.status} /> : null}
            {user.role === 'focal_point' ? <Link className="btn-primary" to={`/kpis/${kpi.id}/fill`}>Fill KPI</Link> : null}
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <article className="card p-5">
          <p className="eyebrow">Questions & Responses</p>
          <div className="mt-4 space-y-3">
            {kpi.questions.map((question) => (
              <div className="rounded-2xl border border-border bg-surface-raised p-4" key={question.id}>
                <p className="font-semibold">{question.label}</p>
                <p className="mt-2 text-sm text-muted">
                  {submission?.answers.find((answer) => answer.questionId === question.id)?.answer || 'No answer submitted yet.'}
                </p>
              </div>
            ))}
          </div>
          {user.role === 'department_director' && activeSubmission ? (
            <WorkflowCommentCard
              title="Performance Team Comment"
              author="Performance Team"
              comment={activeSubmission.performanceTeamComment}
            />
          ) : null}
          {user.role === 'performance_team' && activeSubmission ? (
            <WorkflowCommentCard
              title="Director Comment"
              author="Department Director"
              comment={activeSubmission.directorComment}
            />
          ) : null}
        </article>
        <aside className="space-y-5">
          <article className="card p-5">
            <p className="eyebrow">Score</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface-raised p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Target</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-text">{submission?.targetScore ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-primary-tint p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Actual</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-primary">{submission?.actualScore ?? '-'}</p>
              </div>
            </div>
          </article>
          <article className="card p-5">
            <p className="eyebrow">Attachments</p>
            <div className="mt-3 space-y-2">
              {(submission?.attachments.length ? submission.attachments : []).map((attachment) => (
                <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm" key={attachment.id}>
                  <FileText className="h-4 w-4 text-primary" /> {attachment.fileName}
                </div>
              ))}
              {!submission?.attachments.length ? <p className="text-sm text-muted">No evidence files attached yet.</p> : null}
            </div>
          </article>
          {user.role === 'performance_team' && activeSubmission ? (
            <article className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">Performance Team Actions</h3>
                  <p className="mt-1 text-sm text-muted">Review, comment, clarify, and move the KPI forward.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Performance Team Comment</span>
                  {canPerformanceReview ? (
                    <textarea
                      className="min-h-28 w-full rounded-2xl border border-border bg-surface-raised px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter Performance Team review comment..."
                      value={effectivePerformanceComment}
                      onChange={(event) => setPerformanceComment(event.target.value)}
                    />
                  ) : (
                    <p className="rounded-2xl border border-border bg-surface-raised p-3 text-sm leading-6 text-muted">{activeSubmission.performanceTeamComment || 'No Performance Team comment.'}</p>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {canPerformanceReview ? <button className="btn-primary h-9 text-xs" disabled={!effectivePerformanceComment.trim()} onClick={handlePerformanceReview} type="button"><Check className="h-4 w-4" /> Review</button> : null}
                  {canPerformanceSubmitToDirector ? <button className="btn-primary h-9 text-xs" onClick={handlePerformanceSubmitToDirector} type="button"><Send className="h-4 w-4" /> Submit to Department Director</button> : null}
                  {canPerformancePublish ? <button className="btn-primary h-9 text-xs" onClick={() => { mockApi.publishKpis([activeSubmission.id]); showSuccessToast('KPI published') }} type="button"><ShieldCheck className="h-4 w-4" /> Publish</button> : null}
                  {canRaiseClarification ? <button className="btn-secondary h-9 text-xs" onClick={() => setClarificationOpen(true)} type="button"><MessageSquare className="h-4 w-4" /> Clarification</button> : null}
                </div>
              </div>
            </article>
          ) : null}
          {user.role === 'department_director' && activeSubmission ? (
            <article className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">Director Actions</h3>
                  <p className="mt-1 text-sm text-muted">Review, comment, clarify, and approve the KPI.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Director Comment</span>
                  {canDirectorReview ? (
                    <textarea
                      className="min-h-28 w-full rounded-2xl border border-border bg-surface-raised px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter Director review comment..."
                      value={effectiveDirectorComment}
                      onChange={(event) => setDirectorComment(event.target.value)}
                    />
                  ) : (
                    <p className="rounded-2xl border border-border bg-surface-raised p-3 text-sm leading-6 text-muted">{activeSubmission.directorComment || 'No Director comment.'}</p>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {canDirectorReview ? <button className="btn-primary h-9 text-xs" disabled={!effectiveDirectorComment.trim()} onClick={handleDirectorReview} type="button"><Check className="h-4 w-4" /> Review</button> : null}
                  {canRaiseClarification ? <button className="btn-secondary h-9 text-xs" onClick={() => setClarificationOpen(true)} type="button"><MessageSquare className="h-4 w-4" /> Clarification</button> : null}
                </div>
              </div>
            </article>
          ) : null}
        </aside>
      </section>
      <Modal
        open={clarificationOpen}
        onOpenChange={setClarificationOpen}
        icon={<MessageSquare className="h-5 w-5" />}
        eyebrow="Clarification"
        title="Return KPI for clarification"
        description="Write the clarification note for the Focal Point. This will update the workflow status and history."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setClarificationOpen(false)}>Cancel</button><button className="btn-primary" disabled={!clarificationNote.trim()} onClick={handleClarification}>Send Clarification</button></div>}
      >
        <textarea
          className="min-h-36 w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          placeholder="Write the clarification note..."
          value={clarificationNote}
          onChange={(event) => setClarificationNote(event.target.value)}
        />
      </Modal>
    </div>
  )
}
