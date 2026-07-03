import { ResponsiveRadar } from '@nivo/radar'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusPill } from '../components/ui/StatusPill'
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
              <p className="font-display text-3xl font-extrabold">{chip.value}</p>
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
      if (['clarification_focal', 'clarification_director'].includes(submission.status)) existing.returned += 1
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

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {departmentRows.map((row, index) => {
          const progress = Math.round((row.entered / Math.max(1, row.kpiCount)) * 100)
          const avgScore = row.scored ? Math.round(row.scoreTotal / row.scored) : 0
          const metPercent = Math.round((row.met / Math.max(1, row.kpiCount)) * 100)
          return (
            <motion.div
              className="group rounded-[24px] border border-border bg-surface-raised p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
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
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold">{row.entered}/{row.kpiCount}</p>
                  <p className="mt-0.5 text-muted">KPIs entered</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold text-warning">{row.returned}</p>
                  <p className="mt-0.5 text-muted">KPIs returned</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold">{avgScore}%</p>
                  <p className="mt-0.5 text-muted">Avg score</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold text-success">{metPercent}%</p>
                  <p className="mt-0.5 text-muted">Met/exceeded</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold text-danger">{row.atRisk}</p>
                  <p className="mt-0.5 text-muted">At risk</p>
                </div>
                <div className="rounded-2xl bg-surface px-3 py-2">
                  <p className="font-bold text-muted">{row.noData}</p>
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
      <article className="group flex overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card">
        <div className="flex w-full items-center overflow-x-auto">
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
              <button
                className="btn-primary h-11 rounded-[18px] px-4 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!allReady}
                onClick={onSubmit}
                type="button"
              >
                Submit to Performance Team <ArrowRight className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] right-0 w-[300px] rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted opacity-0 shadow-card transition group-hover:opacity-100">
                You can submit to Performance Team once all KPIs are entered.
              </div>
            </div>
          </div>
        </div>
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
              <h2 className="text-2xl font-extrabold">Entry readiness overview</h2>
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
  const warnings = submissions.flatMap((submission) => {
    const kpi = mockApi.getKpi(submission.kpiId)
    const score = aiReviewScore(submission)
    const answers = submission.answers.map((answer) => answer.answer.trim())
    const hasWeakText = answers.some((answer) => answer.length > 0 && answer.length < 35)
    const missingEvidence = submission.attachments.length === 0
    const valueMismatch = submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && missingEvidence
    const items = [
      missingEvidence ? 'Insufficient evidence' : '',
      valueMismatch ? 'Evidence may not match entered actual value' : '',
      hasWeakText ? 'Analysis is weak, missing, or unclear' : '',
      answers.length < 3 ? 'Challenges or recommendations need more detail' : '',
      score < 70 ? 'Quality score is low before submission' : '',
    ].filter(Boolean)
    return items.map((message) => ({ id: `${submission.id}-${message}`, kpi: kpi?.name ?? 'KPI', message, score }))
  })

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-surface p-5 transition hover:border-primary/35 hover:shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl">AI assistance before submission</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              AI-supported quality warnings for insufficient evidence, weak analysis, unclear challenges, generic recommendations, and wording risk.
            </p>
          </div>
        </div>
        <div className="rounded-full bg-primary-tint px-4 py-2 text-sm font-extrabold text-primary">{warnings.length} warnings</div>
      </div>
      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {(warnings.length ? warnings.slice(0, 6) : [
          { id: 'clean', kpi: 'Submission quality', message: 'No AI quality warnings for the current focal point selection.', score: 92 },
        ]).map((warning, index) => (
          <motion.div
            className="rounded-[22px] border border-border bg-surface-raised p-4"
            key={warning.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{warning.kpi}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{warning.message}</p>
              </div>
              <span className="rounded-full bg-primary-tint px-2 py-1 font-mono text-xs font-extrabold text-primary">{warning.score}</span>
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
      Score: Math.round(
        categoryKpis.reduce(
          (sum, kpi) => sum + (submissions.find((submission) => submission.kpiId === kpi.id)?.actualScore ?? 55),
          0,
        ) / Math.max(1, categoryKpis.length),
      ),
    }
  })

  return (
    <article className={`card p-5 transition hover:shadow-premium ${className}`}>
      <div className="mb-4"><h2 className="text-xl">KPI Performance Radar</h2></div>
      <div className="h-[300px]">
        <ResponsiveRadar
          data={radarData}
          keys={['Score']}
          indexBy="category"
          maxValue={100}
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

function ScoreDistributionPanel({ submissions }: { submissions: KpiSubmission[] }) {
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
          <h2 className="text-xl">KPI score distribution</h2>
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
          <h2 className="text-xl">Information about Focal Point submission</h2>
          <p className="mt-2 text-sm text-muted">Tracks how much each focal point has submitted to the Performance Team.</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Users className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-2">
        {visibleRows.map((row, index) => {
          const progress = Math.round((row.submitted / Math.max(1, row.total)) * 100)
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
                  <p className="truncate text-sm font-bold">{row.name}</p>
                  <p className="mt-1 text-xs text-muted">{row.submitted}/{row.total} KPIs submitted to Performance Team</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-extrabold">{progress}%</p>
                  <p className={row.returned ? 'text-xs font-semibold text-warning' : 'text-xs font-semibold text-success'}>
                    {row.returned ? `${row.returned} returned` : 'Clear'}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-tint">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: index * 0.035, duration: 0.4 }}
                />
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
            <p className="text-base font-extrabold tracking-[0.01em] text-text">{title}</p>
            <div className="mt-2.5 flex flex-wrap items-end gap-1.5">
              <span className={`font-display text-[30px] font-extrabold leading-none tracking-tight ${primaryRow?.tone ?? 'text-primary'}`}>{metricNumber}</span>
              {metricUnit ? <span className="pb-0.5 text-xs font-extrabold text-muted">{metricUnit}</span> : null}
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-extrabold text-primary">
                {progress}% progress
              </span>
            </div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary transition-transform duration-300 group-hover:scale-105">
            <Icon className="h-4 w-4" />
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
      <article className="group flex overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card">
        <div className="flex w-full items-center overflow-x-auto">
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
    <article className="card p-5 transition hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">AI Assistance</h2>
            <p className="mt-2 text-sm text-muted">Hover each row to reveal KPI IDs behind the warning signal.</p>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div className="group relative flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3 transition hover:border-primary/30" key={row.label}>
            <span className="text-sm font-semibold">{row.label}</span>
            <span className="font-display text-2xl font-extrabold text-primary">{row.value}</span>
            <div className="pointer-events-none absolute right-4 top-[calc(100%+0.55rem)] z-10 hidden max-w-[340px] rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-card group-hover:block">
              {row.ids.length ? row.ids.map((id) => id.toUpperCase()).join(', ') : 'No KPI IDs flagged.'}
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
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="card p-5">
          <h2 className="mb-4 text-xl">Assigned KPIs</h2>
          <div className="space-y-3">
            {submissions.slice(0, 6).map((submission) => {
              const kpi = mockApi.getKpi(submission.kpiId)
              return <Link className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised p-4 transition hover:bg-primary-tint hover:text-primary" to={`/kpis/${submission.kpiId}/fill`} key={submission.id}><span className="font-semibold">{kpi?.name}</span><StatusPill value={submission.status} /></Link>
            })}
          </div>
        </article>
        <FocalPointAssignmentPanel submissions={submissions} />
      </section>
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
            { label: 'Queue Destination', value: 'Validation Queue', tone: 'font-extrabold text-text' },
          ]}
        />
        <PerformanceProgressCard
          title="Director Review"
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
        <FocalPointSubmissionPanel submissions={submissions} />
        <TargetActualPanel submissions={submissions} />
      </section>
      <ChartRow submissions={submissions} showRadar={false} />
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
      <article className="group flex overflow-hidden rounded-[24px] border border-border bg-surface px-4 py-3 shadow-soft transition hover:border-primary/35 hover:shadow-card">
        <div className="flex w-full items-center overflow-x-auto">
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
          <h2 className="text-xl font-extrabold">Focal Points Progress</h2>
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

function DirectorPerformanceWidget({ submissions }: { submissions: KpiSubmission[] }) {
  const scored = submissions.filter((submission) => submission.actualScore !== undefined)
  const average = Math.round(scored.reduce((sum, submission) => sum + (submission.actualScore ?? 0), 0) / Math.max(1, scored.length))
  const met = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore).length
  const notMet = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore < submission.targetScore).length
  const atRisk = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore < submission.targetScore * 0.75).length
  const noData = submissions.filter((submission) => submission.actualScore === undefined).length
  const rows = [
    { label: 'Average Score', value: `${average}%`, tone: 'text-primary' },
    { label: 'Met / Exceeded Target', value: met, tone: 'text-success' },
    { label: 'Not Met Target', value: notMet, tone: 'text-warning' },
    { label: 'At Risk', value: atRisk, tone: 'text-danger' },
    { label: 'No Data', value: noData, tone: 'text-muted' },
  ]

  return (
    <article className="card p-5 transition hover:shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Performance Widget</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div className="rounded-2xl border border-border bg-surface-raised p-4" key={row.label}>
            <p className={`font-display text-3xl font-extrabold ${row.tone}`}>{row.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{row.label}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

function DirectorAiAssistanceWidget({ submissions }: { submissions: KpiSubmission[] }) {
  const evidenceRisk = submissions.filter((submission) => submission.attachments.length === 0)
  const mismatch = submissions.filter((submission) => submission.actualScore !== undefined && submission.actualScore >= submission.targetScore && submission.attachments.length === 0)
  const weakNarrative = submissions.filter((submission) => submission.answers.some((answer) => answer.answer.trim().length > 0 && answer.answer.trim().length < 35))
  const rows = [
    { label: 'Department performance risks', value: submissions.filter((submission) => scoreHealth(submission) === 'critical' || scoreHealth(submission) === 'atRisk').length, ids: submissions.filter((submission) => scoreHealth(submission) === 'critical' || scoreHealth(submission) === 'atRisk').map((submission) => submission.kpiId) },
    { label: 'Weak analysis/challenges/recommendations', value: weakNarrative.length, ids: weakNarrative.map((submission) => submission.kpiId) },
    { label: 'Evidence quality risk', value: evidenceRisk.length, ids: evidenceRisk.map((submission) => submission.kpiId) },
    { label: 'Actual value not matching evidence', value: mismatch.length, ids: mismatch.map((submission) => submission.kpiId) },
  ]

  return (
    <article className="card p-5 transition hover:shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">AI Assistance Widget</h2>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div className="group relative flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3 transition hover:border-primary/30" key={row.label}>
            <span className="text-sm font-semibold">{row.label}</span>
            <span className="font-display text-2xl font-extrabold text-primary">{row.value}</span>
            <div className="pointer-events-none absolute right-4 top-[calc(100%+0.55rem)] z-10 hidden max-w-[340px] rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-card group-hover:block">
              {row.ids.length ? row.ids.map((id) => id.replace(/^kpi-/i, '').toUpperCase()).join(', ') : 'No affected KPI IDs.'}
            </div>
          </div>
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
      <DirectorCycleSubmissionWidget submissions={submissions} activeCycleId={activeCycleId} />
      <section className="grid gap-4 xl:grid-cols-3">
        <PerformanceProgressCard
          title="Review Summary"
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
        <DirectorPerformanceWidget submissions={submissions} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <DirectorAiAssistanceWidget submissions={submissions} />
        <RadarPanel submissions={submissions} />
      </section>
      <ChartRow submissions={submissions} />
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
  const averageScore = Math.round(submissions.reduce((sum, item) => sum + (item.actualScore ?? 0), 0) / Math.max(1, submissions.length))
  const title = orgWide ? 'DGE enterprise command view' : `${sector?.name ?? 'Sector'} performance view`
  return (
    <div className="space-y-5">
      <Hero
        eyebrow={orgWide ? 'Director General Dashboard' : 'Sector Executive Director Dashboard'}
        title={title}
        copy={orgWide ? 'Enterprise-wide view across every sector, department, KPI, and current approval movement.' : `Sector view for ${sector?.name ?? 'assigned sector'} with all linked departments and KPI records.`}
        chips={orgWide
          ? [{ label: 'Sectors', value: sectors.length }, { label: 'Departments', value: scopedDepartments.length }, { label: 'KPIs', value: scopedKpis.length }]
          : [{ label: 'Sector', value: sector?.name ?? 'Unassigned' }, { label: 'Departments', value: scopedDepartments.length }, { label: 'KPIs', value: scopedKpis.length }]}
      />
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={orgWide ? 'Enterprise KPIs' : 'Sector KPIs'} value={scopedKpis.length} detail={orgWide ? 'Across all sectors' : 'Across sector departments'} icon={Target} color={tones[0]} index={0} />
        <MetricCard label="Departments Covered" value={scopedDepartments.length} detail={orgWide ? 'All departments' : 'Sector departments'} icon={Building2} color={tones[1]} index={1} />
        <MetricCard label="Performance Score" value={`${averageScore}%`} detail="Current actual average" icon={TrendingUp} color={tones[2]} index={2} />
        <MetricCard label="Published KPIs" value={count(submissions, 'published')} detail="Final visibility" icon={CheckCircle2} color={tones[3]} index={3} />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <DepartmentPortfolioPanel
          eyebrow={orgWide ? 'Enterprise Departments' : 'Sector Departments'}
          title={orgWide ? 'All department KPI coverage' : `${sector?.name ?? 'Sector'} department coverage`}
          departments={scopedDepartments}
          kpis={scopedKpis}
          submissions={submissions}
        />
        <DepartmentKpiRadarPanel
          departments={scopedDepartments}
          kpis={scopedKpis}
          submissions={submissions}
          title={orgWide ? 'Department KPI spider view' : 'Sector department KPI spider view'}
        />
      </section>
      {orgWide ? <SectorCoverageChart submissions={allCycleSubmissions} /> : null}
      <ChartRow submissions={submissions} />
    </div>
  )
}

export function DashboardPage() {
  useAppStore()
  const user = mockApi.getCurrentUser()
  if (user.role === 'admin') return <AdminDashboard />
  if (user.role === 'focal_point') return <FocalPointDashboard />
  if (user.role === 'performance_team') return <PerformanceDashboard />
  if (user.role === 'department_director') return <DirectorDashboard />
  if (user.role === 'director_general') return <ExecutiveDashboard orgWide />
  return <ExecutiveDashboard />
}
