import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { ArrowLeft, BrainCircuit, CheckCircle2, ClipboardList, FileText, FileUp, History, Save, ShieldAlert, Sparkles, Target, WandSparkles, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisReady, setAnalysisReady] = useState(Boolean(submission?.attachments.length))
  const [openAttachmentId, setOpenAttachmentId] = useState<string | null>(null)
  const canEdit = submission
    ? ['active', 'draft', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)
    : false
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
  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { actualScore: submission?.actualScore ?? 0, answers: defaultAnswers },
  })
  const actualScore = watch('actualScore')
  const dropzone = useDropzone({
    onDrop: (files) => {
      setAttachments((current) => [
        ...current,
        ...files.map((file) => ({ id: `att-${Date.now()}-${file.name}`, fileName: file.name, url: '#' })),
      ])
      setAnalysisReady(false)
      setIsAnalyzing(true)
      setOpenAttachmentId(null)
    },
  })

  useEffect(() => {
    if (!isAnalyzing) return undefined
    const timer = window.setTimeout(() => {
      setIsAnalyzing(false)
      setAnalysisReady(true)
      setOpenAttachmentId(null)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [isAnalyzing])

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

  const targetMet = actualScore >= activeSubmission.targetScore
  const aiScore = Math.min(96, 48 + (attachments.length ? 18 : 0) + (targetMet ? 14 : 6) + Object.values(watch('answers')).filter((value) => value.trim().length > 30).length * 5)
  const suggestedActual = Math.min(100, Math.max(activeSubmission.targetScore, activeSubmission.actualScore ?? activeSubmission.targetScore + 4))
  const suggestedAnswers = activeKpi.questions.reduce<Record<string, string>>((map, question) => {
    const lower = question.label.toLowerCase()
    map[question.id] = lower.includes('challenge')
      ? 'Current delivery constraints are mainly related to source evidence completeness, inter-department dependency timing, and validation readiness before final submission.'
      : lower.includes('recommend')
        ? 'Strengthen supporting evidence, align KPI wording with the approved definition, and confirm the final actual value with the department owner before submission.'
        : 'The submitted actual reflects measurable progress for the selected cycle, supported by the uploaded evidence package and department-level operating updates.'
    return map
  }, {})

  function applyAiSuggestion() {
    setValue('actualScore', suggestedActual, { shouldDirty: true, shouldValidate: true })
    Object.entries(suggestedAnswers).forEach(([questionId, value]) => setValue(`answers.${questionId}`, value, { shouldDirty: true, shouldValidate: true }))
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
            <p className="eyebrow">AI Review Score</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-display text-4xl font-extrabold">{aiScore}</p>
                <p className="text-sm text-muted">Read-only quality signal</p>
              </div>
              <div className="relative h-16 w-16">
                <svg className="-rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="25" fill="none" stroke="var(--primary-tint)" strokeWidth="7" />
                  <circle cx="32" cy="32" r="25" fill="none" stroke="var(--primary)" strokeLinecap="round" strokeWidth="7" strokeDasharray="157" strokeDashoffset={157 - (157 * Math.min(100, aiScore)) / 100} />
                </svg>
                <Sparkles className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
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

      <section className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-5">
        <article className="overflow-hidden rounded-[28px] border border-primary/20 bg-surface p-5 transition hover:border-primary/35 hover:shadow-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <FileUp className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold">Evidence document upload</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Upload KPI evidence first. The local AI review will analyze evidence strength, value consistency, and recommended fields before you complete the KPI details.</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-extrabold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI analysis runs for 5 seconds in demo mode
                </div>
              </div>
            </div>
            <div {...dropzone.getRootProps()} className="shrink-0">
              <input {...dropzone.getInputProps()} disabled={!canEdit} />
              <button className="btn-primary h-12 rounded-2xl px-6" disabled={!canEdit} type="button">
                <FileUp className="h-4 w-4" /> Upload Document
              </button>
            </div>
          </div>

          {isAnalyzing ? (
            <motion.div
              className="relative mt-5 overflow-hidden rounded-[26px] border border-primary/20 bg-surface-raised p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
            <div className="pointer-events-none absolute inset-0 rounded-[26px]">
              <motion.span className="absolute left-0 top-0 h-px w-1/3 bg-primary" animate={{ x: ['-120%', '330%'] }} transition={{ duration: 6.4, repeat: Infinity, ease: 'linear' }} />
              <motion.span className="absolute right-0 top-0 h-1/3 w-px bg-primary" animate={{ y: ['-120%', '330%'] }} transition={{ duration: 6.4, repeat: Infinity, ease: 'linear', delay: 1.6 }} />
              <motion.span className="absolute bottom-0 right-0 h-px w-1/3 bg-primary" animate={{ x: ['120%', '-330%'] }} transition={{ duration: 6.4, repeat: Infinity, ease: 'linear', delay: 3.2 }} />
              <motion.span className="absolute bottom-0 left-0 h-1/3 w-px bg-primary" animate={{ y: ['120%', '-330%'] }} transition={{ duration: 6.4, repeat: Infinity, ease: 'linear', delay: 4.8 }} />
            </div>
            <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_260px] lg:items-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <motion.div className="absolute inset-0 rounded-[28px] border border-primary/30" animate={{ scale: [1, 1.06, 1], opacity: [0.62, 1, 0.62] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} />
                <motion.div className="absolute inset-3 rounded-2xl border border-primary/40" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                  <BrainCircuit className="h-6 w-6" />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-extrabold">AI is reading the evidence</h4>
                  <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">Live scan</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">Checking document relevance, actual-score consistency, missing context, and suggested response wording.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {['Evidence strength', 'Value consistency', 'Field suggestions'].map((label, index) => (
                    <motion.div
                      className="rounded-2xl border border-border bg-surface px-3 py-2"
                      key={label}
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, delay: index * 0.35, ease: 'easeInOut' }}
                    >
                      <p className="text-xs font-bold text-text">{label}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-tint">
                        <motion.div className="h-full rounded-full bg-primary" animate={{ width: ['22%', '78%', '48%'] }} transition={{ duration: 3.8, repeat: Infinity, delay: index * 0.28, ease: 'easeInOut' }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="rounded-[22px] border border-border bg-surface p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Analysis queue</p>
                <div className="mt-3 space-y-2">
                  {['Extracting evidence signals', 'Matching KPI target', 'Drafting recommendations'].map((label, index) => (
                    <div className="flex items-center gap-2 text-xs font-semibold" key={label}>
                      <motion.span className="h-2 w-2 rounded-full bg-primary" animate={{ scale: [1, 1.45, 1], opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.4, ease: 'easeInOut' }} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </motion.div>
          ) : null}

          {analysisReady && attachments.length ? (
            <div className="mt-5 space-y-3">
              {attachments.map((attachment) => {
                const isOpen = openAttachmentId === attachment.id
                return (
                  <motion.div
                    className="overflow-hidden rounded-[24px] border border-border bg-surface-raised transition hover:border-primary/25"
                    key={attachment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
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
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">Evidence looks relevant and can support suggested KPI response fields.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/20 bg-success/10" aria-label="Evidence score 89">
                        <div className="relative h-10 w-10">
                          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              stroke="var(--success)"
                              strokeLinecap="round"
                              strokeWidth="4"
                              strokeDasharray="100.53"
                              strokeDashoffset={100.53 - 100.53 * 0.89}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-extrabold text-success">89</div>
                        </div>
                      </div>
                      <button
                        className="inline-flex items-center rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-tint dark:border-white/10 dark:bg-white/5 dark:text-primary dark:hover:bg-white/10"
                        onClick={() => setOpenAttachmentId(isOpen ? null : attachment.id)}
                        type="button"
                      >
                        {isOpen ? 'Hide Detail' : 'View Detail'}
                      </button>
                    </div>
                  </div>
                  <motion.div
                    className="overflow-hidden border-t border-border bg-surface"
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <div className="px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">AI opinion</p>
                          <p className="mt-2 text-sm leading-6">The file contains enough context to support the entered actual score, but the narrative should clearly connect evidence dates to the selected cycle.</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Evidence signal</p>
                          <p className="mt-2 text-sm leading-6">Strong relevance, medium completeness, and low mismatch risk against the KPI target value.</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recommended action</p>
                          <p className="mt-2 text-sm leading-6">Apply suggested fields, then refine analysis and challenges with department-specific wording before saving draft.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  </motion.div>
                )
              })}
            </div>
          ) : null}
        </article>

        <article className="card space-y-5 p-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><ClipboardList className="h-5 w-5" /></div>
            <div><h3 className="text-xl font-bold">KPI details</h3></div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block rounded-[22px] border border-border bg-surface-raised p-4">
                <span className="mb-2 block text-sm font-extrabold">Actual score</span>
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
                <div className="mt-3 flex items-center gap-2">
                  {targetMet ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />}
                  <p className={`text-xs font-bold ${targetMet ? 'text-success' : 'text-danger'}`}>{targetMet ? 'Target met or exceeded' : 'Below target score'}</p>
                </div>
                {errors.actualScore ? <span className="text-xs text-danger">{errors.actualScore.message}</span> : null}
              </label>
              <div className="rounded-[22px] border border-border bg-surface-raised p-4">
                <span className="mb-2 block text-sm font-extrabold">Target score</span>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-4xl font-extrabold">{activeSubmission.targetScore}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">KPI target for this cycle</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
              </div>
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
        </div>

        <aside className="space-y-5">
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><WandSparkles className="h-5 w-5" /></div>
              <div><h3 className="text-lg font-extrabold">Suggested Fields</h3><p className="text-sm text-muted">Generated after evidence analysis.</p></div>
            </div>
            {analysisReady && attachments.length ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-surface-raised p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Suggested actual score</p>
                  <p className="mt-1 font-display text-3xl font-extrabold">{suggestedActual}</p>
                </div>
                {activeKpi.questions.slice(0, 3).map((question) => (
                  <div className="rounded-2xl border border-border bg-surface-raised p-3" key={question.id}>
                    <p className="text-xs font-bold text-muted">{question.label}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5">{suggestedAnswers[question.id]}</p>
                  </div>
                ))}
                <button className="btn-primary w-full justify-center" disabled={!canEdit} onClick={applyAiSuggestion} type="button">
                  Apply Suggestions <Sparkles className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 text-sm text-muted">
                Upload and analyze a document to populate suggested values here.
              </div>
            )}
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
