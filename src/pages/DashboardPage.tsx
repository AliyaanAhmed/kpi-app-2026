import { ResponsiveRadar } from '@nivo/radar'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  Filter,
  Layers3,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusPill } from '../components/ui/StatusPill'
import { AppSelect } from '../components/ui/AppSelect'
import { useToast } from '../context/ToastContext'
import type { Cycle, Department, FocalPointSubmissionInstance, Kpi, KpiSubmission, SubmissionStatus } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

const tones = ['#286CFF', '#4A9D5C', '#A855F7', '#B68A35', '#EB5F24']

const scoreBands = [
  { label: 'Met / Exceeded', range: '90-100', color: '#4A9D5C', test: (score?: number) => (score ?? 0) >= 90 },
  { label: 'On Track', range: '75-89', color: '#286CFF', test: (score?: number) => (score ?? 0) >= 75 && (score ?? 0) < 90 },
  { label: 'Needs Attention', range: '60-74', color: '#B68A35', test: (score?: number) => (score ?? 0) >= 60 && (score ?? 0) < 75 },
  { label: 'Critical', range: '0-59', color: '#EA4F49', test: (score?: number) => score !== undefined && score < 60 },
  { label: 'No Data', range: '-', color: '#94A3B8', test: (score?: number) => score === undefined },
]

function scoreHealth(submission: KpiSubmission) {
  if (submission.actualScore === undefined) return 'noData'
  if (submission.actualScore >= submission.targetScore) return 'met'
  if (submission.actualScore >= submission.targetScore * 0.75) return 'atRisk'
  return 'critical'
}

function aiReviewScore(submission: KpiSubmission) {
  const answered = submission.answers.filter((answer) => answer.answer.trim().length >= 20).length
  const evidenceBonus = Math.min(18, submission.attachments.length * 9)
  const scoreBonus = submission.actualScore === undefined ? 0 : Math.min(22, Math.round((submission.actualScore / Math.max(1, submission.targetScore)) * 18))
  return Math.min(96, 42 + answered * 8 + evidenceBonus + scoreBonus)
}

function shortKpiId(id: string) {
  return id.replace(/^kpi-/i, '').padStart(3, '0')
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  color,
  index,
  action = 'Open workspace',
}: {
  label: string
  value: number | string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  index: number
  action?: string
}) {
  return (
    <motion.article
      className="group relative overflow-hidden rounded-[22px] border bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-premium"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{ borderColor: `${color}55` }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold leading-5 text-text">{label}</p>
          <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-0.5 text-sm font-medium text-muted">{detail}</p>
        </div>
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105"
          style={{ color, backgroundColor: `${color}18` }}
        >
          <span className="absolute inset-0 bg-current opacity-0 transition duration-300 ease-out group-hover:opacity-10" />
          <Icon className="relative h-5 w-5 transition duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3" />
        </div>
      </div>
      <div className="relative mt-5 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs font-semibold text-muted transition group-hover:text-primary">{action}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-raised transition group-hover:border-primary group-hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.article>
  )
}

function Hero({ eyebrow, title, copy, chips }: { eyebrow: string; title: string; copy: string; chips: { label: string; value: string | number }[] }) {
  void eyebrow
  return (
    <section className="raised-card p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[34px] leading-tight">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{copy}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {chips.map((chip) => (
            <div className="card px-4 py-3" key={chip.label}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{chip.label}</p>
              <p className="font-display text-lg font-extrabold leading-tight">{chip.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FocalPointAssignmentPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const departmentRows = Array.from(
    submissions.reduce((map, submission) => {
      const kpi = mockApi.getKpi(submission.kpiId)
      const department = kpi ? mockApi.getDepartment(kpi.departmentId) : undefined
      if (!department) return map
      const existing = map.get(department.id) ?? {
        id: department.id,
        name: department.name,
        kpiCount: 0,
        entered: 0,
        returned: 0,
        met: 0,
        atRisk: 0,
        noData: 0,
        scoreTotal: 0,
        scored: 0,
      }
      existing.kpiCount += 1
      if (submission.actualScore !== undefined || submission.status === 'draft') existing.entered += 1
      if (['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)) existing.returned += 1
      const health = scoreHealth(submission)
      if (health === 'met') existing.met += 1
      if (health === 'atRisk' || health === 'critical') existing.atRisk += 1
      if (health === 'noData') existing.noData += 1
      if (submission.actualScore !== undefined) {
        existing.scoreTotal += submission.actualScore
        existing.scored += 1
      }
      map.set(department.id, existing)
      return map
    }, new Map<string, { id: string; name: string; kpiCount: number; entered: number; returned: number; met: number; atRisk: number; noData: number; scoreTotal: number; scored: number }>()),
  ).map(([, value]) => value)
  return (
    <article className="card p-5 transition hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Departments assigned to me</h2>
          <p className="mt-2 text-sm text-muted">Department-level entry progress, returns, and target-score health for the active cycle.</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Building2 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {departmentRows.map((row, index) => {
          const progress = Math.round((row.entered / Math.max(1, row.kpiCount)) * 100)
          const avgScore = row.scored ? Math.round(row.scoreTotal / row.scored) : 0
          const metPercent = Math.round((row.met / Math.max(1, row.kpiCount)) * 100)
          return (
            <motion.div
              className="group rounded-[24px] border border-border bg-surface-raised p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold transition group-hover:text-primary">{row.name}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{row.kpiCount} KPIs assigned</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-extrabold">{progress}%</p>
                  <p className="text-xs text-muted">entered</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold">{row.entered}/{row.kpiCount}</p>
                  <p className="mt-0.5 text-muted">KPIs entered</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold text-warning">{row.returned}</p>
                  <p className="mt-0.5 text-muted">KPIs returned</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold">{avgScore}%</p>
                  <p className="mt-0.5 text-muted">Avg score</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold text-success">{metPercent}%</p>
                  <p className="mt-0.5 text-muted">Met/exceeded</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold text-danger">{row.atRisk}</p>
                  <p className="mt-0.5 text-muted">At risk</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="text-base font-extrabold text-muted">{row.noData}</p>
                  <p className="mt-0.5 text-muted">No data</p>
                </div>
              </div>
            </motion.div>
          )
        })}
        {!departmentRows.length ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
            No department KPI assignments are available for this focal point in the selected cycle.
          </div>
        ) : null}
      </div>
    </article>
  )
}

function FocalPointBulkSubmitPanel({
  submissions,
  alerts,
  onSubmit,
}: {
  submissions: KpiSubmission[]
  alerts: FocalPointCycleAlert[]
  onSubmit: () => void
}) {
  const cycle = mockApi.getActiveCycle()
  const setActiveCycle = useAppStore((state) => state.setActiveCycle)
  const actionableStatuses: SubmissionStatus[] = ['draft']
  const clarificationStatuses: SubmissionStatus[] = ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director']
  const clarificationCount = submissions.filter((submission) => clarificationStatuses.includes(submission.status)).length
  const actionableCount = submissions.filter((submission) => actionableStatuses.includes(submission.status)).length
  const allReady = submissions.length > 0 && actionableCount === submissions.length && clarificationCount === 0
  const dueDate = cycle?.endDate ? new Date(`${cycle.endDate}T00:00:00`) : undefined
  const daysRemaining = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)) : 0
  const enteredCount = submissions.filter((submission) => submission.status !== 'active' && !clarificationStatuses.includes(submission.status)).length

  return (
    <section className={alerts.length ? 'grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:items-stretch' : ''}>
      <article className={alerts.length
        ? 'group flex h-full overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'
        : 'group overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'}
      >
        {alerts.length ? (
          <div className="flex w-full flex-col justify-center gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Performance Team Submission Deadline</p>
                  <p className="mt-1 text-base font-extrabold text-primary">{daysRemaining} days remaining</p>
                </div>
              </div>
              <div className="relative">
                <button className="btn-primary h-11 w-full rounded-[18px] px-4 disabled:cursor-not-allowed disabled:opacity-55 md:w-auto" disabled={!allReady} onClick={onSubmit} type="button">
                  Submit to Performance Team <ArrowRight className="h-4 w-4" />
                </button>
                <div className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] right-0 w-[300px] rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted opacity-0 shadow-card transition group-hover:opacity-100">
                  You can submit to Performance Team once all KPIs are entered.
                </div>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
                  <Sparkles className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">AI Summary</p>
                  <p className="mt-1 text-sm font-semibold text-text">KPIs entered, <span className="text-primary">{enteredCount}/{submissions.length}</span></p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="text-xs font-semibold text-muted">Readiness</p>
                <p className="mt-1 text-sm font-bold text-text">{allReady ? 'Ready to submit' : 'Pending entry'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[980px] items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="whitespace-nowrap text-xs font-semibold text-muted">Performance Team Submission Deadline</p>
                  <p className="mt-1 text-sm font-bold text-primary">{daysRemaining} days remaining</p>
                </div>
              </div>
              <div className="h-12 w-px shrink-0 bg-border" />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
                  <Sparkles className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">AI Summary</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-semibold text-text">
                    KPIs entered, <span className="text-primary">{enteredCount}/{submissions.length}</span>
                  </p>
                </div>
              </div>
              <div className="relative ml-auto shrink-0">
                <button className="btn-primary h-11 rounded-[18px] px-4 disabled:cursor-not-allowed disabled:opacity-55" disabled={!allReady} onClick={onSubmit} type="button">
                  Submit to Performance Team <ArrowRight className="h-4 w-4" />
                </button>
                <div className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] right-0 w-[300px] rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted opacity-0 shadow-card transition group-hover:opacity-100">
                  You can submit to Performance Team once all KPIs are entered.
                </div>
              </div>
            </div>
          </div>
        )}
      </article>

      {alerts.length ? <article className="rounded-[24px] border border-info/20 bg-surface p-4 transition hover:border-info/35 hover:shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">Same-year cycle notice</h3>
            <p className="mt-1 text-sm text-muted">New cycles in this reporting year may also need your KPI entry.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {alerts.slice(0, 2).map((alert) => (
            <div className="rounded-2xl border border-border bg-surface-raised p-3" key={alert.cycle.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{alert.cycle.label}</p>
                  <p className="mt-1 text-xs text-muted">{alert.kpis.length} KPIs / {alert.departments.length} departments</p>
                </div>
                <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover" onClick={() => setActiveCycle(alert.cycle.id)} type="button">
                  Switch
                </button>
              </div>
            </div>
          ))}
        </div>
      </article> : null}
    </section>
  )
}

type FocalPointCycleAlert = {
  cycle: Cycle
  kpis: Kpi[]
  departments: Department[]
}

function cycleYears(cycle: Cycle) {
  return [cycle.startDate, cycle.endDate]
    .map((date) => new Date(`${date}T00:00:00`).getFullYear())
    .filter((year) => Number.isFinite(year))
}

function getFocalPointCycleAlerts(userId: string, activeCycleId: string): FocalPointCycleAlert[] {
  const activeCycle = mockApi.getActiveCycle()
  if (!activeCycle) return []
  const activeYears = new Set(cycleYears(activeCycle))

  return mockApi
    .getCycles()
    .filter((cycle) => cycle.id !== activeCycleId && cycle.status !== 'closed')
    .filter((cycle) => cycleYears(cycle).some((year) => activeYears.has(year)))
    .map((cycle) => {
      const kpis = mockApi.getKpisForRole('focal_point', userId, cycle.id)
      const departmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
      return {
        cycle,
        kpis,
        departments: mockApi.getDepartments().filter((department) => departmentIds.has(department.id)),
      }
    })
    .filter((alert) => alert.kpis.length > 0)
}

function FocalPointProgressPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const completed = submissions.filter((submission) => submission.status === 'draft' || submission.actualScore !== undefined).length
  const pending = submissions.filter((submission) => submission.status === 'active').length
  const returned = submissions.filter((submission) => ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)).length
  const progress = Math.round((completed / Math.max(1, submissions.length)) * 100)

  return (
    <section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-soft transition hover:border-primary/35 hover:shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">My Progress</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Track whether assigned KPIs are ready for Performance Team submission.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted">
              <span>Overall completion</span>
              <span>{completed}/{submissions.length} completed</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-surface shadow-inner">
              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.55 }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Completed Entry: {completed}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-surface ring-1 ring-border" />Pending Entry: {pending}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger/75" />Clarification / Rejected: {returned}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {[
            { label: 'Completed Entry', value: completed, icon: CheckCircle2, tone: 'text-primary', bg: 'bg-primary-tint' },
            { label: 'Pending Entry', value: pending, icon: Clock3, tone: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Pending Clarification / Rejected', value: returned, icon: Activity, tone: 'text-danger', bg: 'bg-danger/10' },
          ].map((item, index) => (
            <motion.div
              className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card"
              key={item.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.bg} ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-extrabold text-text">{item.label}</p>
              </div>
              <p className={`font-display text-3xl font-extrabold ${item.tone}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FocalPointAiAssistancePanel({ submissions }: { submissions: KpiSubmission[] }) {
  const kpiIdLabel = (id: string) => id.replace(/^kpi-/i, '').padStart(3, '0')
  const getAnswer = (submission: KpiSubmission, label: string) => {
    const kpi = mockApi.getKpi(submission.kpiId)
    const question = kpi?.questions.find((item) => item.label.toLowerCase().includes(label))
    return submission.answers.find((answer) => answer.questionId === question?.id)?.answer.trim() ?? ''
  }
  const hasGenericText = (value: string) => value.length > 0 && value.length < 35
  const rows = [
    {
      label: 'KPIs with insufficient evidence',
      description: 'Evidence is missing or not enough to support the submitted actual value.',
      submissions: submissions.filter((submission) => submission.attachments.length === 0),
    },
    {
      label: 'KPIs where evidence may not match entered actual value',
      description: 'Actual value looks strong, but supporting evidence is missing or weak.',
      submissions: submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0),
    },
    {
      label: 'KPIs where analysis is weak, missing, or unclear',
      description: 'Analysis needs clearer interpretation before submission.',
      submissions: submissions.filter((submission) => hasGenericText(getAnswer(submission, 'analysis')) || !getAnswer(submission, 'analysis')),
    },
    {
      label: 'KPIs where challenges are missing or not specific',
      description: 'Challenge narrative should explain blockers, dependencies, and ownership.',
      submissions: submissions.filter((submission) => hasGenericText(getAnswer(submission, 'challenge')) || !getAnswer(submission, 'challenge')),
    },
    {
      label: 'KPIs where recommendations are missing or generic',
      description: 'Recommendations should include specific corrective action and follow-up.',
      submissions: submissions.filter((submission) => hasGenericText(getAnswer(submission, 'recommendation')) || !getAnswer(submission, 'recommendation')),
    },
    {
      label: 'KPIs that may need better wording before submission',
      description: 'AI quality score indicates the response wording can be improved.',
      submissions: submissions.filter((submission) => aiReviewScore(submission) < 70),
    },
  ]
  const totalWarnings = rows.reduce((sum, row) => sum + row.submissions.length, 0)

  return (
    <article className="ai-panel relative overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="ai-icon h-14 w-14">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="ai-heading text-xl">AI assistance before submission</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              AI-supported quality warnings before submitting to Performance Team.
            </p>
          </div>
        </div>
        <div className="ai-chip">{totalWarnings} warnings</div>
      </div>
      <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, index) => (
          <motion.div
            className="ai-surface group flex flex-col p-3 transition hover:-translate-y-0.5 hover:border-[var(--ai)]"
            key={row.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-[13px] font-extrabold leading-5 text-text">{row.label}</p>
              <span className="rounded-full px-2 py-0.5 font-mono text-xs font-extrabold" style={{ backgroundColor: 'color-mix(in srgb, var(--ai) 12%, transparent)', color: 'var(--ai-strong)' }}>{row.submissions.length}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{row.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.submissions.slice(0, 8).map((submission) => (
                <Link
                  className="rounded-full border border-[var(--ai-border)] bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                  key={submission.id}
                  to={`/kpis/${submission.kpiId}/fill`}
                >
                  {kpiIdLabel(submission.kpiId)}
                </Link>
              ))}
              {!row.submissions.length ? <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted dark:bg-white/5">No affected KPIs</span> : null}
            </div>
          </motion.div>
        ))}
      </div>
    </article>
  )
}

function RadarPanel({ submissions, className = '' }: { submissions: KpiSubmission[]; className?: string }) {
  const visibleKpiIds = new Set(submissions.map((submission) => submission.kpiId))
  const kpis = mockApi.getKpis().filter((kpi) => visibleKpiIds.has(kpi.id))
  const categories = Array.from(new Set(kpis.map((kpi) => kpi.category)))
  const radarData = categories.map((category) => {
    const categoryKpis = kpis.filter((kpi) => kpi.category === category)
    return {
      category,
      KPIs: categoryKpis.length,
    }
  })
  const maxCount = Math.max(1, ...radarData.map((row) => row.KPIs))

  return (
    <article className={`card p-5 transition hover:shadow-premium ${className}`}>
      <div className="mb-4"><h2 className="text-xl">KPI Count Dimension-wise</h2></div>
      <div className="h-[300px]">
        <ResponsiveRadar
          data={radarData}
          keys={['KPIs']}
          indexBy="category"
          maxValue={maxCount}
          margin={{ top: 40, right: 70, bottom: 40, left: 70 }}
          borderColor="var(--primary)"
          gridLabelOffset={22}
          colors={['var(--primary)']}
          fillOpacity={0.18}
          dotSize={7}
          dotColor="var(--primary)"
          theme={{ text: { fill: 'var(--text-muted)', fontSize: 11 }, grid: { line: { stroke: 'var(--border)', strokeDasharray: '3 4' } } }}
          motionConfig="gentle"
        />
      </div>
    </article>
  )
}

function TargetActualPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const submitted = submissions.filter((submission) => submission.actualScore !== undefined)
  const averageTarget = Math.round(submissions.reduce((sum, submission) => sum + submission.targetScore, 0) / Math.max(1, submissions.length))
  const averageActual = Math.round(submitted.reduce((sum, submission) => sum + (submission.actualScore ?? 0), 0) / Math.max(1, submitted.length))
  const achievement = Math.round((averageActual / Math.max(1, averageTarget)) * 100)
  const chartData = [
    { label: 'Target', score: averageTarget },
    { label: 'Actual', score: averageActual },
  ]

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Target vs actual score</h2>
          <p className="mt-2 text-sm text-muted">Cycle target is set once by Admin; focal points enter actual score per KPI.</p>
        </div>
        <span className="status-pill border-primary/15 bg-primary-tint text-primary">{achievement}% achieved</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="font-display text-4xl font-extrabold">{averageTarget}</p>
          <p className="mt-1 text-xs font-semibold text-muted">Avg target</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="font-display text-4xl font-extrabold">{averageActual}</p>
          <p className="mt-1 text-xs font-semibold text-muted">Avg actual</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="font-display text-4xl font-extrabold">{submitted.length}</p>
          <p className="mt-1 text-xs font-semibold text-muted">Scored KPIs</p>
        </div>
      </div>
      <div className="mt-5 h-[220px]">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
            <Bar dataKey="score" fill="var(--primary)" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

function ChartRow({ submissions, showRadar = true }: { submissions: KpiSubmission[]; showRadar?: boolean }) {
  const visibleKpiIds = new Set(submissions.map((submission) => submission.kpiId))
  const visibleKpis = mockApi.getKpis().filter((kpi) => visibleKpiIds.has(kpi.id))
  const visibleDepartmentIds = new Set(visibleKpis.map((kpi) => kpi.departmentId))
  const departments = mockApi.getDepartments().filter((department) => visibleDepartmentIds.has(department.id))
  const lineData = submissions.slice(0, 14).map((submission, index) => ({ day: `D${index + 1}`, count: 40 + (submission.actualScore ?? index * 4) }))

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-2">
        <TargetActualPanel submissions={submissions} />
        <article className="card p-5 transition hover:shadow-premium">
          <div className="mb-4"><h2 className="text-xl">KPI submissions over time</h2></div>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <AreaChart data={lineData}>
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary-tint)" strokeWidth={3} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        {showRadar ? <RadarPanel submissions={submissions} className="xl:col-span-2" /> : null}
      </section>
      <section className="grid gap-5 xl:grid-cols-3">
        <ScoreDistributionPanel submissions={submissions} />
        <DepartmentStatusPanel submissions={submissions} departments={departments} />
        <ActivityPanel submissions={submissions} />
      </section>
    </>
  )
}

function PerformanceTrendPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const lineData = submissions.slice(0, 14).map((submission, index) => ({ day: `D${index + 1}`, count: 40 + (submission.actualScore ?? index * 4) }))
  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4"><h2 className="text-xl">KPI submissions over time</h2></div>
      <div className="h-[300px]">
        <ResponsiveContainer>
          <AreaChart data={lineData}>
            <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
            <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary-tint)" strokeWidth={3} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

function ScoreDistributionPanel({ submissions, title = 'KPI score distribution' }: { submissions: KpiSubmission[]; title?: string }) {
  const total = Math.max(1, submissions.length)
  const bandRows = scoreBands.map((band) => {
    const count = submissions.filter((submission) => band.test(submission.actualScore)).length
    return { ...band, count, percent: Math.round((count / total) * 100) }
  })
  const average = Math.round(submissions.reduce((sum, submission) => sum + (submission.actualScore ?? 0), 0) / total)

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">{title}</h2>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-right">
          <p className="font-display text-3xl font-extrabold">{average}%</p>
          <p className="text-xs text-muted">Avg score</p>
        </div>
      </div>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-raised">
        {bandRows.map((band) => (
          <motion.div
            className="h-full transition-opacity hover:opacity-80"
            key={band.label}
            initial={{ width: 0 }}
            animate={{ width: `${band.percent}%` }}
            transition={{ duration: 0.45 }}
            style={{ backgroundColor: band.color }}
            title={`${band.label}: ${band.count}`}
          />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {bandRows.map((band, index) => (
          <motion.div
            className="group rounded-2xl border border-border bg-surface-raised p-3 transition hover:-translate-y-0.5 hover:border-primary/30"
            key={band.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: band.color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold transition group-hover:text-primary">{band.label}</p>
                  <p className="text-xs text-muted">{band.range}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold">{band.count}</p>
                <p className="text-xs text-muted">{band.percent}%</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-tint">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${band.percent}%` }}
                transition={{ delay: index * 0.035, duration: 0.4 }}
                style={{ backgroundColor: band.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </article>
  )
}

function KpiPerformancePanel({ submissions }: { submissions: KpiSubmission[] }) {
  const scored = submissions.filter((submission) => submission.actualScore !== undefined)
  const belowTarget = scored.filter((submission) => (submission.actualScore ?? 0) < submission.targetScore)
  const targetMet = scored.filter((submission) => (submission.actualScore ?? 0) >= submission.targetScore)
  const increasing = scored.filter((submission) => aiReviewScore(submission) >= 82)
  const decreasing = scored.filter((submission) => aiReviewScore(submission) < 70)
  const rankedByDistance = scored
    .map((submission) => ({
      submission,
      distance: Math.abs((submission.actualScore ?? 0) - submission.targetScore),
    }))
    .sort((a, b) => a.distance - b.distance)
  const closest = rankedByDistance[0]?.submission
  const furthest = rankedByDistance[rankedByDistance.length - 1]?.submission
  const rows = [
    { label: 'Below Target', value: belowTarget.length, icon: Target, tone: 'text-danger', bg: 'bg-danger/10', color: 'var(--danger)', hint: 'Actual score is below assigned target.' },
    { label: 'Target Met', value: targetMet.length, icon: CheckCircle2, tone: 'text-success', bg: 'bg-success/10', color: 'var(--success)', hint: 'Actual score met or exceeded target.' },
    { label: 'Increasing Trend', value: increasing.length, icon: TrendingUp, tone: 'text-info', bg: 'bg-info/10', color: 'var(--info)', hint: 'AI review score indicates improving quality.' },
    { label: 'Decreasing Trend', value: decreasing.length, icon: Activity, tone: 'text-warning', bg: 'bg-warning/10', color: 'var(--warning)', hint: 'AI review score indicates declining quality.' },
    { label: 'Closest to Target', value: closest ? 1 : 0, icon: Eye, tone: 'text-primary', bg: 'bg-primary-tint', color: 'var(--primary)', hint: closest ? `${shortKpiId(closest.kpiId)} is nearest to target.` : 'No scored KPI available.' },
    { label: 'Furthest from Target', value: furthest ? 1 : 0, icon: BarChart3, tone: 'text-danger', bg: 'bg-danger/10', color: '#7F1D1D', hint: furthest ? `${shortKpiId(furthest.kpiId)} has the widest target gap.` : 'No scored KPI available.' },
  ]
  const segmentTotal = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0))

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">KPI Performance</h2>
        </div>
        <span className="status-pill border-primary/15 bg-primary-tint text-primary">{submissions.length} KPIs</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-raised">
        {rows.filter((row) => row.value > 0).map((row, index) => (
          <motion.div
            className="h-full"
            key={row.label}
            initial={{ width: 0 }}
            animate={{ width: `${(row.value / segmentTotal) * 100}%` }}
            transition={{ delay: index * 0.035, duration: 0.45 }}
            style={{ backgroundColor: row.color }}
            title={`${row.label}: ${row.value}`}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map((row, index) => {
          const Icon = row.icon
          return (
            <motion.div
              className="group rounded-2xl border border-border bg-surface-raised p-3 transition hover:-translate-y-0.5 hover:border-primary/30"
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
              title={row.hint}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-text transition group-hover:text-primary">{row.label}</p>
                  <p className={`mt-2 font-display text-3xl font-extrabold leading-none ${row.tone}`}>{row.value}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${row.bg} ${row.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 line-clamp-1 text-xs font-medium text-muted">{row.hint}</p>
            </motion.div>
          )
        })}
      </div>
    </article>
  )
}

function DepartmentStatusPanel({ submissions, departments }: { submissions: KpiSubmission[]; departments: ReturnType<typeof mockApi.getDepartments> }) {
  const [page, setPage] = useState(0)
  const rows = departments.map((department) => {
    const departmentSubmissions = submissions.filter((submission) => mockApi.getKpi(submission.kpiId)?.departmentId === department.id)
    const total = departmentSubmissions.length
    const completed = departmentSubmissions.filter((submission) => ['director_approved', 'published'].includes(submission.status)).length
    const clarification = departmentSubmissions.filter((submission) => submission.status.includes('clarification')).length
    const progress = Math.round((completed / Math.max(1, total)) * 100)
    const score = Math.round(departmentSubmissions.reduce((sum, submission) => sum + (submission.actualScore ?? 0), 0) / Math.max(1, total))
    return { department, total, completed, clarification, progress, score }
  })
  const pageSize = 3
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Status overview</h2>
        </div>
        <span className="status-pill border-primary/15 bg-primary-tint text-primary">{rows.length} visible</span>
      </div>
      <div className="space-y-2">
        {visibleRows.map((row, index) => (
          <motion.div
            className="group rounded-2xl border border-border bg-surface-raised p-3 transition hover:-translate-y-0.5 hover:border-primary/30"
            key={row.department.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold transition group-hover:text-primary">{row.department.name}</p>
                <p className="mt-1 text-xs text-muted">{row.completed}/{row.total} approved or published</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-extrabold">{row.score}%</p>
                <p className="text-xs text-muted">score</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${row.progress}%` }}
                transition={{ delay: index * 0.04, duration: 0.45 }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">Progress {row.progress}%</span>
              <span className={row.clarification ? 'font-semibold text-warning' : 'font-semibold text-success'}>
                {row.clarification ? `${row.clarification} clarification` : 'Clear'}
              </span>
            </div>
          </motion.div>
        ))}
        {!rows.length ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
            No department records are visible for this role and cycle.
          </div>
        ) : null}
      </div>
      {rows.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="font-mono text-xs text-muted">Page {page + 1} / {pageCount}</p>
          <div className="flex gap-2">
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button" aria-label="Previous departments">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} type="button" aria-label="Next departments">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function ActivityPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const recent = submissions.flatMap((submission) => submission.history).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4)
  const titleCaseStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Recent activity</h2>
        </div>
        <span className="status-pill border-border bg-surface-raised text-muted">{recent.length}</span>
      </div>
      <div className="space-y-2">
        {recent.map((event) => (
          <div className="group flex gap-3 rounded-2xl border border-border bg-surface-raised p-3 transition hover:border-primary/30" key={event.id}>
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold transition group-hover:text-primary">{titleCaseStatus(event.toStatus)}</p>
                <p className="shrink-0 font-mono text-[10px] text-muted">{new Date(event.timestamp).toLocaleDateString()}</p>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted">{event.note}</p>
            </div>
          </div>
        ))}
        {!recent.length ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
            No activity is available for this role and cycle.
          </div>
        ) : null}
      </div>
    </article>
  )
}

function departmentRows(departments: Department[], kpis: Kpi[], submissions: KpiSubmission[]) {
  return departments.map((department) => {
    const departmentKpis = kpis.filter((kpi) => kpi.departmentId === department.id)
    const departmentSubmissions = submissions.filter((submission) => departmentKpis.some((kpi) => kpi.id === submission.kpiId))
    const approved = departmentSubmissions.filter((submission) => ['director_approved', 'published'].includes(submission.status)).length
    const pending = departmentKpis.length - approved
    const score = Math.round(departmentSubmissions.reduce((sum, submission) => sum + (submission.actualScore ?? 0), 0) / Math.max(1, departmentSubmissions.length))
    return { department, kpiCount: departmentKpis.length, submitted: departmentSubmissions.length, approved, pending, score }
  })
}

function DepartmentPortfolioPanel({
  title,
  eyebrow,
  departments,
  kpis,
  submissions,
}: {
  title: string
  eyebrow: string
  departments: Department[]
  kpis: Kpi[]
  submissions: KpiSubmission[]
}) {
  void eyebrow
  const [page, setPage] = useState(0)
  const rows = departmentRows(departments, kpis, submissions)
  const pageSize = 4
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">{title}</h2>
        </div>
        <span className="status-pill border-primary/15 bg-primary-tint text-primary">{rows.length} departments</span>
      </div>
      <div className="space-y-2">
        {visibleRows.map((row, index) => {
          const progress = Math.round((row.approved / Math.max(1, row.kpiCount)) * 100)
          return (
            <motion.div
              className="group rounded-2xl border border-border bg-surface-raised p-3 transition hover:-translate-y-0.5 hover:border-primary/30"
              key={row.department.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold transition group-hover:text-primary">{row.department.name}</p>
                  <p className="mt-1 text-xs text-muted">{row.kpiCount} KPIs · {row.submitted} submissions · {row.pending} pending</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold">{row.score}%</p>
                  <p className="text-xs text-muted">avg score</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
      {rows.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="font-mono text-xs text-muted">Page {page + 1} / {pageCount}</p>
          <div className="flex gap-2">
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button" aria-label="Previous portfolio page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} type="button" aria-label="Next portfolio page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function DepartmentKpiRadarPanel({ departments, kpis, submissions, title }: { departments: Department[]; kpis: Kpi[]; submissions: KpiSubmission[]; title: string }) {
  const rows = departmentRows(departments, kpis, submissions)
  const maxValue = Math.max(5, ...rows.map((row) => row.kpiCount))
  const radarData = rows.map((row) => ({
    department: row.department.name.replace('Financial Performance', 'Financial').replace('Service Transformation', 'Service'),
    KPIs: row.kpiCount,
  }))

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4">
        <h2 className="text-xl">{title}</h2>
      </div>
      <div className="h-[340px]">
        <ResponsiveRadar
          data={radarData}
          keys={['KPIs']}
          indexBy="department"
          maxValue={maxValue}
          margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
          borderColor="var(--primary)"
          colors={['var(--primary)']}
          fillOpacity={0.18}
          borderWidth={2}
          dotSize={7}
          dotColor="var(--primary)"
          gridLabelOffset={26}
          theme={{ text: { fill: 'var(--text-muted)', fontSize: 11 }, grid: { line: { stroke: 'var(--border)', strokeDasharray: '3 4' } } }}
          motionConfig="gentle"
        />
      </div>
    </article>
  )
}

function SectorCoverageChart({ submissions }: { submissions: KpiSubmission[] }) {
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const kpis = mockApi.getCycleKpis(useAppStore.getState().activeCycleId)
  const data = sectors.map((sector) => {
    const sectorDepartmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
    const sectorKpis = kpis.filter((kpi) => sectorDepartmentIds.has(kpi.departmentId))
    const sectorSubmissions = submissions.filter((submission) => sectorKpis.some((kpi) => kpi.id === submission.kpiId))
    return {
      sector: sector.name.replace('Government', 'Gov.'),
      KPIs: sectorKpis.length,
      Published: sectorSubmissions.filter((submission) => submission.status === 'published').length,
      Approved: sectorSubmissions.filter((submission) => submission.status === 'director_approved').length,
    }
  })

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4">
        <h2 className="text-xl">Sectors, departments, and KPI volume</h2>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="sector" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
            <Bar dataKey="KPIs" fill={tones[0]} radius={[8, 8, 0, 0]} />
            <Bar dataKey="Published" fill={tones[3]} radius={[8, 8, 0, 0]} />
            <Bar dataKey="Approved" fill={tones[4]} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

type DgeBand = 'met' | 'risk' | 'below' | 'noData'

function dgeKpiScore(submission?: KpiSubmission) {
  if (!submission || submission.actualScore === undefined) return undefined
  return Math.round((submission.actualScore / Math.max(1, submission.targetScore)) * 100)
}

function dgeBand(score?: number): DgeBand {
  if (score === undefined) return 'noData'
  if (score >= 100) return 'met'
  if (score >= 80) return 'risk'
  return 'below'
}

function dgeBandLabel(band: DgeBand) {
  if (band === 'met') return 'Met / Exceeded'
  if (band === 'risk') return 'At Risk'
  if (band === 'below') return 'Below Target'
  return 'No Data'
}

function dgeBandClasses(band: DgeBand) {
  if (band === 'met') return 'bg-success/10 text-success'
  if (band === 'risk') return 'bg-warning/10 text-warning'
  if (band === 'below') return 'bg-danger/10 text-danger'
  return 'bg-surface-raised text-muted'
}

function dgeKpiCode(id: string) {
  const numeric = Number(id.replace(/\D/g, '')) || 0
  return `DGE25${String(numeric).padStart(3, '0')}`
}

function dgeAggregate(submissions: KpiSubmission[]) {
  const scores = submissions.map((submission) => dgeKpiScore(submission)).filter((score): score is number => score !== undefined)
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
  return {
    average,
    count: submissions.length,
    met: submissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'met').length,
    risk: submissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'risk').length,
    below: submissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'below').length,
    noData: submissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'noData').length,
  }
}

function dgeTrendValues(score?: number, seed = 0) {
  const base = score ?? 62
  return [0, 1, 2, 3].map((step) => Math.max(20, Math.min(130, base - 12 + step * 5 + ((seed + step) % 3) * 3)))
}

function DgeMiniSparkline({ values, tone = 'var(--primary)' }: { values: number[]; tone?: string }) {
  const max = Math.max(...values, 100)
  const points = values.map((value, index) => `${index * 32},${30 - (value / max) * 24 + 4}`).join(' ')
  return (
    <svg className="h-9 w-24 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {values.map((value, index) => (
        <circle key={`${value}-${index}`} cx={index * 32} cy={30 - (value / max) * 24 + 4} r="2.5" fill={tone} />
      ))}
    </svg>
  )
}

function DgeCircularScore({ value, label, size = 86 }: { value: number; label: string; size?: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ height: size, width: size }}>
        <svg className="-rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--surface-raised)" strokeWidth="5" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeLinecap="round"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-sm font-extrabold text-primary">{value}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-extrabold text-text">{label}</p>
        <p className="mt-1 text-xs font-semibold text-muted">Average performance</p>
      </div>
    </div>
  )
}

function DgeAnalyticMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  index,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  index: number
}) {
  return (
    <motion.article
      className="group rounded-[22px] border border-border bg-surface p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold leading-5 text-text">{label}</p>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" style={{ backgroundColor: `${tone}18`, color: tone }}>
          <Icon className="h-5 w-5 transition duration-300 group-hover:scale-110" />
        </div>
      </div>
    </motion.article>
  )
}

function DgeAiSummaryPanel({ submissions, sectorName }: { submissions: KpiSubmission[]; sectorName?: string }) {
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const kpis = mockApi.getKpis()
  const metrics = dgeAggregate(submissions)
  const sectorRows = sectors.map((sector) => {
    const departmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
    const kpiIds = new Set(kpis.filter((kpi) => departmentIds.has(kpi.departmentId)).map((kpi) => kpi.id))
    const sectorSubmissions = submissions.filter((submission) => kpiIds.has(submission.kpiId))
    return { sector, metrics: dgeAggregate(sectorSubmissions) }
  }).filter((row) => row.metrics.count)
  const strongest = [...sectorRows].sort((a, b) => b.metrics.average - a.metrics.average)[0]
  const weakest = [...sectorRows].sort((a, b) => a.metrics.average - b.metrics.average)[0]

  return (
    <article className="ai-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="ai-icon h-14 w-14">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="ai-heading text-xl">AI enterprise performance summary</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
              {sectorName
                ? `${sectorName} is averaging ${metrics.average}% with ${metrics.met} met or exceeded KPI records and ${metrics.below} below target.`
                : `DGE performance is ${metrics.average}% across the selected cycle. ${strongest?.sector.name ?? 'The leading sector'} is currently strongest, while ${weakest?.sector.name ?? 'one sector'} needs management attention.`}
            </p>
          </div>
        </div>
        <div className="ai-chip">{metrics.below + metrics.risk} attention items</div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { label: 'Strongest sector', value: strongest ? `${strongest.sector.name} (${strongest.metrics.average}%)` : 'No scored sector' },
          { label: 'Needs attention', value: weakest ? `${weakest.sector.name} (${weakest.metrics.below} below target)` : 'No attention item' },
          { label: 'AI signal', value: `${metrics.noData} no-data KPI records` },
        ].map((item) => (
          <div className="ai-surface p-4" key={item.label}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{item.label}</p>
            <p className="mt-2 text-sm font-extrabold text-text">{item.value}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

export function LegacyDirectorGeneralAnalyticDashboard() {
  const { activeCycleId } = useAppStore.getState()
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [attention, setAttention] = useState<'all' | 'below' | 'risk' | 'noData' | 'ai'>('all')
  const [expandedKpiId, setExpandedKpiId] = useState('')
  const [question, setQuestion] = useState('Summarize enterprise performance')

  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const cycleKpis = mockApi.getCycleKpis(activeCycleId)
  const submissions = mockApi.getSubmissions().filter((submission) => submission.cycleId === activeCycleId)
  const currentSectorId = selectedSectorId || sectors[0]?.id || ''
  const currentSector = sectors.find((sector) => sector.id === currentSectorId)
  const scopedDepartmentIds = new Set(
    departments
      .filter((department) => !currentSectorId || department.sectorId === currentSectorId)
      .filter((department) => !selectedDepartmentId || department.id === selectedDepartmentId)
      .map((department) => department.id),
  )
  const scopedKpis = cycleKpis.filter((kpi) => !currentSectorId || scopedDepartmentIds.has(kpi.departmentId))
  const scopedKpiIds = new Set(scopedKpis.map((kpi) => kpi.id))
  const scopedSubmissions = submissions.filter((submission) => scopedKpiIds.has(submission.kpiId))
  const metrics = dgeAggregate(submissions)
  const scopedMetrics = dgeAggregate(scopedSubmissions)

  const sectorRows = sectors.map((sector, index) => {
    const sectorDepartmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
    const sectorKpiIds = new Set(cycleKpis.filter((kpi) => sectorDepartmentIds.has(kpi.departmentId)).map((kpi) => kpi.id))
    const sectorSubmissions = submissions.filter((submission) => sectorKpiIds.has(submission.kpiId))
    const sectorMetrics = dgeAggregate(sectorSubmissions)
    return { sector, metrics: sectorMetrics, trend: dgeTrendValues(sectorMetrics.average, index) }
  })

  const departmentRows = departments
    .filter((department) => department.sectorId === currentSectorId)
    .map((department, index) => {
      const departmentKpiIds = new Set(cycleKpis.filter((kpi) => kpi.departmentId === department.id).map((kpi) => kpi.id))
      const departmentSubmissions = submissions.filter((submission) => departmentKpiIds.has(submission.kpiId))
      const departmentMetrics = dgeAggregate(departmentSubmissions)
      return { department, metrics: departmentMetrics, trend: dgeTrendValues(departmentMetrics.average, index + 2) }
    })

  const kpiRows = scopedKpis.map((kpi, index) => {
    const submission = scopedSubmissions.find((item) => item.kpiId === kpi.id)
    const score = dgeKpiScore(submission)
    const band = dgeBand(score)
    const aiScore = submission ? aiReviewScore(submission) : 0
    const tags = [
      band === 'below' ? 'Below target' : undefined,
      band === 'risk' ? 'Close to target' : undefined,
      band === 'noData' ? 'No data' : undefined,
      submission && submission.attachments.length === 0 ? 'Evidence risk' : undefined,
      submission && aiScore < 70 ? 'Weak narrative' : undefined,
    ].filter((tag): tag is string => Boolean(tag))
    return { kpi, submission, score, band, aiScore, tags, trend: dgeTrendValues(score, index) }
  }).filter((row) => {
    if (attention === 'all') return true
    if (attention === 'ai') return row.tags.some((tag) => ['Evidence risk', 'Weak narrative'].includes(tag))
    return row.band === attention
  })

  const answer = (() => {
    const below = kpiRows.filter((row) => row.band === 'below').slice(0, 3)
    if (question.toLowerCase().includes('below')) {
      return below.length ? `${below.map((row) => row.kpi.name).join(', ')} need immediate review.` : 'No below-target KPIs are visible in the current filter.'
    }
    if (question.toLowerCase().includes('sector')) {
      const strongest = [...sectorRows].sort((a, b) => b.metrics.average - a.metrics.average)[0]
      return `${strongest?.sector.name ?? 'The selected sector'} is leading with an average score of ${strongest?.metrics.average ?? 0}%.`
    }
    return `The selected view contains ${scopedSubmissions.length} KPI records, averaging ${scopedMetrics.average}%, with ${scopedMetrics.met} met/exceeded and ${scopedMetrics.below} below target.`
  })()

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1 text-xs font-extrabold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Director General Analytics
            </div>
            <h1 className="mt-4 text-[34px] leading-tight">DGE KPI performance command center</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
              Organization-wide KPI performance, sector comparisons, attention risks, AI-assisted explanations, and drill-down KPI records for the selected cycle.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Sectors</p><p className="font-display text-lg font-extrabold">{sectors.length}</p></div>
            <div className="card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Departments</p><p className="font-display text-lg font-extrabold">{departments.length}</p></div>
            <div className="card px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">KPI Records</p><p className="font-display text-lg font-extrabold">{submissions.length}</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DgeAnalyticMetric label="Average Score" value={`${metrics.average}%`} detail="Across scored KPI records" icon={TrendingUp} tone={tones[0]} index={0} />
        <DgeAnalyticMetric label="KPI Records" value={metrics.count} detail="Current cycle" icon={Target} tone={tones[1]} index={1} />
        <DgeAnalyticMetric label="Met / Exceeded" value={metrics.met} detail="Score 100% or above" icon={CheckCircle2} tone="#4A9D5C" index={2} />
        <DgeAnalyticMetric label="At Risk" value={metrics.risk} detail="Score 80% to 99%" icon={Clock3} tone="#B68A35" index={3} />
        <DgeAnalyticMetric label="Below Target" value={metrics.below} detail="Score below 80%" icon={Activity} tone="#EA4F49" index={4} />
        <DgeAnalyticMetric label="No Data" value={metrics.noData} detail="Missing score" icon={FilePenLine} tone="#64748B" index={5} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <DgeAiSummaryPanel submissions={submissions} sectorName={currentSector?.name} />

          <article className="card p-5 transition hover:shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl">Sector performance</h2>
                <p className="mt-2 text-sm text-muted">Select a sector to compare departments and KPI details without leaving the DGE overview.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectors.map((sector) => (
                  <button
                    className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${currentSectorId === sector.id ? 'bg-primary text-white' : 'border border-border bg-surface-raised text-text hover:border-primary/40 hover:text-primary'}`}
                    key={sector.id}
                    onClick={() => { setSelectedSectorId(sector.id); setSelectedDepartmentId(''); setExpandedKpiId('') }}
                    type="button"
                  >
                    {sector.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
              <div className="space-y-2">
                {sectorRows.map((row) => (
                  <button
                    className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card ${currentSectorId === row.sector.id ? 'border-primary/40 bg-primary-tint' : 'border-border bg-surface-raised'}`}
                    key={row.sector.id}
                    onClick={() => { setSelectedSectorId(row.sector.id); setSelectedDepartmentId(''); setExpandedKpiId('') }}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{row.sector.name}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <DgeMiniSparkline values={row.trend} tone="var(--primary)" />
                        <p className="text-xs font-semibold text-muted">{row.metrics.count} records</p>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface font-mono text-sm font-extrabold text-primary shadow-soft">
                      {row.metrics.average}
                    </div>
                  </button>
                ))}
              </div>
              <div className="grid content-start gap-3">
                {departmentRows.map((row) => (
                  <button
                    className={`grid w-full gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card ${selectedDepartmentId === row.department.id ? 'border-primary/40 bg-primary-tint' : 'border-border bg-surface-raised'}`}
                    key={row.department.id}
                    onClick={() => { setSelectedDepartmentId(selectedDepartmentId === row.department.id ? '' : row.department.id); setExpandedKpiId('') }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{row.department.name}</p>
                        <p className="mt-1 text-xs text-muted">{row.metrics.count} KPI records · {row.metrics.below} below target</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${dgeBandClasses(dgeBand(row.metrics.average))}`}>{row.metrics.average}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-primary-tint">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(100, row.metrics.average)}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="card overflow-hidden">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl">{selectedDepartmentId ? `${departments.find((department) => department.id === selectedDepartmentId)?.name} KPIs` : 'Sector KPI grid'}</h2>
                  <p className="mt-2 text-sm text-muted">{kpiRows.length} KPI records shown. Expand a row for narrative and AI context.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All', count: scopedKpis.length, icon: Filter },
                    { id: 'below', label: 'Below Target', count: scopedSubmissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'below').length, icon: Activity },
                    { id: 'risk', label: 'At Risk', count: scopedSubmissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'risk').length, icon: Clock3 },
                    { id: 'noData', label: 'No Data', count: scopedSubmissions.filter((submission) => dgeBand(dgeKpiScore(submission)) === 'noData').length, icon: FilePenLine },
                    { id: 'ai', label: 'AI Flags', count: scopedSubmissions.filter((submission) => submission.attachments.length === 0 || aiReviewScore(submission) < 70).length, icon: Sparkles },
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition ${attention === tab.id ? 'bg-primary text-white' : tab.id === 'ai' ? 'ai-chip' : 'border border-border bg-surface-raised text-text hover:border-primary/40 hover:text-primary'}`}
                        key={tab.id}
                        onClick={() => setAttention(tab.id as typeof attention)}
                        type="button"
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                        <span className={attention === tab.id ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-xs' : 'rounded-full bg-surface px-1.5 py-0.5 text-xs'}>{tab.count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Score</th>
                    <th>Actual / Target</th>
                    <th>Status</th>
                    <th>Trend</th>
                    <th>AI Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiRows.map((row) => (
                    <Fragment key={row.kpi.id}>
                      <tr className="cursor-pointer transition hover:bg-primary-tint" key={row.kpi.id} onClick={() => setExpandedKpiId(expandedKpiId === row.kpi.id ? '' : row.kpi.id)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-tint text-xs font-extrabold text-primary">{expandedKpiId === row.kpi.id ? '-' : '+'}</span>
                            <div>
                              <p className="font-mono text-xs font-extrabold text-primary">{row.kpi.id.replace('kpi-', '').padStart(3, '0')}</p>
                              <p className="mt-1 font-bold">{row.kpi.name}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${dgeBandClasses(row.band)}`}>{row.score === undefined ? '-' : `${row.score}%`}</span></td>
                        <td className="font-mono text-sm font-semibold">{row.submission?.actualScore ?? '-'} / {row.submission?.targetScore ?? '-'}</td>
                        <td><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${dgeBandClasses(row.band)}`}>{dgeBandLabel(row.band)}</span></td>
                        <td><DgeMiniSparkline values={row.trend} tone={row.band === 'below' ? '#EA4F49' : 'var(--primary)'} /></td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {(row.tags.length ? row.tags : ['Stable']).map((tag) => <span className="ai-chip px-2 py-1 text-[11px]" key={tag}>{tag}</span>)}
                          </div>
                        </td>
                      </tr>
                      {expandedKpiId === row.kpi.id ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="grid gap-4 rounded-2xl border border-border bg-surface-raised p-4 lg:grid-cols-[0.9fr_1.1fr]">
                              <DgeAiSummaryPanel submissions={row.submission ? [row.submission] : []} />
                              <div className="grid gap-3">
                                <div>
                                  <h3 className="text-base">Analysis, challenges, and recommendations</h3>
                                  {row.kpi.questions.map((questionItem) => {
                                    const answer = row.submission?.answers.find((item) => item.questionId === questionItem.id)?.answer
                                    return <p className="mt-2 text-sm leading-6 text-muted" key={questionItem.id}><strong className="text-text">{questionItem.label}:</strong> {answer || 'No response entered.'}</p>
                                  })}
                                </div>
                                <div className="rounded-2xl border border-border bg-surface p-4">
                                  <h3 className="text-base">Performance Team Comment</h3>
                                  <p className="mt-2 text-sm leading-6 text-muted">{row.submission?.performanceTeamComment || 'No performance team comment recorded.'}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="ai-panel sticky top-24">
            <div className="flex items-start gap-3">
              <div className="ai-icon h-12 w-12">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="ai-heading text-lg">AI KPI assistant</h2>
                <p className="mt-1 text-xs leading-5 text-muted">Ask about sector movement, below-target KPIs, and enterprise summaries.</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--ai-border)] bg-white/80 p-3 dark:bg-white/5">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
                <MessageCircle className="h-4 w-4 text-[var(--ai)]" />
                <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about KPI performance..." />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Which sectors are below target?', 'Summarize enterprise performance', 'Which sector is strongest?'].map((prompt) => (
                  <button className="ai-chip text-left" key={prompt} onClick={() => setQuestion(prompt)} type="button">{prompt}</button>
                ))}
              </div>
            </div>
            <motion.div className="ai-surface mt-4 p-4" key={answer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ai)]" />
                <p className="text-sm leading-6 text-text">{answer}</p>
              </div>
            </motion.div>
          </article>

          <article className="card p-5 transition hover:shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg">Executive attention</h2>
                <p className="text-xs text-muted">Quick risk focus for the selected filter.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {[
                { label: 'Closest to target', value: kpiRows.filter((row) => row.score !== undefined && row.score >= 80 && row.score < 100).length },
                { label: 'Far from target', value: kpiRows.filter((row) => row.score !== undefined && row.score < 70).length },
                { label: 'AI review risk', value: kpiRows.filter((row) => row.aiScore < 70).length },
              ].map((item) => (
                <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised p-3" key={item.label}>
                  <span className="text-sm font-bold text-muted">{item.label}</span>
                  <span className="font-display text-xl font-extrabold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card p-5 transition hover:shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg">Selected scope trend</h2>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, index) => ({ quarter, score: dgeTrendValues(scopedMetrics.average, index)[index] }))}>
                  <XAxis dataKey="quarter" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" fill="var(--primary-tint)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}

export function DirectorGeneralAnalyticDashboard({ scope = 'enterprise' }: { scope?: 'enterprise' | 'sector' } = {}) {
  type AttentionFilter = 'all' | 'met' | 'risk' | 'below' | 'noData' | 'ai'
  type SortKey = 'score' | 'department' | 'sector' | 'status' | 'code'

  const { activeCycleId } = useAppStore.getState()
  const cycles = mockApi.getCycles()
  const initialCycle = cycles.find((cycle) => cycle.id === activeCycleId) ?? cycles[0]
  const initialYear = initialCycle?.startDate.slice(0, 4) ?? 'all'
  const initialQuarter = initialCycle ? `Q${Math.floor(new Date(initialCycle.startDate).getMonth() / 3) + 1}` : 'all'
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycle?.id ?? activeCycleId)
  const [yearFilter, setYearFilter] = useState(initialYear)
  const [quarterFilter, setQuarterFilter] = useState(initialQuarter)
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [attention, setAttention] = useState<AttentionFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [search, setSearch] = useState('')
  const [expandedKpiId, setExpandedKpiId] = useState('')
  const [question, setQuestion] = useState('Summarize enterprise performance')

  const activeCycle = cycles.find((cycle) => cycle.id === selectedCycleId) ?? mockApi.getActiveCycle()
  const currentUser = mockApi.getCurrentUser()
  const enterpriseScope = scope === 'enterprise' || currentUser.role === 'director_general'
  const allSectors = mockApi.getSectors()
  const allDepartments = mockApi.getDepartments()
  const sectors = enterpriseScope ? allSectors : allSectors.filter((sector) => sector.id === currentUser.sectorId)
  const sectorIds = new Set(sectors.map((sector) => sector.id))
  const departments = allDepartments.filter((department) => sectorIds.has(department.sectorId))
  const departmentIds = new Set(departments.map((department) => department.id))
  const users = mockApi.getUsers()
  const cycleKpis = mockApi.getCycleKpis(activeCycle?.id ?? selectedCycleId).filter((kpi) => departmentIds.has(kpi.departmentId))
  const cycleKpiIds = new Set(cycleKpis.map((kpi) => kpi.id))
  const submissions = mockApi.getSubmissions().filter((submission) => submission.cycleId === (activeCycle?.id ?? selectedCycleId) && cycleKpiIds.has(submission.kpiId))
  const submissionByKpi = new Map(submissions.map((submission) => [submission.kpiId, submission]))
  const metrics = dgeAggregate(submissions)
  const currentSectorId = selectedSectorId
  const currentSector = sectors.find((sector) => sector.id === currentSectorId)
  const sectorDepartments = currentSectorId ? departments.filter((department) => department.sectorId === currentSectorId) : []
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId)
  const visibleDepartmentIds = new Set(
    departments
      .filter((department) => !currentSectorId || department.sectorId === currentSectorId)
      .filter((department) => !selectedDepartmentId || department.id === selectedDepartmentId)
      .map((department) => department.id),
  )
  const scopedKpis = cycleKpis.filter((kpi) => visibleDepartmentIds.has(kpi.departmentId))
  const scopedKpiIds = new Set(scopedKpis.map((kpi) => kpi.id))
  const scopedSubmissions = submissions.filter((submission) => scopedKpiIds.has(submission.kpiId))
  const scopedMetrics = dgeAggregate(scopedSubmissions)

  const sectorRows = sectors.map((sector, index) => {
    const departmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
    const sectorKpis = cycleKpis.filter((kpi) => departmentIds.has(kpi.departmentId))
    const sectorKpiIds = new Set(sectorKpis.map((kpi) => kpi.id))
    const sectorSubmissions = submissions.filter((submission) => sectorKpiIds.has(submission.kpiId))
    const sectorMetrics = dgeAggregate(sectorSubmissions)
    return { sector, departments: departmentIds.size, kpis: sectorKpis.length, metrics: sectorMetrics, trend: dgeTrendValues(sectorMetrics.average, index + 1) }
  }).sort((a, b) => b.metrics.average - a.metrics.average)

  const departmentRows = sectorDepartments.map((department, index) => {
    const departmentKpis = cycleKpis.filter((kpi) => kpi.departmentId === department.id)
    const departmentKpiIds = new Set(departmentKpis.map((kpi) => kpi.id))
    const departmentSubmissions = submissions.filter((submission) => departmentKpiIds.has(submission.kpiId))
    const departmentMetrics = dgeAggregate(departmentSubmissions)
    return { department, kpis: departmentKpis.length, metrics: departmentMetrics, trend: dgeTrendValues(departmentMetrics.average, index + 3) }
  }).sort((a, b) => b.metrics.average - a.metrics.average)

  const availableYears = Array.from(new Set(cycles.map((cycle) => cycle.startDate.slice(0, 4)))).sort()
  const quarterForCycle = (cycle: Cycle) => `Q${Math.floor(new Date(cycle.startDate).getMonth() / 3) + 1}`
  const filteredCycles = cycles.filter((cycle) => (yearFilter === 'all' || cycle.startDate.startsWith(yearFilter)) && (quarterFilter === 'all' || quarterForCycle(cycle) === quarterFilter))
  const cycleOptions = (filteredCycles.length ? filteredCycles : cycles).map((cycle) => ({ value: cycle.id, label: `${cycle.label} · ${cycle.startDate} to ${cycle.endDate}` }))
  const yearOptions = [{ value: 'all', label: 'All years' }, ...availableYears.map((year) => ({ value: year, label: year }))]
  const quarterOptions = ['all', 'Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({ value: quarter, label: quarter === 'all' ? 'All quarters' : quarter }))

  const tableRows = scopedKpis.map((kpi, index) => {
    const submission = submissionByKpi.get(kpi.id)
    const department = departments.find((item) => item.id === kpi.departmentId)
    const sector = sectors.find((item) => item.id === department?.sectorId)
    const score = dgeKpiScore(submission)
    const band = dgeBand(score)
    const aiScore = submission ? aiReviewScore(submission) : 0
    const owner = users.find((user) => user.id === submission?.focalPointId)
    const tags = [
      band === 'below' ? 'Critical performance' : undefined,
      band === 'risk' ? 'Watch' : undefined,
      band === 'noData' ? 'No data' : undefined,
      submission && submission.attachments.length === 0 ? 'Evidence risk' : undefined,
      submission && aiScore < 70 ? 'AI quality risk' : undefined,
    ].filter((tag): tag is string => Boolean(tag))
    return { kpi, submission, department, sector, score, band, aiScore, owner, tags, trend: dgeTrendValues(score, index) }
  })

  const filteredRows = tableRows
    .filter((row) => {
      if (attention === 'all') return true
      if (attention === 'ai') return row.tags.some((tag) => ['Evidence risk', 'AI quality risk'].includes(tag))
      return row.band === attention
    })
    .filter((row) => {
      const needle = search.trim().toLowerCase()
      if (!needle) return true
      return [row.kpi.id, row.kpi.name, row.department?.name, row.sector?.name, row.owner?.name].some((value) => value?.toLowerCase().includes(needle))
    })
    .sort((a, b) => {
      if (sortKey === 'score') return (a.score ?? -1) - (b.score ?? -1)
      if (sortKey === 'department') return (a.department?.name ?? '').localeCompare(b.department?.name ?? '')
      if (sortKey === 'sector') return (a.sector?.name ?? '').localeCompare(b.sector?.name ?? '')
      if (sortKey === 'status') return dgeBandLabel(a.band).localeCompare(dgeBandLabel(b.band))
      return a.kpi.id.localeCompare(b.kpi.id)
    })

  const distribution = [
    { name: 'Met / Exceeded', value: metrics.met, color: '#4A9D5C' },
    { name: 'Watch', value: metrics.risk, color: '#B68A35' },
    { name: 'Critical', value: metrics.below, color: '#EA4F49' },
    { name: 'No Data', value: metrics.noData, color: '#94A3B8' },
  ]
  const trendData = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, index) => ({
    quarter,
    Enterprise: dgeTrendValues(metrics.average, index)[index],
    Selected: dgeTrendValues(scopedMetrics.average, index + 4)[index],
  }))
  const departmentComparison = departmentRows.map((row) => ({
    department: row.department.name.replace('Financial Performance', 'Financial').replace('Enterprise Architecture', 'Enterprise').replace('Strategic Procurement', 'Procurement'),
    Score: row.metrics.average,
    Critical: row.metrics.below,
  }))
  const answer = (() => {
    if (question.toLowerCase().includes('critical') || question.toLowerCase().includes('below')) {
      const critical = filteredRows.filter((row) => row.band === 'below').slice(0, 3)
      return critical.length ? `Critical KPI focus: ${critical.map((row) => row.kpi.name).join(', ')}.` : 'No critical KPI is visible in the current scope.'
    }
    if (question.toLowerCase().includes('sector')) {
      const strongest = sectorRows[0]
      return `${strongest?.sector.name ?? 'The leading sector'} is currently strongest at ${strongest?.metrics.average ?? 0}% with ${strongest?.metrics.met ?? 0} met/exceeded KPI records.`
    }
    return `${currentSector?.name ?? 'Enterprise overview'} is averaging ${scopedMetrics.average}% across ${scopedSubmissions.length} KPI records. ${scopedMetrics.below} records are critical and ${scopedMetrics.noData} have no data.`
  })()

  return (
    <div className="space-y-5">
      <section className="raised-card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1 text-xs font-extrabold text-primary">
              <ShieldCheck className="h-4 w-4" />
              {enterpriseScope ? 'Director General Analytics' : 'Executive Director Analytics'}
            </div>
            <h1 className="mt-2 text-[26px] leading-tight">{enterpriseScope ? 'DGE KPI performance command center' : 'Sector KPI performance command center'}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {enterpriseScope
                ? 'Enterprise KPI analytics across sectors, departments, targets, actuals, and risk signals for senior leadership.'
                : 'Sector KPI analytics across departments, targets, actuals, and risk signals for executive leadership.'}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:w-[650px]">
            <AppSelect
              value={yearFilter}
              onValueChange={(value) => {
                setYearFilter(value)
                const nextCycle = cycles.find((cycle) => (value === 'all' || cycle.startDate.startsWith(value)) && (quarterFilter === 'all' || quarterForCycle(cycle) === quarterFilter))
                if (nextCycle) setSelectedCycleId(nextCycle.id)
              }}
              options={yearOptions}
            />
            <AppSelect
              value={quarterFilter}
              onValueChange={(value) => {
                setQuarterFilter(value)
                const nextCycle = cycles.find((cycle) => (yearFilter === 'all' || cycle.startDate.startsWith(yearFilter)) && (value === 'all' || quarterForCycle(cycle) === value))
                if (nextCycle) setSelectedCycleId(nextCycle.id)
              }}
              options={quarterOptions}
            />
            <AppSelect value={activeCycle?.id ?? selectedCycleId} onValueChange={setSelectedCycleId} options={cycleOptions} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-muted">{activeCycle?.label ?? 'Selected cycle'}</span>
          <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-muted">{sectors.length} sectors</span>
          <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-muted">{departments.length} departments</span>
          <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-muted">{cycleKpis.length} KPI definitions</span>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
        <button className="text-primary transition hover:text-primary-hover" onClick={() => { setSelectedSectorId(''); setSelectedDepartmentId(''); setExpandedKpiId('') }} type="button">
          DGE overview
        </button>
        {currentSector ? (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-text">{currentSector.name}</span>
          </>
        ) : null}
        {selectedDepartment ? (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-text">{selectedDepartment.name}</span>
          </>
        ) : null}
      </nav>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DgeAnalyticMetric label="Average Score" value={`${metrics.average}%`} detail="Across scored records" icon={TrendingUp} tone={tones[0]} index={0} />
        <DgeAnalyticMetric label="KPI Records" value={metrics.count} detail="Current cycle" icon={Target} tone={tones[1]} index={1} />
        <DgeAnalyticMetric label="Met / Exceeded" value={metrics.met} detail="Score 100%+" icon={CheckCircle2} tone="#4A9D5C" index={2} />
        <DgeAnalyticMetric label="Watch" value={metrics.risk} detail="Score 80-99%" icon={Clock3} tone="#B68A35" index={3} />
        <DgeAnalyticMetric label="Critical" value={metrics.below} detail="Below 80%" icon={Activity} tone="#EA4F49" index={4} />
        <DgeAnalyticMetric label="No Data" value={metrics.noData} detail="Missing actual" icon={FilePenLine} tone="#64748B" index={5} />
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <article className="flex h-full flex-col rounded-[24px] bg-transparent p-0 shadow-none">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl">Sector performance portfolio</h2>
              <p className="mt-2 text-sm text-muted">Default view shows all sectors. Select a sector to open department analytics and KPI-level risk records.</p>
            </div>
            <button
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${!currentSectorId ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:border-primary/40 hover:text-primary'}`}
              onClick={() => { setSelectedSectorId(''); setSelectedDepartmentId(''); setExpandedKpiId('') }}
              type="button"
            >
              DGE overview
            </button>
          </div>
          <div className="grid flex-1 auto-rows-fr gap-4 lg:grid-cols-3">
            {sectorRows.map((row, index) => (
              <motion.button
                className={`group flex h-full flex-col rounded-[22px] border bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card ${currentSectorId === row.sector.id ? 'border-primary/45 ring-2 ring-primary/10' : 'border-border'}`}
                key={row.sector.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => { setSelectedSectorId(row.sector.id); setSelectedDepartmentId(''); setExpandedKpiId('') }}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold leading-6 text-text">{row.sector.name}</p>
                    <p className="mt-2 text-sm font-medium text-muted">Sector performance</p>
                  </div>
                  <span className={`rounded-full px-3 py-2 text-sm font-extrabold ${dgeBandClasses(dgeBand(row.metrics.average))}`}>{row.metrics.average}%</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1.5">
                  {row.trend.map((value, trendIndex) => (
                    <span
                      className={`h-10 rounded-md ${value >= row.metrics.average ? 'bg-success/25' : value >= 80 ? 'bg-warning/30' : 'bg-danger/20'}`}
                      key={`${row.sector.id}-${trendIndex}`}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className={`text-sm font-extrabold ${row.trend[3] >= row.trend[0] ? 'text-success' : 'text-danger'}`}>{row.trend[3] >= row.trend[0] ? 'Improving trend' : 'Declining trend'}</p>
                  <p className="text-sm font-medium text-muted">{row.metrics.count} KPI records</p>
                </div>
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-raised">
                  <span className="h-full bg-success" style={{ width: `${(row.metrics.met / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-warning" style={{ width: `${(row.metrics.risk / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-danger" style={{ width: `${(row.metrics.below / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-muted" style={{ width: `${(row.metrics.noData / Math.max(1, row.metrics.count)) * 100}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Met', value: row.metrics.met, className: 'text-success' },
                    { label: 'At Risk', value: row.metrics.risk, className: 'text-warning' },
                    { label: 'Below', value: row.metrics.below, className: 'text-danger' },
                    { label: 'No Data', value: row.metrics.noData, className: 'text-muted' },
                  ].map((item) => (
                    <div className="rounded-xl border border-border bg-surface-raised p-3" key={item.label}>
                      <p className={`font-display text-xl font-extrabold ${item.className}`}>{item.value}</p>
                      <p className="mt-1 text-xs font-medium text-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>
        </article>

        <article className="card h-full p-5 transition hover:shadow-card">
          <h2 className="text-xl">Performance distribution</h2>
          <p className="mt-2 text-sm text-muted">Score status mix across the selected cycle.</p>
          <div className="mt-4 h-[235px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {distribution.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {distribution.map((item) => (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-3 py-2" key={item.name}>
                <span className="flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="font-mono text-sm font-extrabold">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {currentSector ? (
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="card p-5 transition hover:shadow-card">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl">{currentSector?.name ?? 'Sector'} departments</h2>
              <p className="mt-2 text-sm text-muted">Cards update the KPI grid and comparison charts.</p>
            </div>
            {selectedDepartment ? <span className="status-pill border-primary/15 bg-primary-tint text-primary">{selectedDepartment.name}</span> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {departmentRows.map((row, index) => (
              <motion.button
                className={`rounded-[20px] border bg-surface p-3.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card ${selectedDepartmentId === row.department.id ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border'}`}
                key={row.department.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => { setSelectedDepartmentId(selectedDepartmentId === row.department.id ? '' : row.department.id); setExpandedKpiId('') }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-extrabold leading-5">{row.department.name}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{row.kpis} KPIs / {row.metrics.count} records</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${dgeBandClasses(dgeBand(row.metrics.average))}`}>{row.metrics.average}%</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1">
                  {row.trend.map((value, trendIndex) => (
                    <span
                      className={`h-7 rounded-md ${value >= row.metrics.average ? 'bg-success/25' : value >= 80 ? 'bg-warning/30' : 'bg-danger/20'}`}
                      key={`${row.department.id}-${trendIndex}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-raised">
                  <span className="h-full bg-success" style={{ width: `${(row.metrics.met / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-warning" style={{ width: `${(row.metrics.risk / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-danger" style={{ width: `${(row.metrics.below / Math.max(1, row.metrics.count)) * 100}%` }} />
                  <span className="h-full bg-muted" style={{ width: `${(row.metrics.noData / Math.max(1, row.metrics.count)) * 100}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  <span className="rounded-xl bg-success/10 px-2 py-2 text-center text-sm font-extrabold text-success">{row.metrics.met}<small className="block text-[10px] font-bold text-muted">Met</small></span>
                  <span className="rounded-xl bg-warning/10 px-2 py-2 text-center text-sm font-extrabold text-warning">{row.metrics.risk}<small className="block text-[10px] font-bold text-muted">Watch</small></span>
                  <span className="rounded-xl bg-danger/10 px-2 py-2 text-center text-sm font-extrabold text-danger">{row.metrics.below}<small className="block text-[10px] font-bold text-muted">Below</small></span>
                  <span className="rounded-xl bg-surface-raised px-2 py-2 text-center text-sm font-extrabold text-muted">{row.metrics.noData}<small className="block text-[10px] font-bold text-muted">No data</small></span>
                </div>
              </motion.button>
            ))}
          </div>
        </article>

        <article className="card p-5 transition hover:shadow-card">
          <h2 className="text-xl">Department comparison</h2>
          <p className="mt-2 text-sm text-muted">Average score and critical KPI count inside selected sector.</p>
          <div className="mt-4 h-[330px]">
            <ResponsiveContainer>
              <BarChart data={departmentComparison}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="department" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
                <Bar dataKey="Score" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Critical" fill="#EA4F49" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
      ) : (
      <section className="card p-5 transition hover:shadow-card">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl">Sector performance overview</h2>
            <p className="mt-2 text-sm text-muted">Enterprise-level sector performance for the selected cycle. Select any sector card above to drill into departments and KPI records.</p>
          </div>
          <span className="status-pill border-primary/15 bg-primary-tint text-primary">DGE Overview</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sectorRows.map((row, index) => (
            <motion.article
              className="rounded-[22px] border border-border bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card"
              key={row.sector.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <div className="flex items-start justify-between gap-4">
                <DgeCircularScore value={row.metrics.average} label={row.sector.name} />
                <button
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/40 hover:bg-primary-tint"
                  onClick={() => { setSelectedSectorId(row.sector.id); setSelectedDepartmentId(''); setExpandedKpiId('') }}
                  type="button"
                >
                  Drill down
                </button>
              </div>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-raised">
                <span className="h-full bg-success" style={{ width: `${(row.metrics.met / Math.max(1, row.metrics.count)) * 100}%` }} />
                <span className="h-full bg-warning" style={{ width: `${(row.metrics.risk / Math.max(1, row.metrics.count)) * 100}%` }} />
                <span className="h-full bg-danger" style={{ width: `${(row.metrics.below / Math.max(1, row.metrics.count)) * 100}%` }} />
                <span className="h-full bg-muted" style={{ width: `${(row.metrics.noData / Math.max(1, row.metrics.count)) * 100}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="rounded-xl bg-success/10 p-2 text-center"><p className="text-base font-extrabold text-success">{row.metrics.met}</p><p className="text-[10px] font-bold text-muted">Met</p></div>
                <div className="rounded-xl bg-warning/10 p-2 text-center"><p className="text-base font-extrabold text-warning">{row.metrics.risk}</p><p className="text-[10px] font-bold text-muted">Watch</p></div>
                <div className="rounded-xl bg-danger/10 p-2 text-center"><p className="text-base font-extrabold text-danger">{row.metrics.below}</p><p className="text-[10px] font-bold text-muted">Critical</p></div>
                <div className="rounded-xl bg-surface-raised p-2 text-center"><p className="text-base font-extrabold text-muted">{row.metrics.noData}</p><p className="text-[10px] font-bold text-muted">No data</p></div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="card p-5 transition hover:shadow-card">
          <h2 className="text-xl">Trend intelligence</h2>
          <p className="mt-2 text-sm text-muted">Enterprise trend compared with the selected sector or department scope.</p>
          <div className="mt-5 h-[295px]">
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <XAxis dataKey="quarter" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)' }} />
                <Area type="monotone" dataKey="Enterprise" stroke="#4A9D5C" fill="#4A9D5C22" strokeWidth={3} />
                <Area type="monotone" dataKey="Selected" stroke="var(--primary)" fill="var(--primary-tint)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ai-panel">
          <div className="flex items-start gap-3">
            <div className="ai-icon h-12 w-12">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="ai-heading text-lg">AI KPI assistant</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Context-aware executive answers for the current dashboard scope.</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--ai-border)] bg-white/80 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
              <MessageCircle className="h-4 w-4 text-[var(--ai)]" />
              <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about KPI performance..." />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Show critical KPIs', 'Summarize enterprise performance', 'Which sector is strongest?'].map((prompt) => (
                <button className="ai-chip text-left" key={prompt} onClick={() => setQuestion(prompt)} type="button">{prompt}</button>
              ))}
            </div>
          </div>
          <motion.div className="ai-surface mt-4 p-4" key={answer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ai)]" />
              <p className="text-sm leading-6 text-text">{answer}</p>
            </div>
          </motion.div>
        </article>
      </section>

      {currentSector ? (
      <article className="card overflow-hidden">
        <div className="border-b border-border bg-surface p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl">KPI analytical register</h2>
              <p className="mt-2 text-sm text-muted">Ordered KPI records with score, trend, owner, sector, department, and AI risk tags.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 min-w-[260px] items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3">
                <Search className="h-4 w-4 text-muted" />
                <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search KPI, department, owner..." />
              </div>
              <select className="h-10 rounded-2xl border border-border bg-surface-raised px-3 text-sm font-semibold outline-none" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="score">Sort by score</option>
                <option value="code">Sort by code</option>
                <option value="sector">Sort by sector</option>
                <option value="department">Sort by department</option>
                <option value="status">Sort by status</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All', count: tableRows.length, icon: Filter },
              { id: 'met', label: 'Met / Exceeded', count: tableRows.filter((row) => row.band === 'met').length, icon: CheckCircle2 },
              { id: 'risk', label: 'Watch', count: tableRows.filter((row) => row.band === 'risk').length, icon: Clock3 },
              { id: 'below', label: 'Critical', count: tableRows.filter((row) => row.band === 'below').length, icon: Activity },
              { id: 'noData', label: 'No Data', count: tableRows.filter((row) => row.band === 'noData').length, icon: FilePenLine },
              { id: 'ai', label: 'AI Flags', count: tableRows.filter((row) => row.tags.some((tag) => ['Evidence risk', 'AI quality risk'].includes(tag))).length, icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition ${attention === tab.id ? 'bg-primary text-white' : tab.id === 'ai' ? 'ai-chip' : 'border border-border bg-surface-raised text-text hover:border-primary/40 hover:text-primary'}`}
                  key={tab.id}
                  onClick={() => setAttention(tab.id as AttentionFilter)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span className={attention === tab.id ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-xs' : 'rounded-full bg-surface px-1.5 py-0.5 text-xs'}>{tab.count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase tracking-[0.08em] text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-extrabold">KPI Code</th>
                <th className="px-4 py-3 font-extrabold">KPI Title</th>
                <th className="px-4 py-3 font-extrabold">Sector</th>
                <th className="px-4 py-3 font-extrabold">Department</th>
                <th className="px-4 py-3 font-extrabold">Target</th>
                <th className="px-4 py-3 font-extrabold">Actual</th>
                <th className="px-4 py-3 font-extrabold">Score</th>
                <th className="px-4 py-3 font-extrabold">Status</th>
                <th className="px-4 py-3 font-extrabold">Trend</th>
                <th className="px-4 py-3 font-extrabold">Owner</th>
                <th className="px-4 py-3 font-extrabold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredRows.map((row) => (
                <Fragment key={row.kpi.id}>
                  <tr className="transition hover:bg-primary-tint/60">
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{dgeKpiCode(row.kpi.id)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="max-w-[320px] text-left font-extrabold leading-5 text-text transition hover:text-primary" onClick={() => setExpandedKpiId(expandedKpiId === row.kpi.id ? '' : row.kpi.id)} type="button">{row.kpi.name}</button>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{row.kpi.category}</p>
                    </td>
                    <td className="px-4 py-4"><span className="inline-flex rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold">{row.sector?.name ?? '-'}</span></td>
                    <td className="px-4 py-4"><span className="inline-flex rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-bold">{row.department?.name ?? '-'}</span></td>
                    <td className="px-4 py-4 font-mono text-sm font-semibold">{row.submission?.targetScore ?? '-'}</td>
                    <td className="px-4 py-4 font-mono text-sm font-semibold">{row.submission?.actualScore ?? '-'}</td>
                    <td className="px-4 py-4">
                      <div className="min-w-[96px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-extrabold">{row.score === undefined ? '-' : `${row.score}%`}</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${row.band === 'met' ? 'bg-success' : row.band === 'risk' ? 'bg-warning' : row.band === 'below' ? 'bg-danger' : 'bg-muted'}`} />
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                          <span className={`block h-full rounded-full ${row.band === 'met' ? 'bg-success' : row.band === 'risk' ? 'bg-warning' : row.band === 'below' ? 'bg-danger' : 'bg-muted'}`} style={{ width: `${Math.min(100, row.score ?? 4)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${dgeBandClasses(row.band)}`}>{dgeBandLabel(row.band)}</span></td>
                    <td className="px-4 py-4"><DgeMiniSparkline values={row.trend} tone={row.band === 'below' ? '#EA4F49' : 'var(--primary)'} /></td>
                    <td className="px-4 py-4"><span className="text-sm font-semibold">{row.owner?.name ?? '-'}</span></td>
                    <td className="px-4 py-4"><button className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/40 hover:bg-primary-tint" onClick={() => setExpandedKpiId(expandedKpiId === row.kpi.id ? '' : row.kpi.id)} type="button">{expandedKpiId === row.kpi.id ? 'Close' : 'Inspect'}</button></td>
                  </tr>
                  {expandedKpiId === row.kpi.id ? (
                    <motion.tr
                      className="bg-surface-raised"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <td className="px-4 py-5" colSpan={11}>
                        <motion.div
                          className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]"
                          initial={{ opacity: 0, y: 8, scale: 0.995 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
                        >
                          <div className="space-y-4">
                            <article className="ai-panel relative overflow-hidden">
                              <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-[var(--ai)]/30" />
                              <div className="flex items-start gap-3">
                                <div className="ai-icon h-12 w-12"><Sparkles className="h-5 w-5" /></div>
                                <div>
                                  <h3 className="ai-heading text-base">AI Summary</h3>
                                  <div className="mt-3 rounded-2xl border border-[var(--ai-border)] bg-white/70 p-3 dark:bg-white/5">
                                    <p className="text-sm font-extrabold text-text">Performance Interpretation</p>
                                    <p className="mt-1 text-sm leading-6 text-muted">
                                    This KPI is currently {row.score ?? 0}% and {row.trend[3] >= row.trend[0] ? 'improving' : 'stable'} across available quarters. AI tags: {(row.tags.length ? row.tags : ['Stable']).join(', ')}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </article>
                            <article className="rounded-2xl border border-border bg-surface p-4">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <h3 className="text-base">KPI Snapshot</h3>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {[
                                  ['KPI ID', row.kpi.id.replace('kpi-', '').padStart(3, '0')],
                                  ['KPI Code', dgeKpiCode(row.kpi.id)],
                                  ['Quarter', activeCycle?.label ?? 'Q4'],
                                  ['Data Source', 'Synthetic'],
                                  ['Target', row.submission?.targetScore ?? '-'],
                                  ['Actual', row.submission?.actualScore ?? '-'],
                                  ['Score', row.score === undefined ? '-' : `${row.score}%`],
                                  ['Target Status', dgeBandLabel(row.band)],
                                ].map(([label, value]) => (
                                  <div className="rounded-xl border border-border bg-surface-raised p-3 transition hover:border-primary/25 hover:bg-primary-tint/40" key={label}>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
                                    <p className="mt-1 font-mono text-sm font-extrabold text-text">{value}</p>
                                  </div>
                                ))}
                              </div>
                            </article>
                          </div>
                          <div className="space-y-4">
                            <article className="rounded-2xl border border-border bg-surface p-4">
                              <div className="flex items-center gap-2">
                                <FilePenLine className="h-4 w-4 text-primary" />
                                <h3 className="text-base">Analysis, Challenges, And Recommendations</h3>
                              </div>
                              <div className="mt-4 space-y-4">
                                {row.kpi.questions.map((questionItem) => {
                                  const answerText = row.submission?.answers.find((item) => item.questionId === questionItem.id)?.answer
                                  return (
                                    <div className="rounded-xl border border-border bg-surface-raised p-3 transition hover:border-primary/25" key={questionItem.id}>
                                      <p className="text-sm font-extrabold text-text">{questionItem.label}:</p>
                                      <p className="mt-2 text-sm leading-6 text-muted">{answerText || `${questionItem.label} narrative is not available for this KPI record.`}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            </article>
                            <article className="rounded-2xl border border-border bg-surface p-4">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-primary" />
                                <h3 className="text-base">Performance Team Comment</h3>
                              </div>
                              <div className="mt-3 rounded-xl border border-border bg-surface-raised p-3 transition hover:border-primary/25">
                                <p className="text-sm font-extrabold text-text">PM Comment:</p>
                                <p className="mt-2 text-sm leading-6 text-muted">{row.submission?.performanceTeamComment || 'Returned for clarification'}</p>
                              </div>
                            </article>
                          </div>
                        </motion.div>
                      </td>
                    </motion.tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      ) : null}
    </div>
  )
}

function scopedSubmissions() {
  const { activeCycleId } = useAppStore.getState()
  const user = mockApi.getCurrentUser()
  return mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
}

function count(submissions: KpiSubmission[], status: SubmissionStatus) {
  return submissions.filter((submission) => submission.status === status).length
}

function FocalPointSubmissionPanel({ submissions }: { submissions: KpiSubmission[] }) {
  const [page, setPage] = useState(0)
  const users = mockApi.getUsers()
  const focalRows = Array.from(
    submissions.reduce((map, submission) => {
      const user = users.find((item) => item.id === submission.focalPointId)
      const existing = map.get(submission.focalPointId) ?? {
        id: submission.focalPointId,
        name: user?.name ?? 'Focal Point',
        total: 0,
        submitted: 0,
        returned: 0,
      }
      existing.total += 1
      if (['with_performance_team', 'submitted_to_director', 'director_approved', 'published'].includes(submission.status)) existing.submitted += 1
      if (['clarification_focal', 'clarification_director'].includes(submission.status)) existing.returned += 1
      map.set(submission.focalPointId, existing)
      return map
    }, new Map<string, { id: string; name: string; total: number; submitted: number; returned: number }>()),
  ).map(([, value]) => value)
  const pageSize = 4
  const pageCount = Math.max(1, Math.ceil(focalRows.length / pageSize))
  const visibleRows = focalRows.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Focal Point Submissions</h2>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Users className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-2">
        {visibleRows.map((row, index) => {
          const pending = Math.max(0, row.total - row.submitted - row.returned)
          const progress = Math.round((row.submitted / Math.max(1, row.total)) * 100)
          const segments = [
            { label: 'Completed', value: row.submitted, className: 'bg-success' },
            { label: 'Pending', value: pending, className: 'bg-danger' },
            { label: 'Returned', value: row.returned, className: 'bg-warning' },
          ].filter((segment) => segment.value > 0)
          return (
            <motion.div
              className="rounded-2xl border border-border bg-surface-raised p-3.5 transition hover:border-primary/30"
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-extrabold text-text">{row.name}</p>
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">{row.total} KPIs</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-muted">{progress}% completed by KPI count</p>
                </div>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface">
                {segments.map((segment) => (
                  <motion.div
                    className={`h-full ${segment.className}`}
                    key={segment.label}
                    initial={{ width: 0 }}
                    animate={{ width: `${(segment.value / Math.max(1, row.total)) * 100}%` }}
                    transition={{ delay: index * 0.035, duration: 0.4 }}
                    title={`${segment.label}: ${segment.value}`}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                <span className="rounded-xl bg-success/10 px-2 py-1.5 text-success">Completed {row.submitted}</span>
                <span className="rounded-xl bg-danger/10 px-2 py-1.5 text-danger">Pending {pending}</span>
                <span className="rounded-xl bg-warning/10 px-2 py-1.5 text-warning">Returned {row.returned}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
      {focalRows.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="font-mono text-xs text-muted">Page {page + 1} / {pageCount}</p>
          <div className="flex gap-2">
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button" aria-label="Previous focal points">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} type="button" aria-label="Next focal points">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function PerformanceProgressCard({
  title,
  icon: Icon,
  progress,
  rows,
  to,
  compact = false,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
  rows: { label: string; value: string | number; tone?: string }[]
  to: string
  compact?: boolean
}) {
  if (compact) {
    const primaryRow = rows[0]
    const primaryMetric = String(primaryRow?.value ?? '0')
    const metricMatch = primaryMetric.match(/^(\S+(?:\s*\/\s*\S+)?)(?:\s+(.*))?$/)
    const metricNumber = metricMatch?.[1] ?? primaryMetric
    const metricUnit = metricMatch?.[2] ?? ''
    return (
      <article className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary-tint/70 hover:shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[17px] font-extrabold tracking-[0.01em] text-text">{title}</p>
            <div className="mt-2.5 flex flex-wrap items-end gap-1.5">
              <span className={`font-display text-[30px] font-extrabold leading-none tracking-tight ${primaryRow?.tone ?? 'text-primary'}`}>{metricNumber}</span>
              {metricUnit ? <span className="pb-0.5 text-xs font-extrabold text-muted">{metricUnit}</span> : null}
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary transition-transform duration-300 group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 w-full">
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted">
            <span>Progress</span>
            <span className="font-mono text-primary">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-tint">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.45 }} />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-muted">{primaryRow?.label}</span>
            <span className={primaryRow?.tone ?? 'font-extrabold text-text'}>{primaryMetric}</span>
          </div>
          {rows.slice(1).map((row) => (
            <div className="flex items-center justify-between gap-3 text-xs" key={row.label}>
              <span className="truncate font-semibold text-muted">{row.label}</span>
              <span className={row.tone ?? 'font-extrabold text-text'}>{row.value}</span>
            </div>
          ))}
        </div>
        <Link className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs font-bold text-muted transition group-hover:text-primary" to={to}>
          <span>View Details</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-raised transition group-hover:border-primary group-hover:text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </article>
    )
  }

  return (
    <article className="group rounded-[24px] border border-border bg-surface p-5 shadow-soft transition hover:border-primary/35 hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary transition group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold">{title}</h2>
          </div>
        </div>
        <span className="font-mono text-sm font-extrabold text-primary">{progress}%</span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-primary-tint">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.55 }} />
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-3 py-2.5" key={row.label}>
            <span className="text-sm font-semibold text-muted">{row.label}</span>
            <span className={row.tone ?? 'text-text'}>{row.value}</span>
          </div>
        ))}
      </div>
      <Link className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary transition hover:text-primary-hover" to={to}>
        View Details <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

function PerformanceCycleSignal({
  instances,
  activeCycleId,
}: {
  instances: FocalPointSubmissionInstance[]
  activeCycleId: string
}) {
  const cycles = mockApi.getCycles()
  const activeCycle = mockApi.getActiveCycle()
  const setActiveCycle = useAppStore((state) => state.setActiveCycle)
  const activeYears = new Set(activeCycle ? cycleYears(activeCycle) : [])
  const sameYearCycles = cycles
    .filter((cycle) => cycle.id !== activeCycleId && cycle.status !== 'closed')
    .filter((cycle) => cycleYears(cycle).some((year) => activeYears.has(year)))
  const submitted = instances.filter((instance) => instance.status !== 'draft').length
  const pending = Math.max(0, instances.length - submitted)

  return (
    <section className={sameYearCycles.length ? 'grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:items-stretch' : ''}>
      <article className={sameYearCycles.length
        ? 'group flex h-full overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'
        : 'group overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'}
      >
        {sameYearCycles.length ? (
          <div className="flex w-full flex-col justify-center gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">Active Cycle</p>
                  <p className="mt-1 truncate text-base font-extrabold text-primary">{activeCycle?.label ?? 'Selected cycle'}</p>
                </div>
              </div>
              <Link className="btn-primary h-11 shrink-0 rounded-[18px] px-4" to="/trackers/departments">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Users className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Focal Points Submitted</p>
                  <p className="mt-1 text-sm font-bold text-text">{submitted}</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="text-xs font-semibold text-muted">Pending Submission</p>
                <p className="mt-1 text-sm font-bold text-text">{pending}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[980px] items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="whitespace-nowrap text-xs font-semibold text-muted">Active Cycle</p>
                  <p className="mt-1 text-sm font-bold text-primary">{activeCycle?.label ?? 'Selected cycle'}</p>
                </div>
              </div>
              <div className="h-12 w-px shrink-0 bg-border" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Users className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Focal Points Submitted</p>
                  <p className="mt-1 text-sm font-bold text-text">{submitted}</p>
                </div>
              </div>
              <div className="h-12 w-px shrink-0 bg-border" />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <Clock3 className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">Focal Points Pending Submission</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-bold text-text">{pending}</p>
                </div>
              </div>
              <Link className="btn-primary ml-auto h-11 shrink-0 rounded-[18px] px-4" to="/trackers/departments">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </article>

      {sameYearCycles.length ? (
        <article className="rounded-[24px] border border-info/20 bg-surface p-4 transition hover:border-info/35 hover:shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Same-year cycle notice</h3>
              <p className="mt-1 text-sm text-muted">Other cycles exist in this reporting year.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {sameYearCycles.slice(0, 2).map((cycle) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-3" key={cycle.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{cycle.label}</p>
                  <p className="mt-1 text-xs text-muted">{cycle.status}</p>
                </div>
                <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover" onClick={() => setActiveCycle(cycle.id)} type="button">
                  Switch Cycle
                </button>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  )
}

function PerformanceAiAssistancePanel({ submissions }: { submissions: KpiSubmission[] }) {
  const evidenceRisks = submissions.filter((submission) => submission.attachments.length === 0 && ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team'].includes(submission.status))
  const mismatches = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0)
  const weakNarrative = submissions.filter((submission) => submission.answers.some((answer) => answer.answer.trim().length > 0 && answer.answer.trim().length < 35))
  const rows = [
    { label: 'Evidence quality risks', value: evidenceRisks.length, ids: evidenceRisks.map((submission) => submission.kpiId) },
    { label: 'Actual value mismatch with evidence', value: mismatches.length, ids: mismatches.map((submission) => submission.kpiId) },
    { label: 'Weak analysis/challenges/recommendations', value: weakNarrative.length, ids: weakNarrative.map((submission) => submission.kpiId) },
  ]
  return (
    <article className="ai-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="ai-icon h-11 w-11">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="ai-heading text-xl font-extrabold">AI Assistance</h2>
            <p className="mt-2 text-sm text-muted">Affected KPI IDs are shown as quick links for review.</p>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div className="ai-surface px-4 py-3 transition hover:border-[var(--ai)]" key={row.label}>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold">{row.label}</span>
              <span className="font-display text-2xl font-extrabold leading-none text-[var(--ai-strong)]">{row.value}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.ids.length ? row.ids.slice(0, 8).map((id) => (
                <Link
                  className="rounded-full border border-[var(--ai-border)] bg-white/75 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                  key={id}
                  to={`/kpis/${id}`}
                >
                  {shortKpiId(id)}
                </Link>
              )) : (
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted dark:bg-white/5">No KPI IDs flagged</span>
              )}
              {row.ids.length > 8 ? <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted dark:bg-white/5">+{row.ids.length - 8}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function PerformanceChangeRequestWidget() {
  const requests = mockApi.getChangeRequests()
  return (
    <article className="card p-5 transition hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
            <FilePenLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">Change Request Widget</h2>
            <p className="mt-2 text-sm text-muted">KPI CR movement visible to Performance Team for awareness.</p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Pending KPI CRs', value: requests.filter((request) => request.status === 'pending').length, tone: 'text-warning' },
          { label: 'Approved CRs', value: requests.filter((request) => request.status === 'approved').length, tone: 'text-success' },
          { label: 'Rejected CRs', value: requests.filter((request) => request.status === 'rejected').length, tone: 'text-danger' },
        ].map((item) => (
          <div className="rounded-2xl border border-border bg-surface-raised p-4" key={item.label}>
            <p className={`font-display text-3xl font-extrabold ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{item.label}</p>
          </div>
        ))}
      </div>
      <Link className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary transition hover:text-primary-hover" to="/change-requests">
        View Details <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

function AdminKpiSetupPanel({ kpis }: { kpis: Kpi[] }) {
  return (
    <article className="card overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-xl">Active KPIs in selected cycle</h2>
        <p className="mt-2 text-sm text-muted">Admin sees setup records only. Workflow progress belongs to operational roles.</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">KPI Definition</th>
              <th>Department</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {kpis.slice(0, 10).map((kpi) => (
              <tr className="border-t border-border hover:bg-primary-tint" key={kpi.id}>
                <td className="px-4 py-3">
                  <Link className="font-semibold text-text transition hover:text-primary" to="/admin/kpi-definitions">{kpi.name}</Link>
                  <p className="text-xs text-muted">{kpi.description}</p>
                </td>
                <td>{mockApi.getDepartment(kpi.departmentId)?.name}</td>
                <td>{kpi.category}</td>
                <td><StatusPill value="active" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function AdminDashboard() {
  const { activeCycleId } = useAppStore.getState()
  const activeKpiIds = new Set(
    mockApi
      .getVisibleSubmissionsForRole('admin', 'u-admin', activeCycleId)
      .filter((submission) => submission.status === 'active')
      .map((submission) => submission.kpiId),
  )
  const cycleKpis = mockApi.getCycleKpis(activeCycleId).filter((kpi) => activeKpiIds.has(kpi.id))
  return (
    <div className="space-y-5">
      <Hero eyebrow="Admin Dashboard" title="Governance setup workspace" copy="Configure templates, cycles, KPI definitions, users, and DGE hierarchy before the operational cycle begins." chips={[{ label: 'Templates', value: mockApi.getTemplates().length }, { label: 'KPI Definitions', value: mockApi.getKpis().length }, { label: 'Cycles', value: mockApi.getCycles().length }]} />
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Active Cycles" value={mockApi.getCycles().length} detail="Configured cycles" icon={Layers3} color={tones[0]} index={0} />
        <MetricCard label="KPI Templates" value={mockApi.getTemplates().length} detail="Reusable KPI sets" icon={ShieldCheck} color={tones[1]} index={1} />
        <MetricCard label="Active KPIs" value={cycleKpis.length} detail="Ready for focal point drafting" icon={Target} color={tones[2]} index={2} />
        <MetricCard label="Departments" value={mockApi.getDepartments().length} detail="Hierarchy nodes" icon={Building2} color={tones[3]} index={3} />
      </section>
      <AdminKpiSetupPanel kpis={cycleKpis} />
    </div>
  )
}

function FocalPointDashboard() {
  const activeCycleId = useAppStore((state) => state.activeCycleId)
  const user = mockApi.getCurrentUser()
  const { showSuccessToast } = useToast()
  const submissions = scopedSubmissions()
  const cycleAlerts = getFocalPointCycleAlerts(user.id, activeCycleId)
  const submitAll = () => {
    const moved = mockApi.submitFocalPointKpis(user.id, activeCycleId, 'Bulk submitted all drafted KPIs to Performance Team.')
    showSuccessToast('KPIs submitted', `${moved.length} KPI records moved to Performance Team validation.`)
  }
  return (
    <div className="space-y-5">
      <FocalPointProgressPanel submissions={submissions} />
      <FocalPointBulkSubmitPanel submissions={submissions} alerts={cycleAlerts} onSubmit={submitAll} />
      <FocalPointAssignmentPanel submissions={submissions} />
      <FocalPointAiAssistancePanel submissions={submissions} />
      <section className="grid gap-5 xl:grid-cols-2">
        <RadarPanel submissions={submissions} />
        <TargetActualPanel submissions={submissions} />
      </section>
      <section>
        <ActivityPanel submissions={submissions} />
      </section>
    </div>
  )
}

function PerformanceDashboard() {
  const { activeCycleId } = useAppStore.getState()
  const submissions = scopedSubmissions()
  const instances = mockApi.getFocalPointInstances(activeCycleId)
  const pendingValidation = submissions.filter((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status)).length
  const validationCompleted = submissions.filter((submission) => ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
  const returnedKpis = submissions.filter((submission) => ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)).length
  const submittedInstances = instances.filter((instance) => instance.status !== 'draft').length
  const readyForDirector = instances.filter((instance) => instance.status === 'reviewed_by_performance_team').length
  const sentToDirectors = instances.filter((instance) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'published'].includes(instance.status)).length
  const reviewedByDirectors = instances.filter((instance) => ['reviewed_by_director', 'approved_by_director', 'published'].includes(instance.status)).length
  const validationProgress = Math.round((validationCompleted / Math.max(1, pendingValidation + validationCompleted + returnedKpis)) * 100)
  const focalPointProgress = Math.round((submittedInstances / Math.max(1, instances.length)) * 100)
  const directorProgress = Math.round((reviewedByDirectors / Math.max(1, readyForDirector + sentToDirectors + reviewedByDirectors)) * 100)

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-3">
        <PerformanceProgressCard
          title="Validation Progress"
          icon={Clock3}
          progress={validationProgress}
          to="/approval/validate"
          compact
          rows={[
            { label: 'Pending Validation', value: `${pendingValidation} KPIs`, tone: 'font-extrabold text-warning' },
            { label: 'Validation Completed', value: `${validationCompleted} KPIs`, tone: 'font-extrabold text-success' },
            { label: 'Returned / Rejected', value: `${returnedKpis} KPIs`, tone: 'font-extrabold text-danger' },
          ]}
        />
        <PerformanceProgressCard
          title="Focal Point Submission"
          icon={Users}
          progress={focalPointProgress}
          to="/approval/validate"
          compact
          rows={[
            { label: 'Submitted Focal Points', value: `${submittedInstances} / ${instances.length}`, tone: 'font-extrabold text-primary' },
            { label: 'Pending Submission', value: `${Math.max(0, instances.length - submittedInstances)} Focal Points`, tone: 'font-extrabold text-muted' },
          ]}
        />
        <PerformanceProgressCard
          title="Directors Review"
          icon={ShieldCheck}
          progress={directorProgress}
          to="/approval/validate"
          compact
          rows={[
            { label: 'Ready for Director Review', value: `${readyForDirector} Focal Point Submissions`, tone: 'font-extrabold text-info' },
            { label: 'Sent to Directors', value: `${sentToDirectors} Focal Point Submissions`, tone: 'font-extrabold text-primary' },
            { label: 'Reviewed by Directors', value: `${reviewedByDirectors} Focal Point Submissions`, tone: 'font-extrabold text-success' },
          ]}
        />
      </section>
      <PerformanceCycleSignal instances={instances} activeCycleId={activeCycleId} />
      <section className="grid gap-5 xl:grid-cols-2">
        <PerformanceAiAssistancePanel submissions={submissions} />
        <PerformanceChangeRequestWidget />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <KpiPerformancePanel submissions={submissions} />
        <FocalPointSubmissionPanel submissions={submissions} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <TargetActualPanel submissions={submissions} />
        <PerformanceTrendPanel submissions={submissions} />
      </section>
    </div>
  )
}

function DirectorCycleSubmissionWidget({ submissions, activeCycleId }: { submissions: KpiSubmission[]; activeCycleId: string }) {
  const cycles = mockApi.getCycles()
  const activeCycle = mockApi.getActiveCycle()
  const setActiveCycle = useAppStore((state) => state.setActiveCycle)
  const activeYears = new Set(activeCycle ? cycleYears(activeCycle) : [])
  const sameYearCycles = cycles
    .filter((cycle) => cycle.id !== activeCycleId && cycle.status !== 'closed')
    .filter((cycle) => cycleYears(cycle).some((year) => activeYears.has(year)))
  const focalPointIds = new Set(submissions.map((submission) => submission.focalPointId))
  const submittedFocalPoints = new Set(
    submissions
      .filter((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status))
      .map((submission) => submission.focalPointId),
  )
  const dueDate = activeCycle?.endDate ? new Date(`${activeCycle.endDate}T00:00:00`) : undefined
  const daysRemaining = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)) : 0

  return (
    <section className={sameYearCycles.length ? 'grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:items-stretch' : ''}>
      <article className={sameYearCycles.length
        ? 'group flex h-full overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'
        : 'group overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card'}
      >
        {sameYearCycles.length ? (
          <div className="flex w-full flex-col justify-center gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">Active Cycle</p>
                  <p className="mt-1 truncate text-base font-extrabold text-primary">{activeCycle?.label ?? 'Selected cycle'}</p>
                </div>
              </div>
              <Link className="btn-primary h-11 shrink-0 rounded-[18px] px-4" to="/approval/director">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Users className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Focal Point Submissions</p>
                  <p className="mt-1 text-sm font-bold text-text">{submittedFocalPoints.size} / {focalPointIds.size}</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="text-xs font-semibold text-muted">Submission Deadline</p>
                <p className="mt-1 text-sm font-bold text-text">{daysRemaining} days</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[980px] items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="whitespace-nowrap text-xs font-semibold text-muted">Active Cycle</p>
                  <p className="mt-1 text-sm font-bold text-primary">{activeCycle?.label ?? 'Selected cycle'}</p>
                </div>
              </div>
              <div className="h-12 w-px shrink-0 bg-border" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Users className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Focal Point Submissions</p>
                  <p className="mt-1 text-sm font-bold text-text">{submittedFocalPoints.size} / {focalPointIds.size}</p>
                </div>
              </div>
              <div className="h-12 w-px shrink-0 bg-border" />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                  <Clock3 className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">Submission Deadline</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-bold text-text">{daysRemaining} days remaining</p>
                </div>
              </div>
              <Link className="btn-primary ml-auto h-11 shrink-0 rounded-[18px] px-4" to="/approval/director">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </article>

      {sameYearCycles.length ? (
        <article className="rounded-[24px] border border-info/20 bg-surface p-4 transition hover:border-info/35 hover:shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Same-year cycle notice</h3>
              <p className="mt-1 text-sm text-muted">Other cycles in this reporting year may include department submissions.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {sameYearCycles.slice(0, 2).map((cycle) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-3" key={cycle.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{cycle.label}</p>
                  <p className="mt-1 text-xs text-muted">{cycle.status}</p>
                </div>
                <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover" onClick={() => setActiveCycle(cycle.id)} type="button">
                  Switch Cycle
                </button>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  )
}

function DirectorFocalPointProgress({ submissions }: { submissions: KpiSubmission[] }) {
  const [page, setPage] = useState(0)
  const users = mockApi.getUsers()
  const pageSize = 4
  const rows = Array.from(
    submissions.reduce((map, submission) => {
      const focalPoint = users.find((user) => user.id === submission.focalPointId)
      const existing = map.get(submission.focalPointId) ?? {
        id: submission.focalPointId,
        name: focalPoint?.name ?? 'Focal Point',
        total: 0,
        received: 0,
      }
      existing.total += 1
      if (['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)) existing.received += 1
      map.set(submission.focalPointId, existing)
      return map
    }, new Map<string, { id: string; name: string; total: number; received: number }>()),
  ).map(([, value]) => value)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <article className="card p-5 transition hover:shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Focal Points</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Users className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-2">
        {visibleRows.map((row, index) => {
          const progress = Math.round((row.received / Math.max(1, row.total)) * 100)
          const pending = row.received === 0
          return (
            <motion.div
              className="rounded-2xl border border-border bg-surface-raised p-3 transition hover:border-primary/30"
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{row.name}</p>
                  <p className="mt-1 text-xs text-muted">{row.total} KPIs in department scope</p>
                </div>
                <span className={pending ? 'rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger' : 'rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success'}>
                  {pending ? 'Pending' : 'Received'}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: index * 0.035, duration: 0.45 }} />
              </div>
            </motion.div>
          )
        })}
        {!rows.length ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">No focal point submissions are visible for this department.</div>
        ) : null}
      </div>
      {rows.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="font-mono text-xs text-muted">Page {page + 1} / {pageCount}</p>
          <div className="flex gap-2">
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button" aria-label="Previous focal points">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary h-8 w-8 rounded-full p-0" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} type="button" aria-label="Next focal points">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function DirectorAiAssistanceWidget({ submissions }: { submissions: KpiSubmission[] }) {
  const getAnswer = (submission: KpiSubmission, label: string) => {
    const kpi = mockApi.getKpi(submission.kpiId)
    const question = kpi?.questions.find((item) => item.label.toLowerCase().includes(label))
    return submission.answers.find((answer) => answer.questionId === question?.id)?.answer.trim() ?? ''
  }
  const hasWeakText = (value: string) => value.length < 35
  const uniqueIds = (items: KpiSubmission[]) => Array.from(new Set(items.map((submission) => submission.kpiId)))

  const insufficientEvidence = submissions.filter((submission) => submission.attachments.length === 0)
  const evidenceMismatch = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0)
  const weakAnalysis = submissions.filter((submission) => hasWeakText(getAnswer(submission, 'analysis')))
  const weakChallenges = submissions.filter((submission) => hasWeakText(getAnswer(submission, 'challenge')))
  const weakRecommendations = submissions.filter((submission) => hasWeakText(getAnswer(submission, 'recommendation')))
  const betterWording = submissions.filter((submission) => aiReviewScore(submission) < 70)
  const allWarningIds = Array.from(new Set([
    ...uniqueIds(insufficientEvidence),
    ...uniqueIds(evidenceMismatch),
    ...uniqueIds(weakAnalysis),
    ...uniqueIds(weakChallenges),
    ...uniqueIds(weakRecommendations),
    ...uniqueIds(betterWording),
  ]))

  const rows = [
    {
      label: 'KPIs with insufficient evidence',
      description: 'Evidence is missing or not enough to support the KPI result.',
      ids: uniqueIds(insufficientEvidence),
    },
    {
      label: 'KPIs where evidence may not match entered actual value',
      description: 'Actual values look strong, but the available evidence may not support them.',
      ids: uniqueIds(evidenceMismatch),
    },
    {
      label: 'KPIs where analysis is weak, missing, or unclear',
      description: 'Analysis should clearly explain performance movement and result drivers.',
      ids: uniqueIds(weakAnalysis),
    },
    {
      label: 'KPIs where challenges are missing or not specific',
      description: 'Challenges should identify blockers, dependencies, ownership, and timing.',
      ids: uniqueIds(weakChallenges),
    },
    {
      label: 'KPIs where recommendations are missing or generic',
      description: 'Recommendations should include specific corrective actions and follow-up.',
      ids: uniqueIds(weakRecommendations),
    },
    {
      label: 'KPIs that may need better wording before submission',
      description: 'AI review score indicates the response should be improved before approval.',
      ids: uniqueIds(betterWording),
    },
    {
      label: 'AI-supported quality warnings before submitting to Performance Team',
      description: 'Combined AI watchlist across evidence, value consistency, and response quality.',
      ids: allWarningIds,
    },
  ]

  return (
    <article className="ai-panel">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="ai-icon h-11 w-11">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="ai-heading text-xl font-extrabold">AI Assistance</h2>
          </div>
        </div>
        <div className="ai-chip">{allWarningIds.length} KPIs flagged</div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, index) => (
          <motion.div
            className="ai-surface flex min-h-[132px] flex-col px-4 py-3 transition hover:-translate-y-0.5 hover:border-[var(--ai)]"
            key={row.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="line-clamp-2 text-[13px] font-extrabold leading-5 text-text">{row.label}</span>
              <span className="rounded-full px-2 py-0.5 font-mono text-xs font-extrabold" style={{ backgroundColor: 'color-mix(in srgb, var(--ai) 12%, transparent)', color: 'var(--ai-strong)' }}>
                {row.ids.length}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{row.description}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {row.ids.length ? row.ids.slice(0, 8).map((id) => (
                <Link
                  className="rounded-full border border-[var(--ai-border)] bg-white/75 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                  key={id}
                  to={`/kpis/${id}`}
                >
                  {shortKpiId(id)}
                </Link>
              )) : (
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted dark:bg-white/5">No affected KPIs</span>
              )}
              {row.ids.length > 8 ? <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted dark:bg-white/5">+{row.ids.length - 8}</span> : null}
            </div>
          </motion.div>
        ))}
      </div>
    </article>
  )
}

function DirectorDashboard() {
  const { activeCycleId } = useAppStore.getState()
  const submissions = scopedSubmissions()
  const user = mockApi.getCurrentUser()
  const department = user.departmentId ? mockApi.getDepartment(user.departmentId) : undefined
  const pendingReview = submissions.filter((submission) => submission.status === 'submitted_to_director').length
  const reviewed = submissions.filter((submission) => ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
  const returned = submissions.filter((submission) => ['clarification_director', 'clarification_from_director'].includes(submission.status)).length
  const reviewProgress = Math.round((reviewed / Math.max(1, pendingReview + reviewed + returned)) * 100)
  return (
    <div className="space-y-5">
      <Hero eyebrow="Department Director Dashboard" title={department ? `${department.name} approval workspace` : 'Department approval workspace'} copy="Review validated KPI submissions for your assigned department and approve or return clarification." chips={[{ label: 'Department', value: department?.name ?? 'Unassigned' }, { label: 'Pending Review', value: pendingReview }, { label: 'Reviewed', value: reviewed }]} />
      <section className="grid gap-5 xl:grid-cols-2">
        <PerformanceProgressCard
          title="My Review"
          icon={ShieldCheck}
          progress={reviewProgress}
          to="/approval/director"
          rows={[
            { label: 'Pending Review', value: `${pendingReview} KPIs`, tone: 'font-extrabold text-warning' },
            { label: 'Reviewed', value: `${reviewed} KPIs`, tone: 'font-extrabold text-success' },
            { label: 'Returned / Rejected', value: `${returned} KPIs`, tone: 'font-extrabold text-danger' },
          ]}
        />
        <DirectorFocalPointProgress submissions={submissions} />
      </section>
      <DirectorCycleSubmissionWidget submissions={submissions} activeCycleId={activeCycleId} />
      <section className="grid gap-5 xl:grid-cols-2">
        <KpiPerformancePanel submissions={submissions} />
        <DirectorAiAssistanceWidget submissions={submissions} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <RadarPanel submissions={submissions} />
        <PerformanceTrendPanel submissions={submissions} />
      </section>
    </div>
  )
}

function ExecutiveDashboard({ orgWide = false }: { orgWide?: boolean }) {
  const { activeCycleId } = useAppStore.getState()
  const user = mockApi.getCurrentUser()
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const allCycleKpis = mockApi.getCycleKpis(activeCycleId)
  const allCycleSubmissions = mockApi.getSubmissions().filter((submission) => submission.cycleId === activeCycleId)
  const sector = user.sectorId ? sectors.find((item) => item.id === user.sectorId) : undefined
  const scopedDepartments = orgWide ? departments : departments.filter((department) => department.sectorId === user.sectorId)
  const scopedDepartmentIds = new Set(scopedDepartments.map((department) => department.id))
  const scopedKpis = allCycleKpis.filter((kpi) => orgWide || scopedDepartmentIds.has(kpi.departmentId))
  const scopedKpiIds = new Set(scopedKpis.map((kpi) => kpi.id))
  const submissions = allCycleSubmissions.filter((submission) => scopedKpiIds.has(submission.kpiId))
  const published = submissions.filter((submission) => submission.status === 'published').length
  const directorApproved = submissions.filter((submission) => ['approved_by_director', 'director_approved'].includes(submission.status)).length
  const pendingDirector = submissions.filter((submission) => ['submitted_to_director', 'reviewed_by_director'].includes(submission.status)).length
  const withPerformance = submissions.filter((submission) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team'].includes(submission.status)).length
  const title = orgWide ? 'DGE enterprise workflow overview' : `${sector?.name ?? 'Sector'} workflow overview`
  const users = mockApi.getUsers()
  const departmentRows = scopedDepartments.map((department) => {
    const departmentKpis = scopedKpis.filter((kpi) => kpi.departmentId === department.id)
    const departmentKpiIds = new Set(departmentKpis.map((kpi) => kpi.id))
    const departmentSubmissions = submissions.filter((submission) => departmentKpiIds.has(submission.kpiId))
    const progressTotal = Math.max(1, departmentSubmissions.length)
    return {
      department,
      total: departmentKpis.length,
      published: departmentSubmissions.filter((submission) => submission.status === 'published').length,
      awaiting: departmentSubmissions.filter((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved'].includes(submission.status)).length,
      performance: departmentSubmissions.filter((submission) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team'].includes(submission.status)).length,
      active: departmentSubmissions.filter((submission) => ['active', 'draft', 'submitted'].includes(submission.status)).length,
      progressTotal,
    }
  })
  const focalPointRows = Array.from(
    submissions.reduce((map, submission) => {
      const kpi = mockApi.getKpi(submission.kpiId)
      if (!kpi || !scopedDepartmentIds.has(kpi.departmentId)) return map
      const focalPoint = users.find((item) => item.id === submission.focalPointId)
      const department = departments.find((item) => item.id === kpi.departmentId)
      const existing = map.get(submission.focalPointId) ?? {
        id: submission.focalPointId,
        name: focalPoint?.name ?? 'Focal Point',
        departments: new Set<string>(),
        total: 0,
        completed: 0,
        pending: 0,
        returned: 0,
      }
      if (department) existing.departments.add(department.name)
      existing.total += 1
      if (['published', 'approved_by_director', 'director_approved', 'reviewed_by_director', 'submitted_to_director'].includes(submission.status)) existing.completed += 1
      else if (['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)) existing.returned += 1
      else existing.pending += 1
      map.set(submission.focalPointId, existing)
      return map
    }, new Map<string, { id: string; name: string; departments: Set<string>; total: number; completed: number; pending: number; returned: number }>()),
  ).map(([, row]) => ({ ...row, departments: Array.from(row.departments) }))

  return (
    <div className="space-y-5">
      <Hero
        eyebrow={orgWide ? 'Director General Dashboard' : 'Sector Executive Director Dashboard'}
        title={title}
        copy={orgWide ? 'Read-only visibility across enterprise KPI workflow movement. Detailed analytics are available from Reports.' : `Read-only visibility for ${sector?.name ?? 'assigned sector'} KPI workflow movement. Detailed analytics are available from Reports.`}
        chips={orgWide
          ? [{ label: 'Sectors', value: sectors.length }, { label: 'Departments', value: scopedDepartments.length }, { label: 'KPIs', value: scopedKpis.length }]
          : [{ label: 'Sector', value: sector?.name ?? 'Unassigned' }, { label: 'Departments', value: scopedDepartments.length }, { label: 'KPIs', value: scopedKpis.length }]}
      />
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={orgWide ? 'Enterprise KPIs' : 'Sector KPIs'} value={scopedKpis.length} detail={orgWide ? 'Across visible sectors' : 'Across sector departments'} icon={Target} color={tones[0]} index={0} />
        <MetricCard label="With Performance Team" value={withPerformance} detail="Validated or under review" icon={ShieldCheck} color={tones[1]} index={1} />
        <MetricCard label="Director Review" value={pendingDirector + directorApproved} detail="Awaiting or approved by directors" icon={Users} color={tones[2]} index={2} />
        <MetricCard label="Published KPIs" value={published} detail="Final visible records" icon={CheckCircle2} color={tones[3]} index={3} />
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <article className="card p-5 transition hover:shadow-card">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl">Department workflow visibility</h2>
              <p className="mt-2 text-sm font-normal text-text">Published, director-ready, and Performance Team movement for the selected cycle.</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {departmentRows.map((row, index) => {
              const progress = Math.round((row.published / Math.max(1, row.total)) * 100)
              const publishedWidth = (row.published / row.progressTotal) * 100
              const directorWidth = (row.awaiting / row.progressTotal) * 100
              const performanceWidth = (row.performance / row.progressTotal) * 100
              const activeWidth = Math.max(0, 100 - publishedWidth - directorWidth - performanceWidth)
              return (
                <motion.div
                  className="group rounded-[22px] border border-border bg-surface-raised p-4 transition hover:border-primary/30 hover:shadow-card"
                  key={row.department.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-extrabold leading-6 text-text transition group-hover:text-primary">{row.department.name}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">{row.total} KPI records</p>
                    </div>
                    <span className="rounded-full bg-primary-tint px-3 py-1.5 font-mono text-sm font-extrabold text-primary">{progress}%</span>
                  </div>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface">
                    <span className="h-full bg-success" style={{ width: `${publishedWidth}%` }} />
                    <span className="h-full bg-warning" style={{ width: `${directorWidth}%` }} />
                    <span className="h-full bg-primary" style={{ width: `${performanceWidth}%` }} />
                    <span className="h-full bg-muted/40" style={{ width: `${activeWidth}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-surface px-3 py-2.5">
                      <p className="font-mono text-2xl font-extrabold leading-none text-success">{row.published}</p>
                      <p className="mt-1 text-xs font-bold text-muted">Published</p>
                    </div>
                    <div className="rounded-2xl bg-surface px-3 py-2.5">
                      <p className="font-mono text-2xl font-extrabold leading-none text-warning">{row.awaiting}</p>
                      <p className="mt-1 text-xs font-bold text-muted">Director review</p>
                    </div>
                    <div className="rounded-2xl bg-surface px-3 py-2.5">
                      <p className="font-mono text-2xl font-extrabold leading-none text-primary">{row.performance}</p>
                      <p className="mt-1 text-xs font-bold text-muted">Performance Team</p>
                    </div>
                    <div className="rounded-2xl bg-surface px-3 py-2.5">
                      <p className="font-mono text-2xl font-extrabold leading-none text-muted">{row.active}</p>
                      <p className="mt-1 text-xs font-bold text-muted">With focal point</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </article>
        <article className="card p-5 transition hover:shadow-card">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl">Focal point visibility</h2>
              <p className="mt-2 text-sm font-normal text-text">
                {orgWide ? 'Focal point movement across enterprise departments.' : 'Focal point movement for this sector only.'}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-3">
            {focalPointRows.map((row, index) => {
              const completedWidth = (row.completed / Math.max(1, row.total)) * 100
              const returnedWidth = (row.returned / Math.max(1, row.total)) * 100
              const pendingWidth = Math.max(0, 100 - completedWidth - returnedWidth)
              return (
                <motion.div
                  className="rounded-[22px] border border-border bg-surface-raised p-4 transition hover:border-primary/30 hover:shadow-card"
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold text-text">{row.name}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-muted">{row.departments.join(', ') || 'No department scope'}</p>
                    </div>
                    <span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-xs font-extrabold text-primary">{row.completed}/{row.total}</span>
                  </div>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface">
                    <span className="h-full bg-success" style={{ width: `${completedWidth}%` }} />
                    <span className="h-full bg-danger" style={{ width: `${returnedWidth}%` }} />
                    <span className="h-full bg-warning" style={{ width: `${pendingWidth}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-surface px-2 py-2">
                      <p className="font-mono text-lg font-extrabold text-success">{row.completed}</p>
                      <p className="text-[10px] font-bold text-muted">Completed</p>
                    </div>
                    <div className="rounded-xl bg-surface px-2 py-2">
                      <p className="font-mono text-lg font-extrabold text-warning">{row.pending}</p>
                      <p className="text-[10px] font-bold text-muted">Pending</p>
                    </div>
                    <div className="rounded-xl bg-surface px-2 py-2">
                      <p className="font-mono text-lg font-extrabold text-danger">{row.returned}</p>
                      <p className="text-[10px] font-bold text-muted">Returned</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {!focalPointRows.length ? (
              <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
                No focal point records are visible for this dashboard scope.
              </div>
            ) : null}
          </div>
        </article>
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="card p-5 transition hover:shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
              <FilePenLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl">Reports workspace</h2>
              <p className="mt-2 text-sm font-normal text-text">Open Reports for the full analytics dashboard, sector comparison, KPI drilldowns, and AI assistant.</p>
            </div>
          </div>
          <Link className="btn-primary mt-5 h-11 rounded-[18px] px-4" to="/reports">
            Open Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  )
}

void ChartRow
void DepartmentPortfolioPanel
void DepartmentKpiRadarPanel
void SectorCoverageChart
void count

export function DashboardPage() {
  useAppStore()
  const user = mockApi.getCurrentUser()
  const dashboard = (() => {
    if (user.role === 'admin') return <AdminDashboard />
    if (user.role === 'focal_point') return <FocalPointDashboard />
    if (user.role === 'performance_team') return <PerformanceDashboard />
    if (user.role === 'department_director') return <DirectorDashboard />
    if (user.role === 'director_general') return <ExecutiveDashboard orgWide />
    return <ExecutiveDashboard />
  })()
  return <div className="dashboard-page">{dashboard}</div>
}
