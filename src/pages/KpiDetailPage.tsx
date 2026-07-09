import { ArrowLeft, Check, CheckCircle2, ChevronDown, FileText, History, MessageSquare, Save, Send, ShieldCheck, Sparkles, Target, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../context/ToastContext'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

function displayKpiId(id: string) {
  return id.replace(/^kpi-/i, '').toUpperCase()
}

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

function KpiAiSummaryPanel({
  kpiId,
  aiScore,
  rows,
  linkTo,
}: {
  kpiId: string
  aiScore: number
  rows: { title: string; description: string; flagged: boolean }[]
  linkTo: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--ai-border)] bg-surface shadow-soft">
      <button
        className="flex w-full items-start justify-between gap-4 bg-[linear-gradient(0deg,var(--ai-soft),var(--surface))] px-5 py-4 text-left transition hover:bg-[var(--ai-soft)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ai)] text-white shadow-[0_12px_24px_rgba(168,85,247,0.20)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-text">AI KPI Summary</h3>
              <span className="rounded-full bg-white/70 px-2.5 py-1 font-mono text-[11px] font-extrabold text-[var(--ai-strong)] dark:bg-white/10">
                Score {aiScore}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              AI-supported quality checks highlight evidence gaps, value mismatches, weak narratives, and wording risks for this KPI.
            </p>
          </div>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[var(--ai-strong)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-[var(--ai-border)] px-5 pb-5 pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <article className="rounded-2xl border border-[var(--ai-border)] bg-white/75 p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--ai)] dark:bg-white/5" key={row.title}>
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-extrabold leading-5 text-text">{row.title}</p>
                  <span className="rounded-full bg-[var(--ai-soft)] px-2.5 py-1 font-mono text-sm font-extrabold text-[var(--ai-strong)]">{row.flagged ? 1 : 0}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{row.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.flagged ? (
                    <Link
                      className="rounded-full border border-[var(--ai-border)] bg-white px-2 py-1 font-mono text-[11px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                      to={linkTo}
                    >
                      {displayKpiId(kpiId)}
                    </Link>
                  ) : (
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold text-muted dark:bg-white/5">No KPI IDs</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function KpiDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const returnState = location.state as { returnTo?: string; selectedInstanceId?: string; returnLabel?: string } | null
  const backTo = returnState?.returnTo ?? '/kpis'
  const backLabel = returnState?.returnLabel ?? 'Back to KPIs'
  const { activeCycleId } = useAppStore()
  const { showSuccessToast, showErrorToast } = useToast()
  const [clarificationOpen, setClarificationOpen] = useState(false)
  const [clarificationNote, setClarificationNote] = useState('')
  const [performanceComment, setPerformanceComment] = useState('')
  const [openAttachmentId, setOpenAttachmentId] = useState<string | null>(null)
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
  const aiScore = activeSubmission
    ? Math.min(96, 42 + activeSubmission.answers.filter((answer) => answer.answer.trim().length >= 20).length * 8 + Math.min(18, activeSubmission.attachments.length * 9) + (activeSubmission.actualScore === undefined ? 0 : Math.min(22, Math.round((activeSubmission.actualScore / Math.max(1, activeSubmission.targetScore)) * 18))))
    : 0
  const suggestedAnswers = kpi.questions.reduce<Record<string, string>>((map, question) => {
    const answer = activeSubmission?.answers.find((item) => item.questionId === question.id)?.answer
    map[question.id] = answer || 'No suggested value is available until evidence and KPI response details are provided.'
    return map
  }, {})
  const effectivePerformanceComment = performanceComment || activeSubmission?.performanceTeamComment || ''
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
  const answerByLabel = (label: string) => {
    const question = kpi.questions.find((item) => item.label.toLowerCase().includes(label))
    return activeSubmission?.answers.find((answer) => answer.questionId === question?.id)?.answer.trim() ?? ''
  }
  const hasWeakText = (value: string) => value.length === 0 || value.length < 35
  const hasEvidence = Boolean(activeSubmission?.attachments.length)
  const evidenceMismatch = Boolean(activeSubmission?.actualScore !== undefined && activeSubmission.actualScore >= activeSubmission.targetScore && !hasEvidence)
  const aiSummaryRows = [
    {
      title: 'KPIs with insufficient evidence',
      description: 'Evidence is missing or not enough for KPI validation.',
      flagged: !hasEvidence,
    },
    {
      title: 'KPIs where evidence may not match entered actual value',
      description: 'Actual value looks strong, but supporting evidence is missing or weak.',
      flagged: evidenceMismatch,
    },
    {
      title: 'KPIs where analysis is weak, missing, or unclear',
      description: 'Analysis needs clearer interpretation before validation.',
      flagged: hasWeakText(answerByLabel('analysis')),
    },
    {
      title: 'KPIs where challenges are missing or not specific',
      description: 'Challenge narrative should explain blockers and ownership.',
      flagged: hasWeakText(answerByLabel('challenge')),
    },
    {
      title: 'KPIs where recommendations are missing or generic',
      description: 'Recommendations should include specific corrective action.',
      flagged: hasWeakText(answerByLabel('recommendation')),
    },
    {
      title: 'KPIs that may need better wording before validation',
      description: 'AI quality score indicates the wording can be improved.',
      flagged: aiScore < 70,
    },
  ]
  const recommendedPerformanceAction =
    aiScore < 72 || !hasEvidence || evidenceMismatch || aiSummaryRows.filter((row) => row.flagged).length >= 3
      ? 'clarify'
      : 'review'
  const clarificationPrompts = [
    'Please strengthen the evidence and connect it clearly to the reported actual score.',
    'Please clarify the analysis narrative with measurable progress and cycle-specific context.',
    'Please update challenges and recommendations with specific blockers, owners, and next actions.',
  ]

  function handlePerformanceCommentSave() {
    if (!activeSubmission) return
    const comment = effectivePerformanceComment.trim()
    if (!comment) {
      showErrorToast('Comment required', 'Enter Performance Team comment before saving this KPI.')
      return
    }
    mockApi.savePerformanceTeamComment(activeSubmission.id, comment)
    showSuccessToast('Comment saved', 'Performance Team comment has been saved. You can mark the KPI as reviewed from the Validation Queue grid.')
  }

  function handlePerformanceReview() {
    if (!activeSubmission) return
    const comment = effectivePerformanceComment.trim()
    if (!comment) {
      showErrorToast('Comment required', 'Enter Performance Team comment before reviewing this KPI.')
      return
    }
    mockApi.reviewByPerformanceTeam(activeSubmission.id, comment)
    showSuccessToast('KPI reviewed', 'Performance Team comment has been saved and the KPI is marked as reviewed.')
  }

  function handleDirectorReview() {
    if (!activeSubmission) return
    mockApi.reviewByDirector(activeSubmission.id)
    showSuccessToast('KPI reviewed', 'KPI has been reviewed by the Department Director.')
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
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
        state={returnState?.selectedInstanceId ? { selectedInstanceId: returnState.selectedInstanceId } : undefined}
        to={backTo}
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
      <section className="raised-card p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_300px] xl:items-start">
          <div>
            <p className="eyebrow">{department?.name}</p>
            <h2 className="mt-1 text-3xl">{kpi.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{kpi.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {submission ? <StatusPill value={submission.status} /> : null}
              <span className="status-pill border-info/20 bg-info/10 text-info">{kpi.category}</span>
            </div>
          </div>
          <div className="ai-panel p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ai-strong)]">AI Review Score</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-display text-5xl font-extrabold leading-none">{aiScore}</p>
              <div className="relative h-[72px] w-[72px]">
                <svg className="-rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" fill="none" stroke="var(--ai-soft)" strokeWidth="8" />
                  <circle cx="36" cy="36" r="28" fill="none" stroke="var(--ai)" strokeLinecap="round" strokeWidth="8" strokeDasharray="176" strokeDashoffset={176 - (176 * Math.min(100, aiScore)) / 100} />
                </svg>
                <Sparkles className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-[var(--ai)]" />
              </div>
            </div>
            {user.role === 'focal_point' ? <Link className="btn-primary mt-4 w-full" to={`/kpis/${kpi.id}/fill`}>Fill KPI</Link> : null}
          </div>
        </div>
      </section>
      <KpiAiSummaryPanel
        aiScore={aiScore}
        kpiId={kpi.id}
        linkTo={user.role === 'focal_point' ? `/kpis/${kpi.id}/fill` : `/kpis/${kpi.id}`}
        rows={aiSummaryRows}
      />
      <section className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#F5D0A9] bg-[#FFF7ED] px-4 py-3 shadow-sm dark:border-[#EA580C]/30 dark:bg-[#431407]/40">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white">
          <History className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#C2410C] dark:text-orange-300">Read-only KPI view</p>
          <p className="text-xs leading-5 text-[#64748B] dark:text-slate-300">
            This page shows the KPI response in view mode. Workflow actions are available only to the current owner for statuses assigned to their role.
          </p>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
        {user.role === 'performance_team' && activeSubmission ? (
          <article className="card p-5">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold">Performance Team Comment</h3>
                <p className="mt-1 text-sm leading-6 text-muted">Add the validation comment before marking this KPI as reviewed.</p>
              </div>
            </div>
            <div className="mt-4">
              {canPerformanceReview ? (
                <textarea
                  className="min-h-32 w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm leading-6 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter Performance Team review comment..."
                  value={effectivePerformanceComment}
                  onChange={(event) => setPerformanceComment(event.target.value)}
                />
              ) : (
                <p className="rounded-2xl border border-border bg-surface-raised p-4 text-sm leading-6 text-text">{activeSubmission.performanceTeamComment || 'No Performance Team comment.'}</p>
              )}
            </div>
          </article>
        ) : null}
        <article className="overflow-hidden rounded-[28px] border border-primary/20 bg-surface p-5 transition hover:border-primary/35 hover:shadow-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold">Evidence document</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Uploaded KPI evidence and AI evidence score are shown here in read-only mode.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(submission?.attachments.length ? submission.attachments : []).map((attachment) => {
              const isOpen = openAttachmentId === attachment.id
              return (
                <div className="overflow-hidden rounded-[24px] border border-border bg-surface-raised transition hover:border-primary/25" key={attachment.id}>
                  <div className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-primary-tint/40">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                      <FileText className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold">{attachment.fileName}</p>
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{attachment.fileName.split('.').pop()?.toUpperCase() ?? 'FILE'}</span>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">AI analyzed</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">Evidence looks relevant and can support KPI response fields.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/20 bg-success/10" aria-label="Evidence score 89">
                        <div className="relative h-10 w-10">
                          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--success)" strokeLinecap="round" strokeWidth="4" strokeDasharray="100.53" strokeDashoffset={100.53 - 100.53 * 0.89} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-extrabold text-success">89</div>
                        </div>
                      </div>
                      <button className="inline-flex items-center rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-tint dark:border-white/10 dark:bg-white/5" onClick={() => setOpenAttachmentId(isOpen ? null : attachment.id)} type="button">
                        {isOpen ? 'Hide Detail' : 'View Detail'}
                      </button>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-border bg-surface px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">AI opinion</p>
                          <p className="mt-2 text-sm leading-6">The file supports the submitted KPI response and provides usable evidence for review.</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Evidence signal</p>
                          <p className="mt-2 text-sm leading-6">Strong relevance, medium completeness, and low mismatch risk against the actual value.</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Reviewer note</p>
                          <p className="mt-2 text-sm leading-6">Use this evidence when validating analysis, challenges, recommendations, and score consistency.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {!submission?.attachments.length ? <p className="rounded-2xl border border-border bg-surface-raised p-4 text-sm text-muted">No evidence files attached yet.</p> : null}
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><Target className="h-5 w-5" /></div>
            <div><h3 className="text-xl font-bold">KPI details</h3></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Actual score</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-primary">{submission?.actualScore ?? '-'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Target score</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-text">{submission?.targetScore ?? 0}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {kpi.questions.map((question) => (
              <div className="rounded-2xl border border-border bg-surface-raised p-4" key={question.id}>
                <p className="font-bold text-text">{question.label}</p>
                <p className="mt-2 text-sm font-normal leading-6 text-text">
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
        </article>
        </div>
        <aside className="space-y-5">
          {user.role === 'performance_team' && activeSubmission ? (
            <article className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold">Performance Team Actions</h3>
                  <p className="mt-1 text-sm text-muted">Save the comment, or review the KPI directly when validation is complete.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {canPerformanceReview ? (
                  <button className="btn-primary h-10 w-full justify-between text-xs" disabled={!effectivePerformanceComment.trim()} onClick={handlePerformanceReview} type="button">
                    <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Mark as Reviewed</span>
                    {recommendedPerformanceAction === 'review' ? <span className="rounded-full bg-[var(--ai)] px-2 py-0.5 text-[10px] font-extrabold text-white">AI recommended</span> : null}
                  </button>
                ) : null}
                {canPerformanceReview ? <button className="btn-secondary h-10 w-full justify-start text-xs" disabled={!effectivePerformanceComment.trim()} onClick={handlePerformanceCommentSave} type="button"><Save className="h-4 w-4" /> Save Comment</button> : null}
                {canRaiseClarification ? (
                  <button className="btn-secondary h-10 w-full justify-between text-xs" onClick={() => setClarificationOpen(true)} type="button">
                    <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Raise Clarification</span>
                    {recommendedPerformanceAction === 'clarify' ? <span className="rounded-full bg-[var(--ai-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--ai-strong)]">AI recommended</span> : null}
                  </button>
                ) : null}
                {canPerformanceSubmitToDirector ? <button className="btn-primary h-10 w-full justify-start text-xs" onClick={handlePerformanceSubmitToDirector} type="button"><Send className="h-4 w-4" /> Submit to Department Director</button> : null}
                {canPerformancePublish ? <button className="btn-primary h-10 w-full justify-start text-xs" onClick={() => { mockApi.publishKpis([activeSubmission.id]); showSuccessToast('KPI published') }} type="button"><ShieldCheck className="h-4 w-4" /> Publish</button> : null}
              </div>
            </article>
          ) : null}
          {user.role === 'department_director' && activeSubmission ? (
            <article className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold">Director Actions</h3>
                  <p className="mt-1 text-sm text-muted">Review, clarify, and approve the KPI.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-surface-raised p-3 text-sm leading-6 text-muted">
                  Director review does not require a comment. Use clarification only when the KPI must return to the Focal Point.
                </div>
                <div className="grid gap-2">
                  {canDirectorReview ? <button className="btn-primary h-10 w-full justify-start text-xs" onClick={handleDirectorReview} type="button"><Check className="h-4 w-4" /> Mark as Reviewed</button> : null}
                  {canRaiseClarification ? <button className="btn-secondary h-10 w-full justify-start text-xs" onClick={() => setClarificationOpen(true)} type="button"><MessageSquare className="h-4 w-4" /> Raise Clarification</button> : null}
                </div>
              </div>
            </article>
          ) : null}
          <article className="ai-panel">
            <div className="flex items-center gap-3">
              <div className="ai-icon h-11 w-11 shrink-0"><WandSparkles className="h-5 w-5" /></div>
              <div className="min-w-0"><h3 className="ai-heading text-lg font-extrabold">Suggested Fields</h3><p className="text-sm text-muted">Read-only AI suggestions for this KPI.</p></div>
            </div>
            <div className="mt-4 space-y-3">
              {kpi.questions.slice(0, 3).map((question) => (
                <div className="ai-surface" key={question.id}>
                  <p className="text-xs font-bold text-muted">{question.label}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5">{suggestedAnswers[question.id]}</p>
                </div>
              ))}
            </div>
          </article>
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
        <div className="mt-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ai-strong)]">AI quick prompts</p>
          <div className="flex flex-wrap gap-2">
            {clarificationPrompts.map((prompt) => (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-[var(--ai-border)] bg-[var(--ai-soft)] px-3 py-2 text-xs font-bold text-[var(--ai-strong)] transition hover:-translate-y-0.5 hover:border-[var(--ai)] hover:bg-white dark:hover:bg-white/10"
                key={prompt}
                onClick={() => setClarificationNote(prompt)}
                type="button"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
