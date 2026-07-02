import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, History, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { StatusPill } from '../components/ui/StatusPill'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

function titleCaseStatus(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function historyIcon(status: string) {
  if (status.includes('clarification')) return RotateCcw
  if (status === 'published') return ShieldCheck
  if (status === 'director_approved') return CheckCircle2
  if (status === 'submitted_to_director' || status === 'with_performance_team') return Send
  return Clock3
}

export function KpiDetailPage() {
  const { id } = useParams()
  const { activeCycleId } = useAppStore()
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
        </aside>
      </section>
      <section className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Status History</p>
            <h3 className="mt-1 text-xl font-bold">Governed movement timeline</h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint text-primary">
            <History className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {(submission?.history ?? []).map((event, index) => {
            const Icon = historyIcon(event.toStatus)
            return (
              <div className="group relative rounded-[20px] border border-border bg-surface-raised p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card" key={event.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary transition group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-pill border-border bg-surface text-muted">{titleCaseStatus(event.fromStatus)}</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-primary">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                        <span className="status-pill border-primary/15 bg-primary-tint text-primary">{titleCaseStatus(event.toStatus)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">{event.note || 'Status changed.'}</p>
                      <p className="mt-2 text-xs font-semibold text-muted">Actor role: {titleCaseStatus(event.actorRole)}</p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-border bg-surface px-3 py-2 text-right">
                    <p className="font-mono text-xs font-semibold text-text">{new Date(event.timestamp).toLocaleDateString()}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">{new Date(event.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {!submission?.history.length ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
              No movement has been recorded for this KPI yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
