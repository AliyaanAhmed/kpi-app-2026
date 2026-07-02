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
  Layers3,
  Send,
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
import type { Cycle, Department, Kpi, KpiSubmission, SubmissionStatus } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

const tones = ['#ef5b74', '#d9963d', '#a855f7', '#5cb784', '#68a9e6']

const scoreBands = [
  { label: 'Met / Exceeded', range: '90-100', color: '#5cb784', test: (score?: number) => (score ?? 0) >= 90 },
  { label: 'On Track', range: '75-89', color: '#68a9e6', test: (score?: number) => (score ?? 0) >= 75 && (score ?? 0) < 90 },
  { label: 'Needs Attention', range: '60-74', color: '#d9963d', test: (score?: number) => (score ?? 0) >= 60 && (score ?? 0) < 75 },
  { label: 'Critical', range: '0-59', color: '#ef5b74', test: (score?: number) => score !== undefined && score < 60 },
  { label: 'No Data', range: '-', color: '#8d7f82', test: (score?: number) => score === undefined },
]

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
        pending: 0,
        submitted: 0,
      }
      existing.kpiCount += 1
      if (['active', 'draft', 'clarification_focal', 'clarification_director'].includes(submission.status)) existing.pending += 1
      else existing.submitted += 1
      map.set(department.id, existing)
      return map
    }, new Map<string, { id: string; name: string; kpiCount: number; pending: number; submitted: number }>()),
  ).map(([, value]) => value)
  return (
    <article className="card p-5 transition hover:shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Departments assigned to me</h2>
          <p className="mt-2 text-sm text-muted">Departments and KPI workload linked to this focal point for the active cycle.</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Building2 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {departmentRows.map((row, index) => {
          const progress = Math.round((row.submitted / Math.max(1, row.kpiCount)) * 100)
          return (
            <motion.div
              className="group rounded-2xl border border-border bg-surface-raised p-3 transition hover:-translate-y-0.5 hover:border-primary/30"
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold transition group-hover:text-primary">{row.name}</p>
                  <p className="mt-1 text-xs text-muted">{row.kpiCount} KPIs assigned</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">{progress}%</p>
                  <p className="text-xs text-muted">moved</p>
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
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">{row.pending} pending</span>
                <span className="font-semibold text-success">{row.submitted} submitted</span>
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
  onSubmit,
}: {
  submissions: KpiSubmission[]
  onSubmit: () => void
}) {
  const cycle = mockApi.getActiveCycle()
  const actionableStatuses: SubmissionStatus[] = ['draft']
  const activeCount = submissions.filter((submission) => submission.status === 'active').length
  const readyCount = submissions.filter((submission) => submission.status === 'draft').length
  const clarificationCount = submissions.filter((submission) => ['clarification_focal', 'clarification_director'].includes(submission.status)).length
  const submittedCount = submissions.filter((submission) => ['submitted', 'with_performance_team', 'submitted_to_director', 'director_approved', 'published'].includes(submission.status)).length
  const actionableCount = submissions.filter((submission) => actionableStatuses.includes(submission.status)).length
  const allReady = submissions.length > 0 && actionableCount === submissions.length && clarificationCount === 0
  const dueDate = cycle?.endDate ? new Date(`${cycle.endDate}T00:00:00`) : undefined
  const daysRemaining = dueDate ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)) : 0

  return (
    <section className="overflow-hidden rounded-[24px] border border-primary/20 bg-surface px-4 py-3 transition hover:shadow-premium">
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
                {submissions.length} KPIs in cycle, <span className="text-primary">{activeCount} active</span>,{' '}
                <span className="text-info">{readyCount} draft</span>,{' '}
                <span className="text-warning">{clarificationCount} clarification</span>,{' '}
                <span className="text-success">{submittedCount} submitted onward</span>
              </p>
            </div>
          </div>
          <button
            className="btn-primary ml-auto h-11 shrink-0 rounded-[18px] px-4"
            disabled={!allReady}
            onClick={onSubmit}
            title={allReady ? 'Submit all drafted KPIs to Performance Team' : 'All assigned KPIs must be saved as Draft first.'}
            type="button"
          >
            Submit to Performance Team <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
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

function FocalPointCycleNotice({ alerts }: { alerts: FocalPointCycleAlert[] }) {
  const totalKpis = alerts.reduce((sum, alert) => sum + alert.kpis.length, 0)
  const departmentCount = new Set(alerts.flatMap((alert) => alert.departments.map((department) => department.id))).size

  return (
    <motion.aside
      className="group relative overflow-hidden rounded-[28px] border border-primary/20 bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition group-hover:scale-105">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">
            {alerts.length} same-year cycle{alerts.length > 1 ? 's' : ''} need your attention
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Admin has initiated KPI work that includes your focal point assignments.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-surface-raised p-3">
          <p className="font-display text-3xl font-extrabold">{totalKpis}</p>
          <p className="text-xs font-semibold text-muted">Assigned KPIs</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-3">
          <p className="font-display text-3xl font-extrabold">{departmentCount}</p>
          <p className="text-xs font-semibold text-muted">Departments</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {alerts.slice(0, 2).map((alert) => (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised px-3 py-2" key={alert.cycle.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{alert.cycle.label}</p>
              <p className="mt-0.5 text-xs text-muted">
                {alert.kpis.length} KPIs / {alert.departments.length} departments
              </p>
            </div>
            <span className="status-pill border-primary/15 bg-primary-tint text-primary">{alert.cycle.status}</span>
          </div>
        ))}
      </div>

      <Link className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover" to="/kpis">
        Review KPI assignments <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.aside>
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

function ChartRow({ submissions }: { submissions: KpiSubmission[] }) {
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
        <RadarPanel submissions={submissions} className="xl:col-span-2" />
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

function uniqueDepartmentCount(submissions: KpiSubmission[], statuses: SubmissionStatus[]) {
  return new Set(
    submissions
      .filter((submission) => statuses.includes(submission.status))
      .map((submission) => mockApi.getKpi(submission.kpiId)?.departmentId)
      .filter(Boolean),
  ).size
}

function uniqueFocalPointCount(submissions: KpiSubmission[], statuses: SubmissionStatus[]) {
  return new Set(submissions.filter((submission) => statuses.includes(submission.status)).map((submission) => submission.focalPointId)).size
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
      <section className={cycleAlerts.length ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]' : ''}>
        <Hero eyebrow="Focal Point Dashboard" title="My KPI submission desk" copy="Complete assigned KPI actuals, upload evidence, respond to clarifications, and submit back to the Performance Team." chips={[{ label: 'Assigned', value: submissions.length }, { label: 'Active', value: count(submissions, 'active') }, { label: 'Draft', value: count(submissions, 'draft') }]} />
        {cycleAlerts.length ? <FocalPointCycleNotice alerts={cycleAlerts} /> : null}
      </section>
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="KPIs To Submit" value={`${count(submissions, 'draft')}/${submissions.length}`} detail="Draft workload" icon={Clock3} color={tones[0]} index={0} />
        <MetricCard label="Submitted" value={count(submissions, 'with_performance_team')} detail="With Performance Team" icon={Send} color={tones[1]} index={1} />
        <MetricCard label="Clarifications" value={count(submissions, 'clarification_focal') + count(submissions, 'clarification_director')} detail="Action required" icon={Activity} color={tones[2]} index={2} />
        <MetricCard label="Published" value={count(submissions, 'published')} detail="Final visibility" icon={CheckCircle2} color={tones[3]} index={3} />
      </section>
      <FocalPointBulkSubmitPanel submissions={submissions} onSubmit={submitAll} />
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="card p-5">
          <h2 className="mb-4 text-xl">Assigned records</h2>
          <div className="space-y-3">
            {submissions.slice(0, 6).map((submission) => {
              const kpi = mockApi.getKpi(submission.kpiId)
              return <Link className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised p-4 transition hover:bg-primary-tint hover:text-primary" to={`/kpis/${submission.kpiId}/fill`} key={submission.id}><span className="font-semibold">{kpi?.name}</span><StatusPill value={submission.status} /></Link>
            })}
          </div>
        </article>
        <FocalPointAssignmentPanel submissions={submissions} />
      </section>
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
  const submissions = scopedSubmissions()
  const validationPending = count(submissions, 'with_performance_team')
  const pendingFocalPoints = uniqueFocalPointCount(submissions, ['with_performance_team'])
  const readyDirectorDepartments = uniqueDepartmentCount(submissions, ['submitted_to_director'])
  const approvedDepartments = uniqueDepartmentCount(submissions, ['director_approved'])
  const returnedKpis = count(submissions, 'clarification_focal') + count(submissions, 'clarification_director')
  const publishedDepartments = uniqueDepartmentCount(submissions, ['published'])

  return (
    <div className="space-y-5">
      <Hero eyebrow="Performance Team Dashboard" title="Validation command center" copy="Validate focal point submissions, raise clarifications, send ready items to directors, and publish approved KPI records." chips={[{ label: 'Pending', value: validationPending }, { label: 'Departments Ready', value: readyDirectorDepartments }, { label: 'Published', value: publishedDepartments }]} />
      <section className="grid gap-4 xl:grid-cols-5">
        <MetricCard label="Validation Pending" value={validationPending} detail={`${pendingFocalPoints} FPs`} icon={Clock3} color={tones[0]} index={0} action="Review KPI queue" />
        <MetricCard label="Ready for Submission to Directors" value={readyDirectorDepartments} detail="Departments" icon={Send} color={tones[1]} index={1} action="Open director handoff" />
        <MetricCard label="Approved by Directors" value={approvedDepartments} detail="Departments" icon={ShieldCheck} color={tones[3]} index={2} action="Prepare publish" />
        <MetricCard label="Rejected / Returned" value={returnedKpis} detail="KPIs" icon={Activity} color={tones[2]} index={3} action="Review returns" />
        <MetricCard label="Published" value={publishedDepartments} detail="Departments" icon={CheckCircle2} color={tones[4]} index={4} action="View published scope" />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <FocalPointSubmissionPanel submissions={submissions} />
        <TargetActualPanel submissions={submissions} />
      </section>
      <ChartRow submissions={submissions} />
    </div>
  )
}

function DirectorDashboard() {
  const submissions = scopedSubmissions()
  const user = mockApi.getCurrentUser()
  const department = user.departmentId ? mockApi.getDepartment(user.departmentId) : undefined
  return (
    <div className="space-y-5">
      <Hero eyebrow="Department Director Dashboard" title={department ? `${department.name} approval workspace` : 'Department approval workspace'} copy="Review validated KPI submissions for your assigned department and approve or return clarification." chips={[{ label: 'Department', value: department?.name ?? 'Unassigned' }, { label: 'Awaiting', value: count(submissions, 'submitted_to_director') }, { label: 'Approved', value: count(submissions, 'director_approved') }]} />
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Awaiting Review" value={count(submissions, 'submitted_to_director')} detail="Director queue" icon={Clock3} color={tones[0]} index={0} />
        <MetricCard label="Clarifications" value={count(submissions, 'clarification_director')} detail="Returned to Focal Point" icon={Activity} color={tones[1]} index={1} />
        <MetricCard label="Approved" value={count(submissions, 'director_approved')} detail="Back with Performance Team" icon={ShieldCheck} color={tones[3]} index={2} />
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
