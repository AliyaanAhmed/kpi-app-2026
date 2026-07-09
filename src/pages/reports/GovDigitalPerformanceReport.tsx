import { useEffect, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart as BarChartIcon,
  Bot,
  BrainCircuit,
  ChevronRight,
  Database,
  MessageCircle,
  Send,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
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
  const [assistantOpen, setAssistantOpen] = useState(false)

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
  const sectorItems = useMemo(() => byField(filterRows(records, { quarter: activeQuarter }), 'sector', records), [activeQuarter, records])
  const selectedDgeSector = dgeSector || sectorItems[0]?.name || ''
  const selectedDgeDepartments = useMemo(() => {
    if (!selectedDgeSector) return []
    return byField(filterRows(records, { quarter: activeQuarter, sector: selectedDgeSector }), 'department', filterRows(records, { sector: selectedDgeSector }))
  }, [activeQuarter, records, selectedDgeSector])
  const departmentItems = useMemo(() => (sector ? byField(filterRows(records, { quarter: activeQuarter, sector }), 'department', filterRows(records, { sector })) : []), [activeQuarter, records, sector])
  const selectedDepartmentMetric = useMemo(
    () => (department ? byField(filterRows(records, { quarter: activeQuarter, sector }), 'department', filterRows(records, { sector })).find((item) => item.name === department) : undefined),
    [activeQuarter, department, records, sector],
  )
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

  const scrollReportTop = () => {
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80)
  }
  const goDge = () => {
    setScreen('dge')
    setSector('')
    setDepartment('')
    setAttention('')
    setExpandedKpi('')
    scrollReportTop()
  }
  const goSector = (nextSector: string) => {
    setScreen('sector')
    setSector(nextSector)
    setDepartment('')
    setAttention('')
    setExpandedKpi('')
    scrollReportTop()
  }
  const goDepartment = (nextSector: string, nextDepartment: string) => {
    setScreen('department')
    setSector(nextSector)
    setDepartment(nextDepartment)
    setAttention('')
    setExpandedKpi('')
    scrollReportTop()
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

      <div className="space-y-5">
        <main className="min-w-0 space-y-5">
          <ScreenHeader screen={screen} sector={sector} department={department} quarter={activeQuarter} />
          <SummaryCards rows={scopedRows} />

          <AnimatePresence mode="wait">
            {screen === 'dge' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="dge">
                <AiSummaryPanel text={aiSummary('dge', scopedRows)} />
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-4 xl:col-span-full">
                    <SectionTitle title="DGE Performance" subtitle="Sector performance overview across the selected reporting period." />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {sectorItems.map((item) => <EntityCard item={item} key={item.name} onClick={() => goSector(item.name)} type="sector" />)}
                    </div>
                  </div>
                </section>
                <SectorPerformancePanel
                  departments={selectedDgeDepartments}
                  onDepartment={(name) => goDepartment(selectedDgeSector, name)}
                  onSector={(name) => setDgeSector(name)}
                  selectedSector={selectedDgeSector}
                  sectors={sectorItems}
                />
                <RankingPanel items={sectorItems} />
              </motion.div>
            )}

            {screen === 'sector' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="sector">
                <AiSummaryPanel text={aiSummary('sector', scopedRows)} />
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-4 xl:col-span-full">
                    <SectionTitle title="Department portfolio" subtitle="Select a department to open KPI-level detail and narratives." />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {departmentItems.map((item) => <EntityCard item={item} key={item.name} onClick={() => goDepartment(sector, item.name)} type="department" />)}
                    </div>
                  </div>
                </section>
                <KpiWorkspace attention={attention} counts={attentionCounts} kpis={visibleKpis} onAttention={setAttention} onExpand={setExpandedKpi} expandedKpi={expandedKpi} totalCount={kpis.length} />
                <RankingPanel items={departmentItems} />
              </motion.div>
            )}

            {screen === 'department' && (
              <motion.div animate={{ opacity: 1, y: 0 }} className="space-y-5" exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: 8 }} key="department">
                <AiSummaryPanel text={aiSummary('department', scopedRows)} />
                <section className="space-y-3">
                  <SectionTitle title="Department portfolio" subtitle="Sector departments remain visible while the selected department filters the KPI table." />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {departmentItems.map((item) => (
                      <EntityCard active={item.name === selectedDepartmentMetric?.name} item={item} key={item.name} onClick={() => goDepartment(sector, item.name)} type="department" />
                    ))}
                  </div>
                </section>
                <KpiWorkspace
                  attention={attention}
                  counts={attentionCounts}
                  kpis={visibleKpis}
                  onAttention={setAttention}
                  onClearDepartment={() => {
                    setScreen('sector')
                    setDepartment('')
                    setAttention('')
                    setExpandedKpi('')
                  }}
                  onExpand={setExpandedKpi}
                  expandedKpi={expandedKpi}
                  selectedDepartment={department}
                  totalCount={kpis.length}
                />
                <AdditionalAnalysis allRows={allQuarterScopedRows} rows={scopedRows} />
                <RankingPanel items={departmentItems} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <FloatingAiAssistant answer={answer} context={contextLabel(screen, sector, department)} isOpen={assistantOpen} onAsk={ask} onClose={() => setAssistantOpen(false)} onOpen={() => setAssistantOpen(true)} query={query} setQuery={setQuery} />
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

function SummaryCards({ rows }: { rows: KpiRecord[] }) {
  const kpis = byKpi(rows)
  const snapshot = kpiSnapshot(kpis)
  const trendSet = metricTrendSet(rows)
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total KPIs" value={snapshot.total.toLocaleString()} note="Current report scope" tone="info" />
      <MetricCard label="Average Score" value={pct(snapshot.avg)} note="Across selected KPI results" tone="primary" trend={trendSet.average} />
      <MetricCard label="Target Met" value={snapshot.met.toLocaleString()} note="Score 100% or above" tone="success" trend={trendSet.metRate} />
      <MetricCard label="Below Target" value={snapshot.below.toLocaleString()} note="Score below 80%" tone="danger" />
      <MetricCard label="Increasing Trend" value={snapshot.increasing.toLocaleString()} note="Year trend moving up" tone="success" />
      <MetricCard label="Decreasing Trend" value={snapshot.decreasing.toLocaleString()} note="Year trend moving down" tone="danger" />
      <MetricCard label="Close to Target" value={snapshot.closeToTarget.toLocaleString()} note="Score 90% to 99%" tone="warning" />
      <MetricCard label="Far from Target" value={snapshot.farFromTarget.toLocaleString()} note="Score below 70%" tone="danger" />
    </section>
  )
}

function MetricCard({ label, value, note, tone, trend }: { label: string; value: string; note: string; tone: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'; trend?: Array<number | null> }) {
  const Icon = tone === 'success' ? TrendingUp : tone === 'warning' || tone === 'danger' ? Target : tone === 'info' ? Database : BarChartIcon
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
  const [open, setOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--ai-border)] bg-surface shadow-soft">
      <button className="flex w-full items-start justify-between gap-4 bg-[linear-gradient(0deg,var(--ai-soft),var(--surface))] px-5 py-4 text-left transition hover:bg-[var(--ai-soft)]" onClick={() => setOpen((current) => !current)} type="button">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ai)] text-white shadow-[0_12px_24px_rgba(168,85,247,0.20)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-text">AI Summary</h3>
            <p className="mt-1 text-sm leading-6 text-muted">AI-supported executive interpretation for the current report scope, risk signals, and performance movement.</p>
          </div>
        </div>
        <ChevronRight className={cn('mt-1 h-4 w-4 shrink-0 text-[var(--ai-strong)] transition-transform', open && 'rotate-90')} />
      </button>
      {open ? (
        <motion.div className="border-t border-[var(--ai-border)] px-5 pb-5 pt-4" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <article className="rounded-2xl border border-[var(--ai-border)] bg-white/75 p-4 shadow-soft dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="ai-icon h-10 w-10"><BrainCircuit className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-extrabold text-text">Performance Interpretation</p>
                <p className="mt-2 text-sm font-normal leading-6 text-text">{text}</p>
              </div>
            </div>
          </article>
        </motion.div>
      ) : null}
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

function EntityCard({ item, type, onClick, active }: { item: EntityMetric; type: 'sector' | 'department'; onClick(): void; active?: boolean }) {
  const trend = trendDirection(item.trend)
  return (
    <button
      className={cn(
        'group w-full rounded-[22px] border border-border bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card',
        type === 'department' && 'rounded-[20px] p-3.5',
        active && 'border-primary bg-primary-tint ring-1 ring-primary/20',
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
      <TrendBars values={item.trend} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={cn('text-sm font-extrabold', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-warning')}>{trendText(trend)}</span>
        <span className="text-sm font-semibold text-muted">{item.count.toLocaleString()} KPI records</span>
      </div>
      <DistributionBar metrics={item} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Met" value={item.met} tone="success" />
        <MiniMetric label="At Risk" value={item.risk} tone="warning" />
        <MiniMetric label="Below" value={item.below} tone="danger" />
        <MiniMetric label="No Data" value={item.noData} tone="neutral" />
      </div>
    </button>
  )
}

function SectorPerformancePanel({ sectors, selectedSector, departments, onSector, onDepartment }: { sectors: EntityMetric[]; selectedSector: string; departments: EntityMetric[]; onSector(name: string): void; onDepartment(name: string): void }) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Sector Performance" subtitle="Select a sector to compare departments without leaving the DGE overview." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_1.1fr]">
        <div className="rounded-[18px] border border-border bg-surface p-3 shadow-soft">
          <p className="px-1 pb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Sectors</p>
          <div className="space-y-2">
            {sectors.map((item) => (
              <PerformanceRow item={item} key={item.name} onClick={() => onSector(item.name)} selected={item.name === selectedSector} />
            ))}
          </div>
        </div>
        <div className="rounded-[18px] border border-border bg-surface p-3 shadow-soft">
          <p className="px-1 pb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">{selectedSector} Departments</p>
          <div className="space-y-2">
            {departments.map((item) => (
              <PerformanceRow item={item} key={item.name} onClick={() => onDepartment(item.name)} />
            ))}
            {!departments.length ? (
              <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm font-semibold text-muted">No departments available for the selected sector.</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function PerformanceRow({ item, selected, onClick }: { item: EntityMetric; selected?: boolean; onClick(): void }) {
  const direction = trendDirection(item.trend)
  return (
    <button
      className={cn(
        'grid w-full grid-cols-[128px_minmax(0,1fr)_52px] items-center gap-5 rounded-xl border border-border bg-surface-raised px-4 py-3 text-left transition hover:border-primary hover:bg-primary-tint',
        selected && 'border-primary bg-primary-tint ring-1 ring-primary/15',
      )}
      onClick={onClick}
      type="button"
    >
      <div className="mr-2 flex justify-center">
        <MiniSparkline values={item.trend} compact />
      </div>
      <div className="min-w-0 pl-1">
        <p className="truncate text-base font-extrabold text-text">{item.name}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs font-extrabold">
          <span className="text-muted">{item.count.toLocaleString()} KPIs</span>
          <span className="text-success">{item.met.toLocaleString()} met</span>
          <span className="text-danger">{item.below.toLocaleString()} below</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <DonutMetric metrics={item} />
        <span className={cn('text-[10px] font-extrabold uppercase', direction === 'up' ? 'text-success' : direction === 'down' ? 'text-danger' : 'text-warning')}>
          {direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'Stable'}
        </span>
      </div>
    </button>
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
          <p className="text-sm font-extrabold text-text">Top Performing Departments</p>
          {top.map((item) => <RankingRow item={item} key={item.name} />)}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-extrabold text-text">Departments Needing Attention</p>
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

function AdditionalAnalysis({ allRows, rows }: { allRows: KpiRecord[]; rows: KpiRecord[] }) {
  const movement = movementSummary(allRows)
  const pmMissing = rows.filter((row) => !row.pmComments).length
  const directorMissing = rows.filter((row) => !row.directorComments).length
  const underTarget = rows
    .filter((row) => row.score !== null && row.score < 1)
    .sort((a, b) => Math.abs(1 - (a.score ?? 0)) - Math.abs(1 - (b.score ?? 0)))
  const closest = underTarget[0]
  const furthest = underTarget[underTarget.length - 1]
  return (
    <section className="space-y-4">
      <SectionTitle title="Additional Analysis" subtitle="Other ways to interpret movement, target gap, and review completion." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnalysisCard label="Improved Q2 to Q3" note="KPI trends moving upward" value={movement.improved.toLocaleString()} />
        <AnalysisCard label="Declined Q2 to Q3" note="KPI trends moving downward" value={movement.declined.toLocaleString()} />
        <AnalysisCard label="PM Comments Missing" note="Current filter records" value={pmMissing.toLocaleString()} />
        <AnalysisCard label="Director Comments Missing" note="Current filter records" value={directorMissing.toLocaleString()} />
        <AnalysisCard label="Closest To Target" note={closest ? closest.title : 'No under-target KPI'} value={closest ? `${pct(closest.score)} - ${kpiCode(closest)}` : 'N/A'} />
        <AnalysisCard label="Furthest From Target" note={furthest ? furthest.title : 'No under-target KPI'} value={furthest ? `${pct(furthest.score)} - ${kpiCode(furthest)}` : 'N/A'} />
      </div>
    </section>
  )
}

function AnalysisCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-[22px] border border-border bg-surface p-4 shadow-soft transition hover:border-primary/35 hover:shadow-card">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-3 truncate text-xl font-extrabold text-text" title={value}>{value}</p>
      <p className="mt-2 line-clamp-2 text-sm font-normal leading-5 text-muted" title={note}>{note}</p>
    </article>
  )
}

function KpiWorkspace({
  attention,
  counts,
  kpis,
  totalCount,
  expandedKpi,
  selectedDepartment,
  onAttention,
  onClearDepartment,
  onExpand,
}: {
  attention: string
  counts: Record<string, number>
  kpis: KpiMetric[]
  totalCount: number
  expandedKpi: string
  selectedDepartment?: string
  onAttention(value: string): void
  onClearDepartment?(): void
  onExpand(value: string): void
}) {
  const pageSize = 10
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(kpis.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const startIndex = (safePage - 1) * pageSize
  const pagedKpis = kpis.slice(startIndex, startIndex + pageSize)

  useEffect(() => {
    setPage(1)
  }, [attention, kpis.length, selectedDepartment])

  return (
    <section className="card overflow-hidden" id="report-kpi-workspace">
      <div className="border-b border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionTitle title="KPI Filters" subtitle={`${kpis.length.toLocaleString()} of ${totalCount.toLocaleString()} KPI records visible.`} />
          <div className="relative xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field h-11 w-full pl-10" placeholder="Search in current KPI grid..." />
          </div>
        </div>
        {selectedDepartment ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">Department</span>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-tint px-3 py-1.5 text-sm font-extrabold text-primary transition hover:border-primary hover:bg-primary hover:text-white"
              onClick={onClearDepartment}
              type="button"
            >
              {selectedDepartment}
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
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
      <KpiGrid kpis={pagedKpis} expandedKpi={expandedKpi} onExpand={onExpand} />
      {kpis.length ? (
        <div className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-muted">
            Showing <span className="font-extrabold text-text">{startIndex + 1}</span>-<span className="font-extrabold text-text">{Math.min(startIndex + pageSize, kpis.length)}</span> of <span className="font-extrabold text-text">{kpis.length.toLocaleString()}</span> KPI records
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary h-9 rounded-xl px-3 text-xs"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <span className="rounded-xl border border-border bg-surface-raised px-3 py-2 font-mono text-xs font-extrabold text-text">
              {safePage} / {pageCount}
            </span>
            <button
              className="btn-secondary h-9 rounded-xl px-3 text-xs"
              disabled={safePage === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
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
  const previousRow = previousKpiRecord(kpi)
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
        <PreviousCycleComparison current={row} previous={previousRow} trend={kpi.trend} />
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

function PreviousCycleComparison({ current, previous, trend }: { current: KpiRecord; previous: KpiRecord | null; trend: Array<number | null> }) {
  const scoreDelta = previous && current.score !== null && previous.score !== null ? current.score - previous.score : null
  const actualDelta = previous && current.actual !== null && previous.actual !== null ? current.actual - previous.actual : null
  const targetDelta = previous && current.target !== null && previous.target !== null ? current.target - previous.target : null
  const direction = scoreDelta === null ? 'flat' : scoreDelta > 0.005 ? 'up' : scoreDelta < -0.005 ? 'down' : 'flat'
  const movementClass = direction === 'up' ? 'text-success bg-success/10 border-success/20' : direction === 'down' ? 'text-danger bg-danger/10 border-danger/20' : 'text-warning bg-warning/10 border-warning/20'

  return (
    <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--ai-border)] bg-[var(--ai-soft)]">
      <div className="flex flex-col gap-3 border-b border-[var(--ai-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--ai-strong)]">Previous Cycle Comparison</p>
          <p className="mt-1 text-sm font-semibold text-text">
            {previous ? `${previous.quarter} compared with ${current.quarter}` : `No earlier quarter is available before ${current.quarter}.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MiniSparkline values={trend} compact />
          <span className={cn('rounded-full border px-3 py-1 text-xs font-extrabold', movementClass)}>
            {scoreDelta === null ? 'No movement data' : `${formatPointDelta(scoreDelta)} score movement`}
          </span>
        </div>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <ComparisonPanel
          label="Previous Quarter"
          quarter={previous?.quarter ?? 'N/A'}
          target={previous?.target ?? null}
          actual={previous?.actual ?? null}
          score={previous?.score ?? null}
        />
        <ComparisonPanel
          label="Current Quarter"
          quarter={current.quarter}
          target={current.target}
          actual={current.actual}
          score={current.score}
          active
        />
        <div className="rounded-2xl border border-[var(--ai-border)] bg-white/80 p-4 dark:bg-white/5">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">Movement Summary</p>
          <div className="mt-3 grid gap-2">
            <DeltaRow label="Actual change" value={actualDelta} />
            <DeltaRow label="Target change" value={targetDelta} />
            <DeltaRow label="Score change" value={scoreDelta} percentage />
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparisonPanel({ active = false, actual, label, quarter, score, target }: { active?: boolean; actual: number | null; label: string; quarter: string; score: number | null; target: number | null }) {
  return (
    <div className={cn('rounded-2xl border p-4', active ? 'border-[var(--ai)] bg-white shadow-soft dark:bg-white/5' : 'border-[var(--ai-border)] bg-white/75 dark:bg-white/5')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold', active ? 'bg-[var(--ai)] text-white' : 'bg-[var(--ai-soft)] text-[var(--ai-strong)]')}>{quarter}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kv label="Target" value={fmt(target)} />
        <Kv label="Actual" value={fmt(actual)} />
        <Kv label="Score" value={pct(score)} />
      </div>
    </div>
  )
}

function DeltaRow({ label, percentage = false, value }: { label: string; percentage?: boolean; value: number | null }) {
  const tone = value === null ? 'text-muted' : value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-warning'
  const display = value === null ? 'N/A' : percentage ? formatPointDelta(value) : formatNumberDelta(value)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-3 py-2">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className={cn('font-mono text-sm font-extrabold', tone)}>{display}</span>
    </div>
  )
}

function FloatingAiAssistant({ answer, context, isOpen, query, setQuery, onAsk, onClose, onOpen }: { answer: string; context: string; isOpen: boolean; query: string; setQuery(value: string): void; onAsk(question?: string): void; onClose(): void; onOpen(): void }) {
  const suggestions = ['Which sectors improved from Q2 to Q3?', 'Show below target departments', 'What are the strongest performance areas?']
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            className="ai-chat-shell fixed bottom-24 right-5 z-[90] w-[min(460px,calc(100vw-2rem))]"
            exit={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(6px)' }}
            initial={{ opacity: 0, y: 28, scale: 0.92, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 330, damping: 28 }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="relative border-b border-[color-mix(in_srgb,var(--ai-border)_62%,transparent)] p-5">
              <div className="pointer-events-none absolute right-8 top-4 h-24 w-24 rounded-full bg-[var(--ai)] opacity-10 blur-2xl" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="ai-icon h-12 w-12 shadow-soft ring-1 ring-[var(--ai-border)]"><Bot className="h-5 w-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="ai-heading text-lg font-extrabold">GovDigital AI Teammate</h2>
                      <span className="rounded-full border border-[var(--ai-border)] bg-surface/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--ai-strong)]">Live</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted">Performance insights for {context}</p>
                  </div>
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/80 text-text shadow-soft transition hover:scale-105 hover:border-[var(--ai-border)] hover:text-[var(--ai-strong)]" onClick={onClose} type="button" aria-label="Close AI assistant">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
              <div className="flex items-start gap-3">
                <div className="ai-icon mt-0.5 h-9 w-9"><Sparkles className="h-4 w-4" /></div>
                <div className="ai-chat-message min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ai-strong)]">Executive insight</p>
                  <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-text">{answer}</p>
                </div>
              </div>
              <div className="grid gap-2 pl-12">
                {suggestions.map((item) => (
                  <button className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--ai-border)] bg-surface/80 px-3 py-2.5 text-left text-xs font-extrabold text-[var(--ai-strong)] shadow-soft transition hover:-translate-y-0.5 hover:bg-[var(--ai-soft)]" key={item} onClick={() => onAsk(item)} type="button">
                    <span>{item}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-[color-mix(in_srgb,var(--ai-border)_62%,transparent)] bg-surface/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 rounded-[22px] border border-[var(--ai-border)] bg-surface px-3 py-2 shadow-soft transition focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--ai)_14%,transparent)]">
                <MessageCircle className="h-4 w-4 text-[var(--ai-strong)]" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text outline-none placeholder:text-muted" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAsk() }} placeholder="Type message..." value={query} />
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ai)] text-white shadow-soft transition hover:scale-105" onClick={() => onAsk()} type="button" aria-label="Ask AI">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        className="ai-fab fixed bottom-5 right-5 z-[90]"
        onClick={isOpen ? onClose : onOpen}
        type="button"
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <span className={cn('ai-fab-icon', isOpen && 'ai-fab-close')}>
          {isOpen ? <X className="h-5 w-5" /> : <BrainCircuit className="h-6 w-6" />}
        </span>
      </button>
    </>
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
    <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-raised">
      <span className="bg-success" style={{ width: `${(metrics.met / total) * 100}%` }} />
      <span className="bg-warning" style={{ width: `${(metrics.risk / total) * 100}%` }} />
      <span className="bg-danger" style={{ width: `${(metrics.below / total) * 100}%` }} />
      <span className="bg-muted" style={{ width: `${(metrics.noData / total) * 100}%` }} />
    </div>
  )
}

function TrendBars({ values }: { values: Array<number | null> }) {
  return (
    <div className="mt-3 flex h-12 items-end gap-1">
      {quarters.map((quarter, index) => {
        const value = values[index]
        const height = value === null ? 12 : Math.max(12, Math.min(42, value * 36))
        return (
          <span
            className={cn('flex-1 rounded-t-md transition duration-200 group-hover:-translate-y-0.5', bandFillClass(performanceBand(value)))}
            key={quarter}
            style={{ height }}
            title={`${quarter}: ${pct(value)}`}
          />
        )
      })}
    </div>
  )
}

function MiniSparkline({ values, compact }: { values: Array<number | null>; compact?: boolean }) {
  const gradientId = useId().replace(/:/g, '')
  const numeric = values.map((value, index) => ({ value, index })).filter((point): point is { value: number; index: number } => valueIsNumber(point.value))
  if (numeric.length < 2) return <div className={cn('rounded-full bg-muted/30', compact ? 'h-0.5 w-24' : 'mt-4 h-0.5 w-full')} />
  const width = compact ? 118 : 180
  const height = compact ? 38 : 44
  const min = Math.min(...numeric.map((point) => point.value))
  const max = Math.max(...numeric.map((point) => point.value))
  const span = max - min || 1
  const plotted = numeric.map((point) => {
    const x = 4 + (point.index / Math.max(1, quarters.length - 1)) * (width - 8)
    const y = height - 4 - ((point.value - min) / span) * (height - 8)
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  })
  const points = plotted.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPoints = [`${plotted[0].x},${height - 4}`, points, `${plotted[plotted.length - 1].x},${height - 4}`].join(' ')
  const direction = trendDirection(values)
  return (
    <svg
      className={cn(
        compact ? 'h-10 w-32' : 'mt-4 h-12 w-full',
        direction === 'up' ? 'text-success' : direction === 'down' ? 'text-danger' : 'text-muted',
      )}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Trend ${direction}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="72%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
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
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--success) 0deg ${metDegrees}deg, var(--danger) ${metDegrees}deg ${belowEnd}deg, var(--border) ${belowEnd}deg 360deg)` }}
      title={`Met ${metrics.met}, below ${metrics.below}, total ${metrics.count}`}
    >
      <span className="h-6 w-6 rounded-full bg-surface" />
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

function byField(rows: KpiRecord[], field: 'sector' | 'department', trendRows = rows): EntityMetric[] {
  const groups = new Map<string, KpiRecord[]>()
  rows.forEach((row) => {
    const key = row[field] || 'Unassigned'
    groups.set(key, [...(groups.get(key) ?? []), row])
  })
  return [...groups.entries()].map(([name, groupRows]) => ({ name, rows: groupRows, trend: entityTrend(trendRows, field, name), ...aggregate(groupRows) })).sort(sortByAvgDesc)
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

function kpiSnapshot(kpis: KpiMetric[]) {
  const selectedRows = kpis.map((kpi) => kpi.selected)
  const metrics = aggregate(selectedRows)
  return {
    total: kpis.length,
    avg: metrics.avg,
    met: metrics.met,
    below: metrics.below,
    increasing: kpis.filter((kpi) => trendDirection(kpi.trend) === 'up').length,
    decreasing: kpis.filter((kpi) => trendDirection(kpi.trend) === 'down').length,
    closeToTarget: selectedRows.filter((row) => row.score !== null && row.score >= 0.9 && row.score < 1).length,
    farFromTarget: selectedRows.filter((row) => row.score !== null && row.score < 0.7).length,
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

function previousKpiRecord(kpi: KpiMetric) {
  const selectedIndex = kpi.rows.findIndex((row) => row.monthNumber === kpi.selected.monthNumber && row.quarter === kpi.selected.quarter)
  if (selectedIndex > 0) return kpi.rows[selectedIndex - 1]
  return [...kpi.rows].filter((row) => row.monthNumber < kpi.selected.monthNumber).pop() ?? null
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
      const q2 = kpi.rows.find((row) => row.quarter === 'Q2')?.score ?? null
      const q3 = kpi.rows.find((row) => row.quarter === 'Q3')?.score ?? null
      if (q2 === null || q3 === null) return total
      const diff = q3 - q2
      if (diff >= 0.005) total.improved += 1
      else if (diff <= -0.005) total.declined += 1
      else total.stable += 1
      return total
    },
    { improved: 0, declined: 0, stable: 0 },
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
  if (band === 'met') return 'bg-[#bce8ca] dark:bg-success/55'
  if (band === 'risk') return 'bg-[#f7d794] dark:bg-warning/60'
  if (band === 'below') return 'bg-[#f4b6b0] dark:bg-danger/60'
  return 'bg-[#cfd8e3] dark:bg-muted/45'
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

function formatNumberDelta(value: number) {
  const sign = value > 0 ? '+' : ''
  const formatted = Math.abs(value) >= 1 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value.toLocaleString(undefined, { maximumFractionDigits: 3 })
  return `${sign}${formatted}`
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
