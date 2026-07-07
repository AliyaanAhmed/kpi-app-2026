import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart as BarChartIcon,
  Bot,
  ChevronRight,
  Database,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppSelect } from '../../components/ui/AppSelect'
import { cn } from '../../lib/cn'

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const attentionFilters = [
  { key: '', label: 'All KPI Records' },
  { key: 'below', label: 'Below Target' },
  { key: 'met', label: 'Target Met' },
  { key: 'increasing', label: 'Increasing Trend' },
  { key: 'decreasing', label: 'Decreasing Trend' },
  { key: 'closest', label: 'Closest to Target' },
  { key: 'furthest', label: 'Furthest from Target' },
] as const

type Quarter = (typeof quarters)[number]
type QuarterFilter = Quarter | 'All'
type Screen = 'dge' | 'sector' | 'department'
type Band = 'met' | 'risk' | 'below' | 'nodata'

interface RawKpiRecord {
  Title: unknown
  KPIID: unknown
  KPICode: unknown
  FocalPoint: unknown
  Director: unknown
  MonthNumber: unknown
  Target: unknown
  Actual: unknown
  Score: unknown
  Analysis: unknown
  Challenges: unknown
  Recommendations: unknown
  PMComments: unknown
  DirectorComments: unknown
  DueDate: unknown
  Sector: unknown
  Department: unknown
  DataSource: unknown
}

interface ReportPayload {
  metadata: { year?: number; source?: string; rowCount?: number }
  records: RawKpiRecord[]
}

interface KpiRecord {
  title: string
  id: string
  code: string
  focalPoint: string
  director: string
  monthNumber: number
  quarter: Quarter
  target: number | null
  actual: number | null
  score: number | null
  analysis: string
  challenges: string
  recommendations: string
  pmComments: string
  directorComments: string
  dueDate: string
  sector: string
  department: string
  dataSource: string
  key: string
}

interface EntityMetric {
  name: string
  count: number
  avg: number | null
  met: number
  risk: number
  below: number
  noData: number
  rows: KpiRecord[]
  trend: Array<number | null>
}

interface KpiMetric {
  key: string
  title: string
  rows: KpiRecord[]
  selected: KpiRecord
  trend: Array<number | null>
}

interface AggregateMetric {
  count: number
  avg: number | null
  met: number
  risk: number
  below: number
  noData: number
}

export function GovDigitalPerformanceReport() {
  const [payload, setPayload] = useState<ReportPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState('2025')
  const [quarter, setQuarter] = useState<QuarterFilter>('All')
  const [cycle, setCycle] = useState<QuarterFilter>('All')
  const [screen, setScreen] = useState<Screen>('dge')
  const [sector, setSector] = useState('')
  const [department, setDepartment] = useState('')
  const [dgeSector, setDgeSector] = useState('')
  const [attention, setAttention] = useState('')
  const [expandedKpi, setExpandedKpi] = useState('')
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('Select a suggested question or ask one in your own words.')

  useEffect(() => {
    let cancelled = false
    fetch('/govdigital-kpi-performance-data.json')
      .then((response) => response.json() as Promise<ReportPayload>)
      .then((data) => {
        if (cancelled) return
        setPayload(data)
        setYear(String(data.metadata.year ?? 2025))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const records = useMemo(() => (payload?.records ?? []).map(normalizeRecord).filter(Boolean) as KpiRecord[], [payload])
  const activeQuarter = cycle === 'All' ? quarter : cycle
  const scopedRows = useMemo(
    () => filterRows(records, { quarter: activeQuarter, sector: screen === 'dge' ? '' : sector, department: screen === 'department' ? department : '' }),
    [activeQuarter, department, records, screen, sector],
  )
  const allQuarterScopedRows = useMemo(
    () => records.filter((row) => (!sector || row.sector === sector) && (!department || row.department === department)),
    [department, records, sector],
  )
  const metrics = useMemo(() => aggregate(scopedRows), [scopedRows])
  const sectorItems = useMemo(() => byField(filterRows(records, { quarter: activeQuarter }), 'sector'), [activeQuarter, records])
  const selectedDgeSector = dgeSector || sectorItems[0]?.name || ''
  const selectedDgeDepartments = useMemo(() => {
    if (!selectedDgeSector) return []
    return byField(filterRows(records, { quarter: activeQuarter, sector: selectedDgeSector }), 'department')
  }, [activeQuarter, records, selectedDgeSector])
  const departmentItems = useMemo(() => (sector ? byField(filterRows(records, { quarter: activeQuarter, sector }), 'department') : []), [activeQuarter, records, sector])
  const kpis = useMemo(() => byKpi(scopedRows).sort(sortKpis), [scopedRows])
  const attentionCounts = useMemo(() => getAttentionCounts(kpis), [kpis])
  const visibleKpis = useMemo(() => filterKpisByAttention(kpis, attention), [attention, kpis])

  if (isLoading) {
    return <ReportSkeleton />
  }

  if (!records.length) {
    return (
      <section className="raised-card p-8 text-center">
        <Database className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-2xl">KPI performance dataset unavailable</h2>
        <p className="mt-2 text-sm text-muted">The report dataset could not be loaded for this local preview.</p>
      </section>
    )
  }

  const goDge = () => {
    setScreen('dge')
    setSector('')
    setDepartment('')
    setAttention('')
    setExpandedKpi('')
  }
  const goSector = (nextSector: string) => {
    setScreen('sector')
    setSector(nextSector)
    setDepartment('')
    setAttention('')
    setExpandedKpi('')
  }
  const goDepartment = (nextSector: string, nextDepartment: string) => {
    setScreen('department')
    setSector(nextSector)
    setDepartment(nextDepartment)
    setAttention('')
    setExpandedKpi('')
  }
  const ask = (question = query) => {
    const next = question.trim()
    if (!next) return
    setQuery(next)
    setAnswer(answerQuestion(next, { rows: scopedRows, allRows: allQuarterScopedRows, screen, sector, department }))
  }

  return (
    <div className="dashboard-page space-y-5">
      <section className="raised-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary-tint px-3 py-1 text-xs font-extrabold text-primary">Digital Performance</span>
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted">{payload?.metadata.source ?? 'GovDigital Dashboard 2025'}</span>
            </div>
            <h1 className="mt-3 text-3xl">KPI Performance Dashboard</h1>
            <p className="mt-2 max-w-4xl text-sm font-normal text-text">
              Executive view of sector performance, quarter movement, KPI risk, and supporting governance narratives.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:w-[520px]">
            <AppSelect value={year} onValueChange={setYear} options={[{ value: '2025', label: '2025' }]} />
            <AppSelect value={quarter} onValueChange={(value) => setQuarter(value as QuarterFilter)} options={[{ value: 'All', label: 'All Quarters' }, ...quarters.map((item) => ({ value: item, label: `${item} 2025` }))]} />
            <AppSelect value={cycle} onValueChange={(value) => setCycle(value as QuarterFilter)} options={[{ value: 'All', label: 'All 2025' }, ...quarters.map((item) => ({ value: item, label: `${item} Cycle` }))]} />
          </div>
        </div>
      </section>

      <Breadcrumb screen={screen} sector={sector} department={department} onDge={goDge} onSector={() => goSector(sector)} />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0 space-y-5">
          <ScreenHeader screen={screen} sector={sector} department={department} quarter={activeQuarter} />
          <SummaryCards metrics={metrics} kpis={kpis} rows={allQuarterScopedRows.length ? allQuarterScopedRows : scopedRows} />

          <AnimatePresence mode="wait">
            {screen === 'dge' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="dge">
                <AiSummaryPanel text={aiSummary('dge', scopedRows)} />
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-4">
                    <SectionTitle title="DGE Performance" subtitle="Sector performance overview across the selected reporting period." />
                    <div className="grid gap-4 md:grid-cols-2">
                      {sectorItems.map((item) => <EntityCard item={item} key={item.name} onClick={() => goSector(item.name)} type="sector" />)}
                    </div>
                  </div>
                  <PerformanceDistribution metrics={metrics} />
                </section>
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <DgePerformancePanel
                    departments={selectedDgeDepartments}
                    onDepartment={(name) => goDepartment(selectedDgeSector, name)}
                    onSector={(name) => setDgeSector(name)}
                    selectedSector={selectedDgeSector}
                    sectors={sectorItems}
                  />
                  <TrendPanel rows={scopedRows} title="Sector Performance" />
                </section>
                <KpiWorkspace attention={attention} counts={attentionCounts} kpis={visibleKpis} onAttention={setAttention} onExpand={setExpandedKpi} expandedKpi={expandedKpi} totalCount={kpis.length} />
              </motion.div>
            )}

            {screen === 'sector' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="sector">
                <AiSummaryPanel text={aiSummary('sector', scopedRows)} />
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-4">
                    <SectionTitle title="Department portfolio" subtitle="Select a department to open KPI-level detail and narratives." />
                    <div className="grid gap-4 md:grid-cols-2">
                      {departmentItems.map((item) => <EntityCard item={item} key={item.name} onClick={() => goDepartment(sector, item.name)} type="department" />)}
                    </div>
                  </div>
                  <PerformanceDistribution metrics={metrics} />
                </section>
                <section className="grid gap-5 xl:grid-cols-2">
                  <TrendPanel rows={allQuarterScopedRows} title="Quarter Trend" />
                  <RankingPanel items={departmentItems} />
                </section>
                <KpiWorkspace attention={attention} counts={attentionCounts} kpis={visibleKpis} onAttention={setAttention} onExpand={setExpandedKpi} expandedKpi={expandedKpi} totalCount={kpis.length} />
              </motion.div>
            )}

            {screen === 'department' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="department">
                <AiSummaryPanel text={aiSummary('department', scopedRows)} />
                <section className="grid gap-5 xl:grid-cols-2">
                  <TrendPanel rows={allQuarterScopedRows} title="Quarter Trend" />
                  <PerformanceDistribution metrics={metrics} />
                </section>
                <KpiWorkspace attention={attention} counts={attentionCounts} kpis={visibleKpis} onAttention={setAttention} onExpand={setExpandedKpi} expandedKpi={expandedKpi} totalCount={kpis.length} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside className="space-y-5">
          <AiQueryPanel answer={answer} context={contextLabel(screen, sector, department)} onAsk={ask} query={query} setQuery={setQuery} />
          <AdditionalAnalysis rows={scopedRows} allRows={allQuarterScopedRows} />
        </aside>
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <div className="raised-card h-32 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div className="card h-28 animate-pulse" key={index} />)}
      </div>
      <div className="card h-96 animate-pulse" />
    </div>
  )
}

function Breadcrumb({ screen, sector, department, onDge, onSector }: { screen: Screen; sector: string; department: string; onDge(): void; onSector(): void }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
      <button className="transition hover:text-primary" onClick={onDge} type="button">DGE Overview</button>
      {screen !== 'dge' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <button className="transition hover:text-primary" onClick={onSector} type="button">{sector}</button>
        </>
      )}
      {screen === 'department' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-text">{department}</span>
        </>
      )}
    </nav>
  )
}

function ScreenHeader({ screen, sector, department, quarter }: { screen: Screen; sector: string; department: string; quarter: QuarterFilter }) {
  const title = screen === 'dge' ? 'DGE Overview' : screen === 'sector' ? sector : department
  const subtitle = screen === 'dge'
    ? 'Enterprise sector performance, distribution, and KPI-level risk records.'
    : screen === 'sector'
      ? 'Sector department performance, trend behavior, and KPI records.'
      : 'Department KPI records with AI summary, target movement, and review narratives.'
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{quarter === 'All' ? 'All 2025' : `${quarter} 2025`}</p>
          <h2 className="mt-1 text-2xl">{title}</h2>
          <p className="mt-2 text-sm font-normal text-text">{subtitle}</p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary-tint px-3 py-1.5 text-xs font-extrabold text-primary">{screen === 'dge' ? 'Executive view' : 'Drilldown active'}</span>
      </div>
    </section>
  )
}

function SummaryCards({ metrics, kpis, rows }: { metrics: AggregateMetric; kpis: KpiMetric[]; rows: KpiRecord[] }) {
  const trendSet = metricTrendSet(rows)
  const closest = closestKpiToTarget(kpis)
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Average Score" value={pct(metrics.avg)} note="Selected scope performance" tone="primary" trend={trendSet.average} />
      <MetricCard label="KPI Records" value={String(kpis.length || metrics.count)} note={`${metrics.count.toLocaleString()} quarter rows`} tone="info" />
      <MetricCard label="Met / Exceeded" value={metrics.met.toLocaleString()} note="At or above assigned target" tone="success" trend={trendSet.metRate} />
      <MetricCard label="Closest to Target" value={closest ? kpiCode(closest.selected) : 'N/A'} note={closest ? `${pct(closest.selected.score)} score` : 'No scored KPIs'} tone="warning" />
    </section>
  )
}

function MetricCard({ label, value, note, tone, trend }: { label: string; value: string; note: string; tone: 'primary' | 'success' | 'warning' | 'info'; trend?: Array<number | null> }) {
  const Icon = tone === 'success' ? TrendingUp : tone === 'warning' ? Target : tone === 'info' ? Database : BarChartIcon
  return (
    <article className="group rounded-[22px] border border-border bg-surface p-4 shadow-soft transition hover:border-primary/35 hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-extrabold text-text">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{note}</p>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105', toneClass(tone, 'soft'))}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && <MiniSparkline values={trend} />}
    </article>
  )
}

function AiSummaryPanel({ text }: { text: string }) {
  return (
    <section className="ai-panel">
      <div className="flex items-start gap-3">
        <div className="ai-icon h-11 w-11"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h3 className="ai-heading text-lg font-extrabold">AI Summary</h3>
          <p className="mt-1 text-sm font-normal leading-6 text-text">{text}</p>
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl">{title}</h2>
      <p className="mt-1 text-sm font-normal text-text">{subtitle}</p>
    </div>
  )
}

function EntityCard({ item, type, onClick }: { item: EntityMetric; type: 'sector' | 'department'; onClick(): void }) {
  const trend = trendDirection(item.trend)
  return (
    <button
      className={cn(
        'group w-full rounded-[22px] border border-border bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card',
        type === 'department' && 'rounded-[20px] p-3.5',
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('font-extrabold leading-6 text-text', type === 'sector' ? 'text-lg' : 'text-base')}>{item.name}</h3>
          <p className="mt-1 text-sm font-normal text-muted">{type === 'sector' ? 'Sector performance' : 'Department performance'}</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-sm font-extrabold', bandPillClass(performanceBand(item.avg)))}>{pct(item.avg)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={cn('text-sm font-extrabold', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-warning')}>{trendText(trend)}</span>
        <span className="text-sm font-semibold text-muted">{item.count.toLocaleString()} KPI records</span>
      </div>
      <TrendBars values={item.trend} />
      <DistributionBar metrics={item} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="Met" value={item.met} tone="success" />
        <MiniMetric label="At Risk" value={item.risk} tone="warning" />
        <MiniMetric label="Below" value={item.below} tone="danger" />
        <MiniMetric label="No Data" value={item.noData} tone="neutral" />
      </div>
    </button>
  )
}

function PerformanceDistribution({ metrics }: { metrics: AggregateMetric }) {
  const data = [
    { name: 'Met', value: metrics.met, fill: 'var(--success)' },
    { name: 'At Risk', value: metrics.risk, fill: 'var(--warning)' },
    { name: 'Below', value: metrics.below, fill: 'var(--danger)' },
    { name: 'No Data', value: metrics.noData, fill: 'var(--text-muted)' },
  ]
  return (
    <section className="card p-5">
      <SectionTitle title="Performance distribution" subtitle="Selected scope target status by KPI record." />
      <div className="mt-5 h-72">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={72} tickLine={false} axisLine={false} tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 700 }} />
            <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--primary) 8%, transparent)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }} />
            <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={18}>
              {data.map((entry) => <Cell fill={entry.fill} key={entry.name} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DistributionBar metrics={metrics} />
    </section>
  )
}

function DgePerformancePanel({ sectors, selectedSector, departments, onSector, onDepartment }: { sectors: EntityMetric[]; selectedSector: string; departments: EntityMetric[]; onSector(name: string): void; onDepartment(name: string): void }) {
  return (
    <section className="card p-5">
      <SectionTitle title="Sector Performance" subtitle="Select a sector to compare its departments." />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Sectors</p>
          {sectors.map((item) => <CompactPerformanceButton item={item} key={item.name} selected={item.name === selectedSector} onClick={() => onSector(item.name)} />)}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{selectedSector} Departments</p>
          {departments.slice(0, 8).map((item) => <CompactPerformanceButton item={item} key={item.name} onClick={() => onDepartment(item.name)} />)}
        </div>
      </div>
    </section>
  )
}

function CompactPerformanceButton({ item, selected, onClick }: { item: EntityMetric; selected?: boolean; onClick(): void }) {
  return (
    <button className={cn('flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-raised p-3 text-left transition hover:border-primary/35 hover:bg-primary-tint', selected && 'border-primary/40 bg-primary-tint')} onClick={onClick} type="button">
      <DonutMetric metrics={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-text">{item.name}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-muted">
          <span>{item.count.toLocaleString()} KPIs</span>
          <span className="text-success">{item.met.toLocaleString()} met</span>
          <span className="text-danger">{item.below.toLocaleString()} below</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-primary" />
    </button>
  )
}

function TrendPanel({ rows, title }: { rows: KpiRecord[]; title: string }) {
  const data = quarters.map((quarter) => {
    const metric = aggregate(rows.filter((row) => row.quarter === quarter))
    return { quarter, score: metric.avg === null ? null : Math.round(metric.avg * 100), met: metric.met, below: metric.below }
  })
  return (
    <section className="card p-5">
      <SectionTitle title={title} subtitle="Quarter-wise score movement based on selected scope." />
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
            <XAxis dataKey="quarter" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }} formatter={(value) => [`${value}%`, 'Score']} />
            <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function RankingPanel({ items }: { items: EntityMetric[] }) {
  const top = [...items].sort(sortByAvgDesc).slice(0, 6)
  const low = [...items].sort(sortByAvgAsc).slice(0, 6)
  return (
    <section className="card p-5">
      <SectionTitle title="Deeper Analysis" subtitle="Best and weakest departments in the selected sector." />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-extrabold text-text">Top performance</p>
          {top.map((item) => <RankingRow item={item} key={item.name} />)}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-extrabold text-text">Needs attention</p>
          {low.map((item) => <RankingRow item={item} key={item.name} />)}
        </div>
      </div>
    </section>
  )
}

function RankingRow({ item }: { item: EntityMetric }) {
  const width = item.avg === null ? 2 : Math.max(2, Math.min(100, item.avg * 100))
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-text">{item.name}</p>
        <span className="text-sm font-extrabold text-primary">{pct(item.avg)}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-primary-tint">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function KpiWorkspace({ attention, counts, kpis, totalCount, expandedKpi, onAttention, onExpand }: { attention: string; counts: Record<string, number>; kpis: KpiMetric[]; totalCount: number; expandedKpi: string; onAttention(value: string): void; onExpand(value: string): void }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionTitle title="KPI Filters" subtitle={`${kpis.length.toLocaleString()} of ${totalCount.toLocaleString()} KPI records visible.`} />
          <div className="relative xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field h-11 w-full pl-10" placeholder="Search in current KPI grid..." />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {attentionFilters.map((filter) => (
            <button
              className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-extrabold transition', attention === filter.key ? 'border-primary bg-primary text-white' : 'border-border bg-surface-raised text-text hover:border-primary hover:text-primary')}
              key={filter.key}
              onClick={() => onAttention(filter.key)}
              type="button"
            >
              {filter.label}
              <span className={cn('rounded-full px-2 py-0.5 text-xs', attention === filter.key ? 'bg-white/20 text-white' : 'bg-primary-tint text-primary')}>{counts[filter.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      <KpiGrid kpis={kpis} expandedKpi={expandedKpi} onExpand={onExpand} />
    </section>
  )
}

function KpiGrid({ kpis, expandedKpi, onExpand }: { kpis: KpiMetric[]; expandedKpi: string; onExpand(value: string): void }) {
  if (!kpis.length) return <div className="p-8 text-center text-sm font-semibold text-muted">No KPI records match the selected filters.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            <th className="px-5 py-3">KPI</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Actual</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Trend</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi) => (
            <KpiGridRow expanded={expandedKpi === kpi.key} key={kpi.key} kpi={kpi} onToggle={() => onExpand(expandedKpi === kpi.key ? '' : kpi.key)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KpiGridRow({ kpi, expanded, onToggle }: { kpi: KpiMetric; expanded: boolean; onToggle(): void }) {
  const row = kpi.selected
  const band = performanceBand(row.score)
  return (
    <>
      <tr className="border-b border-border bg-surface transition hover:bg-primary-tint/50">
        <td className="px-5 py-4">
          <button className="flex items-start gap-3 text-left" onClick={onToggle} type="button">
            <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-xs font-extrabold text-primary">{expanded ? '-' : '+'}</span>
            <span>
              <span className="inline-flex rounded-full border border-primary/20 bg-primary-tint px-2 py-0.5 text-xs font-extrabold text-primary">{kpiCode(row)}</span>
              <span className="mt-1 block max-w-[360px] text-sm font-extrabold text-text">{kpi.title}</span>
            </span>
          </button>
        </td>
        <td className="px-4 py-4 text-sm font-semibold text-text">{row.sector}</td>
        <td className="px-4 py-4 text-sm font-semibold text-text">{row.department}</td>
        <td className="px-4 py-4 font-mono text-sm font-bold text-text">{fmt(row.target)}</td>
        <td className="px-4 py-4 font-mono text-sm font-bold text-text">{fmt(row.actual)}</td>
        <td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-sm font-extrabold', bandPillClass(band))}>{pct(row.score)}</span></td>
        <td className="px-4 py-4"><MiniSparkline values={kpi.trend} compact /></td>
        <td className="px-4 py-4 text-sm font-semibold text-text">{row.focalPoint || 'Unassigned'}</td>
        <td className="px-4 py-4">
          <button className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-extrabold text-primary transition hover:border-primary" onClick={onToggle} type="button">
            {expanded ? 'Hide detail' : 'View detail'} <ChevronRight className={cn('h-3.5 w-3.5 transition', expanded && 'rotate-90')} />
          </button>
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={9} className="bg-primary-tint/30 p-0">
              <motion.div animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden" exit={{ opacity: 0, height: 0 }} initial={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}>
                <KpiExpandedDetail kpi={kpi} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function KpiExpandedDetail({ kpi }: { kpi: KpiMetric }) {
  const row = kpi.selected
  const tags = tagsForKpi(kpi)
  return (
    <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[22px] border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="ai-icon h-10 w-10"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h3 className="ai-heading text-base font-extrabold">AI Summary</h3>
            <p className="mt-2 text-sm leading-6 text-text">{kpiAiSummary(kpi)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <NarrativeBlock label="Analysis" value={row.analysis} />
          <NarrativeBlock label="Challenges" value={row.challenges} />
          <NarrativeBlock label="Recommendations" value={row.recommendations} />
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Performance Team Comment</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-text">{row.pmComments || 'No comment recorded.'}</p>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-[22px] border border-border bg-surface p-4 shadow-soft">
          <h3 className="text-base font-extrabold">KPI Snapshot</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kv label="KPI ID" value={row.id} />
            <Kv label="KPI Code" value={row.code} />
            <Kv label="Quarter" value={row.quarter} />
            <Kv label="Data Source" value={row.dataSource} />
            <Kv label="Target" value={fmt(row.target)} />
            <Kv label="Actual" value={fmt(row.actual)} />
            <Kv label="Score" value={pct(row.score)} />
            <Kv label="Target Status" value={bandLabel(performanceBand(row.score))} />
          </div>
        </section>
        <section className="rounded-[22px] border border-border bg-surface p-4 shadow-soft">
          <h3 className="text-base font-extrabold">AI Tags</h3>
          <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span className="ai-chip" key={tag}>{tag}</span>)}</div>
          <div className="mt-4 space-y-2">
            {quarters.map((quarter, index) => <QuarterRow key={quarter} quarter={quarter} value={kpi.trend[index]} />)}
          </div>
        </section>
      </aside>
    </div>
  )
}

function AiQueryPanel({ answer, context, query, setQuery, onAsk }: { answer: string; context: string; query: string; setQuery(value: string): void; onAsk(question?: string): void }) {
  const suggestions = ['Which sectors improved from Q2 to Q3?', 'Show below target departments', 'What are the strongest performance areas?']
  return (
    <section className="ai-panel">
      <div className="flex items-start gap-3">
        <div className="ai-icon h-11 w-11"><Bot className="h-5 w-5" /></div>
        <div>
          <p className="eyebrow">AI Query</p>
          <h2 className="ai-heading text-xl">Ask Performance Data</h2>
          <p className="mt-1 text-xs font-semibold text-muted">{context}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input className="field h-11 min-w-0 flex-1" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAsk() }} placeholder="Ask about sectors, departments, trends, or KPI risks" value={query} />
        <button className="btn-primary h-11 px-4" onClick={() => onAsk()} type="button">Ask</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((item) => <button className="ai-chip transition hover:scale-[1.02]" key={item} onClick={() => onAsk(item)} type="button">{item}</button>)}
      </div>
      <div className="ai-surface mt-4">
        <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-text">{answer}</p>
      </div>
    </section>
  )
}

function AdditionalAnalysis({ rows, allRows }: { rows: KpiRecord[]; allRows: KpiRecord[] }) {
  const movement = movementSummary(allRows)
  const pmMissing = rows.filter((row) => !row.pmComments).length
  const underTarget = rows.filter((row) => row.score !== null && row.score < 1).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  return (
    <section className="card p-5">
      <SectionTitle title="Additional Analysis" subtitle="Governance risks and quarter movement." />
      <div className="mt-4 grid gap-3">
        <AnalysisCard label="Q2 to Q3 improving" value={movement.improved.toLocaleString()} note="KPI records with positive quarter movement." />
        <AnalysisCard label="Q2 to Q3 declining" value={movement.declined.toLocaleString()} note="KPI records requiring follow-up." />
        <AnalysisCard label="Missing PM comments" value={pmMissing.toLocaleString()} note="Records without performance team comment." />
        <AnalysisCard label="Largest target gap" value={underTarget[0] ? kpiCode(underTarget[0]) : 'N/A'} note={underTarget[0] ? `${underTarget[0].title.slice(0, 72)}...` : 'No below-target records.'} />
      </div>
    </section>
  )
}

function AnalysisCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <p className="text-sm font-extrabold text-text">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-muted">{note}</p>
    </div>
  )
}

function NarrativeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <p className="text-sm font-extrabold text-text">{label}:</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-normal leading-6 text-text">{value || 'No narrative recorded.'}</p>
    </div>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-text">{value}</p>
    </div>
  )
}

function QuarterRow({ quarter, value }: { quarter: Quarter; value: number | null }) {
  const width = value === null ? 2 : Math.max(2, Math.min(100, value * 100))
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs font-extrabold text-muted">{quarter}</span>
      <div className="h-2 flex-1 rounded-full bg-primary-tint">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-extrabold text-text">{pct(value)}</span>
    </div>
  )
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  return (
    <div className={cn('rounded-2xl border p-3', toneClass(tone, 'box'))}>
      <p className="text-lg font-extrabold">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  )
}

function DistributionBar({ metrics }: { metrics: Pick<AggregateMetric, 'count' | 'met' | 'risk' | 'below' | 'noData'> }) {
  const total = Math.max(1, metrics.count)
  return (
    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-raised">
      <span className="bg-success" style={{ width: `${(metrics.met / total) * 100}%` }} />
      <span className="bg-warning" style={{ width: `${(metrics.risk / total) * 100}%` }} />
      <span className="bg-danger" style={{ width: `${(metrics.below / total) * 100}%` }} />
      <span className="bg-muted" style={{ width: `${(metrics.noData / total) * 100}%` }} />
    </div>
  )
}

function TrendBars({ values }: { values: Array<number | null> }) {
  return (
    <div className="mt-4 flex h-12 items-end gap-1">
      {quarters.map((quarter, index) => {
        const value = values[index]
        const height = value === null ? 14 : Math.max(16, Math.min(48, value * 42))
        return <span className={cn('flex-1 rounded-t-lg', bandFillClass(performanceBand(value)))} key={quarter} style={{ height }} title={`${quarter}: ${pct(value)}`} />
      })}
    </div>
  )
}

function MiniSparkline({ values, compact }: { values: Array<number | null>; compact?: boolean }) {
  const numeric = values.map((value, index) => ({ value, index })).filter((point): point is { value: number; index: number } => valueIsNumber(point.value))
  if (!numeric.length) return <div className={cn('rounded-full bg-primary-tint', compact ? 'h-2 w-24' : 'mt-4 h-2 w-full')} />
  const width = compact ? 104 : 180
  const height = compact ? 34 : 44
  const min = Math.min(...numeric.map((point) => point.value))
  const max = Math.max(...numeric.map((point) => point.value))
  const span = max - min || 1
  const points = numeric.map((point) => {
    const x = 4 + (point.index / Math.max(1, quarters.length - 1)) * (width - 8)
    const y = height - 4 - ((point.value - min) / span) * (height - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className={cn('text-primary', compact ? 'h-9 w-28' : 'mt-4 h-12 w-full')} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={compact ? 3 : 2.8} />
    </svg>
  )
}

function DonutMetric({ metrics }: { metrics: Pick<AggregateMetric, 'count' | 'met' | 'below'> }) {
  const total = Math.max(1, metrics.count)
  const metDegrees = Math.max(0, Math.min(360, (metrics.met / total) * 360))
  const belowEnd = Math.max(metDegrees, Math.min(360, metDegrees + (metrics.below / total) * 360))
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-text"
      style={{ background: `conic-gradient(var(--success) 0deg ${metDegrees}deg, var(--danger) ${metDegrees}deg ${belowEnd}deg, var(--border) ${belowEnd}deg 360deg)` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface">{pct(metrics.count ? metrics.met / metrics.count : null)}</span>
    </span>
  )
}

function normalizeRecord(row: RawKpiRecord): KpiRecord | null {
  const title = clean(row.Title)
  if (!title) return null
  const monthNumber = Number(row.MonthNumber) || 0
  const quarter = monthNumber <= 3 ? 'Q1' : monthNumber <= 6 ? 'Q2' : monthNumber <= 9 ? 'Q3' : 'Q4'
  const code = clean(row.KPICode)
  const id = clean(row.KPIID)
  return {
    title,
    id,
    code,
    focalPoint: clean(row.FocalPoint),
    director: clean(row.Director),
    monthNumber,
    quarter,
    target: toNumber(row.Target),
    actual: toNumber(row.Actual),
    score: toNumber(row.Score),
    analysis: clean(row.Analysis),
    challenges: clean(row.Challenges),
    recommendations: clean(row.Recommendations),
    pmComments: clean(row.PMComments),
    directorComments: clean(row.DirectorComments),
    dueDate: clean(row.DueDate),
    sector: clean(row.Sector) || 'Unassigned Sector',
    department: clean(row.Department) || 'Unassigned Department',
    dataSource: clean(row.DataSource) || 'Synthetic',
    key: `${code || id}-${title}`.toLowerCase(),
  }
}

function filterRows(rows: KpiRecord[], filters: { quarter?: QuarterFilter; sector?: string; department?: string }) {
  return rows.filter((row) => (!filters.quarter || filters.quarter === 'All' || row.quarter === filters.quarter) && (!filters.sector || row.sector === filters.sector) && (!filters.department || row.department === filters.department))
}

function aggregate(rows: KpiRecord[]): AggregateMetric {
  const scores = rows.map((row) => row.score).filter(valueIsNumber)
  return rows.reduce<AggregateMetric>(
    (total, row) => {
      const band = performanceBand(row.score)
      total[band === 'nodata' ? 'noData' : band] += 1
      return total
    },
    { count: rows.length, avg: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null, met: 0, risk: 0, below: 0, noData: 0 },
  )
}

function byField(rows: KpiRecord[], field: 'sector' | 'department'): EntityMetric[] {
  const groups = new Map<string, KpiRecord[]>()
  rows.forEach((row) => {
    const key = row[field] || 'Unassigned'
    groups.set(key, [...(groups.get(key) ?? []), row])
  })
  return [...groups.entries()].map(([name, groupRows]) => ({ name, rows: groupRows, trend: entityTrend(rows, field, name), ...aggregate(groupRows) })).sort(sortByAvgDesc)
}

function byKpi(rows: KpiRecord[]): KpiMetric[] {
  const groups = new Map<string, KpiRecord[]>()
  rows.forEach((row) => groups.set(row.key, [...(groups.get(row.key) ?? []), row]))
  return [...groups.entries()].map(([key, groupRows]) => {
    const sortedRows = [...groupRows].sort((a, b) => a.monthNumber - b.monthNumber)
    return { key, title: sortedRows[0].title, rows: sortedRows, selected: pickDisplayRow(sortedRows), trend: currentTrend(sortedRows) }
  })
}

function pickDisplayRow(rows: KpiRecord[]) {
  return [...rows].reverse().find((row) => row.score !== null) ?? rows[rows.length - 1]
}

function entityTrend(rows: KpiRecord[], field: 'sector' | 'department', name: string) {
  return quarters.map((quarter) => aggregate(rows.filter((row) => row.quarter === quarter && row[field] === name)).avg)
}

function currentTrend(rows: KpiRecord[]) {
  return quarters.map((quarter) => aggregate(rows.filter((row) => row.quarter === quarter)).avg)
}

function metricTrendSet(rows: KpiRecord[]) {
  return {
    average: quarters.map((quarter) => aggregate(rows.filter((row) => row.quarter === quarter)).avg),
    metRate: quarters.map((quarter) => {
      const metric = aggregate(rows.filter((row) => row.quarter === quarter))
      return metric.count ? metric.met / metric.count : null
    }),
  }
}

function performanceBand(score: number | null): Band {
  if (score === null || score < 0) return 'nodata'
  if (score >= 1) return 'met'
  if (score >= 0.8) return 'risk'
  return 'below'
}

function getAttentionCounts(kpis: KpiMetric[]) {
  const closest = closestKpiToTarget(kpis)
  const furthest = furthestKpiFromTarget(kpis)
  return {
    '': kpis.length,
    below: kpis.filter((kpi) => performanceBand(kpi.selected.score) === 'below').length,
    met: kpis.filter((kpi) => performanceBand(kpi.selected.score) === 'met').length,
    increasing: kpis.filter((kpi) => trendDirection(kpi.trend) === 'up').length,
    decreasing: kpis.filter((kpi) => trendDirection(kpi.trend) === 'down').length,
    closest: closest ? 1 : 0,
    furthest: furthest ? 1 : 0,
  }
}

function filterKpisByAttention(kpis: KpiMetric[], attention: string) {
  if (!attention) return kpis
  if (attention === 'closest') {
    const closest = closestKpiToTarget(kpis)
    return closest ? [closest] : []
  }
  if (attention === 'furthest') {
    const furthest = furthestKpiFromTarget(kpis)
    return furthest ? [furthest] : []
  }
  return kpis.filter((kpi) => attentionMatches(kpi, attention))
}

function attentionMatches(kpi: KpiMetric, attention: string) {
  const band = performanceBand(kpi.selected.score)
  const direction = trendDirection(kpi.trend)
  return (attention === 'below' && band === 'below') || (attention === 'met' && band === 'met') || (attention === 'increasing' && direction === 'up') || (attention === 'decreasing' && direction === 'down')
}

function closestKpiToTarget(kpis: KpiMetric[]) {
  return targetGapKpis(kpis)[0]
}

function furthestKpiFromTarget(kpis: KpiMetric[]) {
  const sorted = targetGapKpis(kpis)
  return sorted[sorted.length - 1]
}

function targetGapKpis(kpis: KpiMetric[]) {
  return kpis.filter((kpi) => kpi.selected.score !== null && kpi.selected.score < 1).sort((a, b) => Math.abs(1 - (a.selected.score ?? 0)) - Math.abs(1 - (b.selected.score ?? 0)))
}

function tagsForKpi(kpi: KpiMetric) {
  const tags: string[] = []
  const band = performanceBand(kpi.selected.score)
  const direction = trendDirection(kpi.trend)
  const belowCount = kpi.trend.filter((score) => score !== null && score < 0.8).length
  if (band === 'below') tags.push('Below target')
  if (belowCount >= 2) tags.push('Repeated underperformance')
  if (band === 'nodata') tags.push('No data')
  if (direction === 'up') tags.push('Improving trend')
  if (direction === 'down') tags.push('Declining trend')
  return tags.length ? tags : ['Stable']
}

function aiSummary(level: Screen, rows: KpiRecord[]) {
  const metric = aggregate(rows)
  const direction = trendText(trendDirection(currentTrend(rows))).toLowerCase()
  if (level === 'dge') {
    const sectors = byField(rows, 'sector')
    return `Enterprise performance is ${pct(metric.avg)} across ${metric.count.toLocaleString()} KPI records with ${metric.met.toLocaleString()} met or exceeded and ${metric.below.toLocaleString()} below target. The quarter trend is ${direction}. Strongest sector: ${sectors[0]?.name ?? 'N/A'}.`
  }
  if (level === 'sector') {
    const departments = byField(rows, 'department')
    return `${departments.length.toLocaleString()} departments are visible in this sector. Average score is ${pct(metric.avg)}, with ${metric.risk.toLocaleString()} watch records and ${metric.noData.toLocaleString()} no-data records.`
  }
  const kpis = byKpi(rows)
  const repeated = kpis.filter((kpi) => tagsForKpi(kpi).includes('Repeated underperformance')).length
  return `This department has ${kpis.length.toLocaleString()} KPI records in scope. Average score is ${pct(metric.avg)} with ${repeated.toLocaleString()} repeated underperformance signals.`
}

function kpiAiSummary(kpi: KpiMetric) {
  const tags = tagsForKpi(kpi)
  const direction = trendText(trendDirection(kpi.trend)).toLowerCase()
  return `This KPI is currently ${pct(kpi.selected.score)} and ${direction} across available quarters. AI tags: ${tags.join(', ')}.`
}

function answerQuestion(question: string, context: { rows: KpiRecord[]; allRows: KpiRecord[]; screen: Screen; sector: string; department: string }) {
  const q = question.toLowerCase()
  if (q.includes('improve')) {
    const list = improvementList(context.allRows, context.screen === 'department' ? 'title' : context.screen === 'sector' ? 'department' : 'sector', 'Q2', 'Q3').slice(0, 5)
    return list.length ? list.map((item) => `${item.name}: ${formatPointDelta(item.delta)} from Q2 to Q3`).join('\n') : 'No clear Q2 to Q3 improvement is available in the selected scope.'
  }
  if (q.includes('below') || q.includes('risk')) {
    const field = q.includes('sector') && context.screen === 'dge' ? 'sector' : context.screen === 'department' ? 'title' : 'department'
    const list = byGenericField(context.rows, field).sort(sortByAvgAsc).slice(0, 5)
    return list.length ? list.map((item) => `${item.name}: ${pct(item.avg)} average, ${item.below} below target`).join('\n') : 'No below-target records were found for this scope.'
  }
  if (q.includes('strong') || q.includes('best')) {
    const field = context.screen === 'department' ? 'title' : context.screen === 'sector' ? 'department' : 'sector'
    const list = byGenericField(context.rows, field).sort(sortByAvgDesc).slice(0, 5)
    return list.length ? list.map((item) => `${item.name}: ${pct(item.avg)} average, ${item.met} met/exceeded`).join('\n') : 'No scored records are available for ranking.'
  }
  return aiSummary(context.screen, context.rows)
}

function byGenericField(rows: KpiRecord[], field: 'sector' | 'department' | 'title') {
  const groups = new Map<string, KpiRecord[]>()
  rows.forEach((row) => groups.set(row[field], [...(groups.get(row[field]) ?? []), row]))
  return [...groups.entries()].map(([name, groupRows]) => ({ name, rows: groupRows, trend: currentTrend(groupRows), ...aggregate(groupRows) }))
}

function improvementList(rows: KpiRecord[], field: 'sector' | 'department' | 'title', fromQuarter: Quarter, toQuarter: Quarter) {
  return byGenericField(rows, field)
    .map((item) => {
      const from = aggregate(item.rows.filter((row) => row.quarter === fromQuarter)).avg
      const to = aggregate(item.rows.filter((row) => row.quarter === toQuarter)).avg
      return { name: item.name, delta: from !== null && to !== null ? to - from : null }
    })
    .filter((item): item is { name: string; delta: number } => item.delta !== null && item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
}

function movementSummary(rows: KpiRecord[]) {
  return byKpi(rows).reduce(
    (total, kpi) => {
      const q2 = kpi.trend[1]
      const q3 = kpi.trend[2]
      if (q2 !== null && q3 !== null && q3 > q2) total.improved += 1
      if (q2 !== null && q3 !== null && q3 < q2) total.declined += 1
      return total
    },
    { improved: 0, declined: 0 },
  )
}

function trendDirection(values: Array<number | null>) {
  const numeric = values.filter(valueIsNumber)
  if (numeric.length < 2) return 'flat'
  const diff = numeric[numeric.length - 1] - numeric[0]
  if (diff > 0.02) return 'up'
  if (diff < -0.02) return 'down'
  return 'flat'
}

function sortByAvgDesc(a: { avg: number | null }, b: { avg: number | null }) {
  return (b.avg ?? -1) - (a.avg ?? -1)
}

function sortByAvgAsc(a: { avg: number | null }, b: { avg: number | null }) {
  return (a.avg ?? 999) - (b.avg ?? 999)
}

function sortKpis(a: KpiMetric, b: KpiMetric) {
  return (a.selected.score ?? 999) - (b.selected.score ?? 999)
}

function toneClass(tone: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral', variant: 'soft' | 'box') {
  const map = {
    primary: variant === 'soft' ? 'bg-primary-tint text-primary' : 'border-primary/20 bg-primary-tint text-primary',
    success: variant === 'soft' ? 'bg-success/10 text-success' : 'border-success/20 bg-success/10 text-success',
    warning: variant === 'soft' ? 'bg-warning/10 text-warning' : 'border-warning/20 bg-warning/10 text-warning',
    info: variant === 'soft' ? 'bg-info/10 text-info' : 'border-info/20 bg-info/10 text-info',
    danger: variant === 'soft' ? 'bg-danger/10 text-danger' : 'border-danger/20 bg-danger/10 text-danger',
    neutral: variant === 'soft' ? 'bg-muted/10 text-muted' : 'border-border bg-surface-raised text-muted',
  }
  return map[tone]
}

function bandPillClass(band: Band) {
  if (band === 'met') return 'border border-success/20 bg-success/10 text-success'
  if (band === 'risk') return 'border border-warning/20 bg-warning/10 text-warning'
  if (band === 'below') return 'border border-danger/20 bg-danger/10 text-danger'
  return 'border border-border bg-surface-raised text-muted'
}

function bandFillClass(band: Band) {
  if (band === 'met') return 'bg-success/35'
  if (band === 'risk') return 'bg-warning/45'
  if (band === 'below') return 'bg-danger/45'
  return 'bg-border'
}

function bandLabel(band: Band) {
  if (band === 'met') return 'Met'
  if (band === 'risk') return 'Watch'
  if (band === 'below') return 'Below'
  return 'No Data'
}

function trendText(direction: string) {
  if (direction === 'up') return 'Improving trend'
  if (direction === 'down') return 'Decreasing trend'
  return 'Stable trend'
}

function formatPointDelta(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Math.round(value * 100)} pts`
}

function kpiCode(row: KpiRecord) {
  return row.code || row.id || 'N/A'
}

function contextLabel(screen: Screen, sector: string, department: string) {
  if (screen === 'department') return `${sector} / ${department}`
  if (screen === 'sector') return sector
  return 'Enterprise KPI performance scope'
}

function pct(value: number | null) {
  if (value === null || value < 0) return 'N/A'
  return `${Math.round(value * 100)}%`
}

function fmt(value: number | null) {
  if (value === null) return 'N/A'
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

function clean(value: unknown) {
  return String(value ?? '').replace(/Â/g, '').trim()
}

function valueIsNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value)
}
