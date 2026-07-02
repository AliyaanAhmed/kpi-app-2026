import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ClipboardList, FileUp, History, Save, ShieldAlert, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../context/ToastContext'
import type { Attachment } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

const schema = z.object({
  actualScore: z.number().min(0, 'Score is required'),
  answers: z.record(z.string(), z.string().min(4, 'Answer needs a little more detail')),
})

type FormValues = z.infer<typeof schema>

export function KpiFillPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCycleId } = useAppStore()
  const { showSuccessToast } = useToast()
  const user = mockApi.getCurrentUser()
  const kpi = id ? mockApi.getKpi(id) : undefined
  const submission = kpi ? mockApi.ensureSubmissionForKpi(kpi.id, activeCycleId, user.id) : undefined
  const [attachments, setAttachments] = useState<Attachment[]>(submission?.attachments ?? [])
  const canEdit = submission ? ['active', 'draft', 'clarification_focal', 'clarification_director'].includes(submission.status) : false
  const defaultAnswers = useMemo(
    () =>
      Object.fromEntries(
        (kpi?.questions ?? []).map((question) => [
          question.id,
          submission?.answers.find((answer) => answer.questionId === question.id)?.answer ?? '',
        ]),
      ),
    [kpi?.questions, submission?.answers],
  )
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { actualScore: submission?.actualScore ?? 0, answers: defaultAnswers },
  })
  const dropzone = useDropzone({
    onDrop: (files) => {
      setAttachments((current) => [
        ...current,
        ...files.map((file) => ({ id: `att-${Date.now()}-${file.name}`, fileName: file.name, url: '#' })),
      ])
    },
  })

  if (!kpi || !submission) return <section className="raised-card p-6">This KPI is not assigned to the active Focal Point for this cycle.</section>

  const activeKpi = kpi
  const activeSubmission = submission

  function payload(values: FormValues) {
    return {
      actualScore: values.actualScore,
      attachments,
      answers: Object.entries(values.answers).map(([questionId, answer]) => ({ questionId, answer })),
    }
  }

  function saveDraft(values: FormValues) {
    mockApi.saveKpiDraft(activeSubmission.id, payload(values))
    showSuccessToast('Draft saved', 'Your KPI response has been saved locally.')
    navigate(`/kpis/${activeKpi.id}`)
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(saveDraft)}>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary" to={`/kpis/${activeKpi.id}`}><ArrowLeft className="h-4 w-4" /> Back to detail</Link>
      <section className="raised-card p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-start">
          <div>
            <div className="flex flex-wrap gap-2"><StatusPill value={activeSubmission.status} /><span className="status-pill border-info/20 bg-info/10 text-info">{activeKpi.category}</span></div>
            <p className="eyebrow mt-4">Focal Point Entry</p>
            <h2 className="mt-1 text-[30px] leading-tight">{activeKpi.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{activeKpi.description}</p>
          </div>
          <div className="card p-4">
            <p className="eyebrow">Cycle Target Score</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-display text-4xl font-extrabold">{activeSubmission.targetScore}</p>
                <p className="text-sm text-muted">Target assigned by Admin</p>
              </div>
              <div className="relative h-16 w-16">
                <svg className="-rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="25" fill="none" stroke="var(--primary-tint)" strokeWidth="7" />
                  <circle cx="32" cy="32" r="25" fill="none" stroke="var(--primary)" strokeLinecap="round" strokeWidth="7" strokeDasharray="157" strokeDashoffset={157 - (157 * Math.min(100, activeSubmission.targetScore)) / 100} />
                </svg>
                <Target className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {!canEdit ? (
        <section className="flex flex-wrap items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning text-white">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">Pending with workflow owner</p>
            <p className="text-xs leading-5 text-muted">
              This KPI is currently locked in its present workflow status. The focal point can edit it again only when it is Active, Draft, or returned for clarification.
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <article className="card space-y-5 p-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><ClipboardList className="h-5 w-5" /></div>
            <div><h3 className="text-xl font-bold">KPI details</h3></div>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Actual score</span>
                <Controller
                  control={control}
                  name="actualScore"
                  render={({ field }) => (
                    <input
                      className="field w-full"
                      disabled={!canEdit}
                      max={100}
                      min={0}
                      type="number"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  )}
                />
                <p className="mt-1 text-xs text-muted">Enter the actual score achieved for this KPI in the selected cycle.</p>
                {errors.actualScore ? <span className="text-xs text-danger">{errors.actualScore.message}</span> : null}
              </label>
            </div>
            {activeKpi.questions.map((question) => (
              <label className="block" key={question.id}>
                <span className="mb-1 block text-sm font-semibold">{question.label}</span>
                <Controller
                  control={control}
                  name={`answers.${question.id}`}
                  render={({ field }) => (
                    <textarea
                    className="form-field-surface min-h-32 w-full px-4 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                      disabled={!canEdit}
                      {...field}
                    />
                  )}
                />
                {errors.answers?.[question.id] ? <span className="text-xs text-danger">{errors.answers[question.id]?.message}</span> : null}
              </label>
            ))}
          </div>
        </article>
        <aside className="space-y-5">
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><FileUp className="h-5 w-5" /></div>
              <div><p className="eyebrow">Evidence Upload</p><p className="text-sm text-muted">Attach source evidence before submitting.</p></div>
            </div>
            <div
              {...dropzone.getRootProps()}
              className="mt-4 cursor-pointer rounded-[20px] border border-dashed border-primary/25 bg-primary-tint/40 p-6 text-center transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <input {...dropzone.getInputProps()} disabled={!canEdit} />
              <FileUp className="mx-auto h-7 w-7 text-primary" />
              <p className="mt-2 text-sm font-semibold">Drop evidence files here</p>
              <p className="text-xs text-muted">Local mock upload only for design review.</p>
            </div>
            <div className="mt-4 space-y-2">
              {attachments.map((attachment) => <div className="rounded-xl border border-border px-3 py-2 text-sm" key={attachment.id}>{attachment.fileName}</div>)}
            </div>
          </article>
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3 text-warning"><ShieldAlert className="h-5 w-5" /></div>
              <div><p className="eyebrow">Submission Path</p><p className="text-sm text-muted">Governed status movement</p></div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted">
              <p>Save each KPI as draft from this form.</p>
              <p>Once all assigned KPI records are drafted, submit them together from the Focal Point dashboard.</p>
            </div>
          </article>
        </aside>
      </section>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-2xl border border-border bg-surface-raised p-3 shadow-card">
        <button className="btn-secondary" type="button" disabled={!canEdit} onClick={handleSubmit(saveDraft)}><Save className="h-4 w-4" /> Save Draft</button>
      </div>
    </form>
  )
}
