import { AnimatePresence, motion } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Layers3,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppSelect } from '../../components/ui/AppSelect'
import { Modal } from '../../components/ui/Modal'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../context/ToastContext'
import type { Cycle, KpiTemplate } from '../../domain/types'
import { mockApi } from '../../mockApi/mockApi'
import { useAppStore } from '../../store/appStore'

const blankCycle: Cycle = { id: '', label: '', type: 'quarterly', templateId: '', status: 'draft', targetScore: 90, startDate: '', endDate: '' }

function parseDate(value?: string) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function formatDate(value?: string) {
  const date = parseDate(value)
  return date ? format(date, 'dd MMM yyyy') : 'Select date'
}

function isEndAfterStart(startDate?: string, endDate?: string) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return false
  return isAfter(end, start)
}

function normalizedCycle(cycle: Cycle): Cycle {
  return { ...cycle, targetScore: cycle.targetScore ?? 90 }
}

function DatePicker({
  value,
  onChange,
  label,
  disabled,
  minDate,
}: {
  value: string
  onChange(value: string): void
  label: string
  disabled?: boolean
  minDate?: string
}) {
  const selectedDate = parseDate(value)
  const minimumDate = parseDate(minDate)
  const [viewMonth, setViewMonth] = useState(selectedDate ?? minimumDate ?? new Date())
  const monthStart = startOfMonth(viewMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  })

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="field flex h-10 w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          type="button"
        >
          <span className={selectedDate ? 'font-semibold text-text' : 'text-muted'}>{formatDate(value)}</span>
          <CalendarDays className="h-4 w-4 text-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-[90] w-[320px] rounded-[22px] border border-border bg-surface p-3 shadow-modal"
          sideOffset={8}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <p className="eyebrow">{label}</p>
              <p className="mt-1 text-sm font-bold">{format(viewMonth, 'MMMM yyyy')}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary h-8 w-8 rounded-full p-0" onClick={() => setViewMonth((month) => subMonths(month, 1))} type="button" aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="btn-secondary h-8 w-8 rounded-full p-0" onClick={() => setViewMonth((month) => addMonths(month, 1))} type="button" aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const unavailable = Boolean(minimumDate && !isAfter(day, minimumDate))
              const selected = Boolean(selectedDate && isSameDay(day, selectedDate))
              return (
                <Popover.Close asChild key={day.toISOString()}>
                  <button
                    className={[
                      'flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition',
                      isSameMonth(day, viewMonth) ? 'text-text' : 'text-muted/50',
                      selected ? 'bg-primary text-white shadow-card' : 'hover:bg-primary-tint hover:text-primary',
                      unavailable ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted' : '',
                    ].join(' ')}
                    disabled={unavailable}
                    onClick={() => onChange(toIsoDate(day))}
                    type="button"
                  >
                    {format(day, 'd')}
                  </button>
                </Popover.Close>
              )
            })}
          </div>
          {minimumDate ? (
            <p className="mt-3 rounded-2xl bg-primary-tint px-3 py-2 text-xs font-semibold text-primary">
              End date must be after {format(minimumDate, 'dd MMM yyyy')}.
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function templateStats(template: KpiTemplate) {
  const kpis = mockApi.getTemplateKpis(template.id)
  const departments = mockApi.getTemplateDepartments(template.id)
  const categories = new Set(kpis.map((kpi) => kpi.category))
  return { kpis, departments, categories }
}

export function AdminCyclesPage() {
  useAppStore()
  const { showSuccessToast } = useToast()
  const cycles = mockApi.getCycles()
  const templates = mockApi.getTemplates()
  const departments = mockApi.getDepartments()
  const [editing, setEditing] = useState<Cycle | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [kpiPage, setKpiPage] = useState(0)
  const selectedTemplate = templates.find((template) => template.id === editing?.templateId)
  const previewKpis = selectedTemplate ? mockApi.getTemplateKpis(selectedTemplate.id) : []
  const previewDepartments = selectedTemplate ? mockApi.getTemplateDepartments(selectedTemplate.id) : []
  const isPublishedCycle = editing?.status === 'published'
  const kpisPerPage = 6
  const kpiPageCount = Math.max(1, Math.ceil(previewKpis.length / kpisPerPage))
  const pagedPreviewKpis = previewKpis.slice(kpiPage * kpisPerPage, kpiPage * kpisPerPage + kpisPerPage)
  const hasValidTargetScore = Boolean(editing && Number.isFinite(editing.targetScore) && editing.targetScore > 0 && editing.targetScore <= 100)
  const hasValidDates = Boolean(editing?.startDate && editing?.endDate && isEndAfterStart(editing.startDate, editing.endDate))
  const canSaveCycle = Boolean(editing?.label.trim() && editing.templateId && hasValidDates && hasValidTargetScore)
  const filteredTemplates = useMemo(
    () => templates.filter((template) => `${template.name} ${template.description}`.toLowerCase().includes(query.toLowerCase())),
    [query, templates],
  )

  function startCreate() {
    setKpiPage(0)
    setEditing({ ...blankCycle })
  }

  function openCycle(cycle: Cycle) {
    setKpiPage(0)
    setEditing(normalizedCycle(cycle))
  }

  function save() {
    if (!editing || !canSaveCycle || isPublishedCycle) return
    mockApi.upsertCycle({ ...editing, id: editing.id || `cycle-${Date.now()}` })
    showSuccessToast('Cycle saved', `${editing.label} has been saved. KPIs in the selected template are now active for the cycle setup.`)
    setEditing(null)
  }

  function publishCycle(cycle: Cycle) {
    if (cycle.status !== 'draft' || !cycle.label.trim() || !cycle.templateId || !isEndAfterStart(cycle.startDate, cycle.endDate) || !(cycle.targetScore > 0 && cycle.targetScore <= 100)) return
    const publishedCycle: Cycle = { ...cycle, status: 'published' }
    mockApi.upsertCycle(publishedCycle)
    showSuccessToast('Cycle published', `${cycle.label} is now published and locked for editing.`)
    setEditing((current) => (current?.id === cycle.id ? publishedCycle : current))
  }

  function updateStartDate(startDate: string) {
    if (!editing) return
    const shouldClearEndDate = editing.endDate && !isEndAfterStart(startDate, editing.endDate)
    setEditing({ ...editing, startDate, endDate: shouldClearEndDate ? '' : editing.endDate })
  }

  function selectTemplate(templateId: string) {
    if (isPublishedCycle) return
    setKpiPage(0)
    if (!editing) setEditing({ ...blankCycle, templateId })
    else setEditing({ ...editing, templateId })
    setPickerOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">Admin Module</p>
          <h2 className="text-2xl">Cycle Management</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {editing
              ? isPublishedCycle
                ? 'Review the published cycle setup. Published cycles are locked to protect the active evaluation record.'
                : 'Complete the cycle setup form, select one KPI template, and review pulled KPIs before saving.'
              : 'Review all configured KPI evaluation cycles.'}
          </p>
        </div>
        {editing ? (
          <button className="btn-secondary" onClick={() => setEditing(null)} type="button"><X className="h-4 w-4" /> Back to Cycles</button>
        ) : (
          <button className="btn-primary" onClick={startCreate} type="button"><Plus className="h-4 w-4" /> Create Cycle</button>
        )}
      </div>

      <AnimatePresence>
        {editing ? (
          <motion.section
            id="cycle-form"
            className="raised-card overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <CalendarPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="eyebrow">{isPublishedCycle ? 'Published Cycle' : editing.id ? 'Edit Cycle' : 'New Cycle'}</p>
                  <h3 className="mt-1 text-xl font-bold">{editing.id ? editing.label : 'Create KPI evaluation cycle'}</h3>
                  <p className="mt-2 text-sm text-muted">
                    {isPublishedCycle
                      ? 'This cycle is already published, so the setup is locked and can only be reviewed.'
                      : 'Cycle creation is separated from the list so the selected template, KPIs, and pulled departments can be reviewed before save.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {!isPublishedCycle ? (
                  <>
                    {editing.id ? (
                      <button className="btn-secondary h-10" disabled={editing.status !== 'draft' || !canSaveCycle} onClick={() => publishCycle(editing)} type="button">
                        <CheckCircle2 className="h-4 w-4" /> Publish Cycle
                      </button>
                    ) : null}
                    <button className="btn-primary h-10" disabled={!canSaveCycle} onClick={save} type="button">
                      <CalendarDays className="h-4 w-4" /> Save Cycle
                    </button>
                  </>
                ) : null}
                <button className="btn-secondary h-10 w-10 rounded-full p-0" onClick={() => setEditing(null)} type="button" aria-label="Close form">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="card p-4">
                  <p className="eyebrow">Cycle Details</p>
                  {isPublishedCycle ? (
                    <div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-3 text-sm text-success">
                      Published cycles cannot be edited. Create a new draft cycle when KPI setup changes are required.
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Cycle label</span>
                      <input className="field w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={isPublishedCycle} placeholder="e.g. Q2 2026 KPI Evaluation" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Type</span>
                        <AppSelect
                          value={editing.type}
                          onValueChange={(value) => setEditing({ ...editing, type: value as Cycle['type'] })}
                          options={[
                            { value: 'quarterly', label: 'Quarterly' },
                            { value: 'yearly', label: 'Yearly' },
                          ]}
                          disabled={isPublishedCycle}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Target score</span>
                        <input
                          className="field w-full disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPublishedCycle}
                          max={100}
                          min={1}
                          placeholder="e.g. 90"
                          type="number"
                          value={editing.targetScore}
                          onChange={(event) => setEditing({ ...editing, targetScore: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Start date</span>
                        <DatePicker disabled={isPublishedCycle} label="Start Date" value={editing.startDate} onChange={updateStartDate} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">End date</span>
                        <DatePicker disabled={isPublishedCycle || !editing.startDate} label="End Date" minDate={editing.startDate} value={editing.endDate} onChange={(endDate) => setEditing({ ...editing, endDate })} />
                      </label>
                    </div>
                    {!hasValidTargetScore ? (
                      <p className="rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                        Target score must be between 1 and 100.
                      </p>
                    ) : null}
                    {editing.startDate && editing.endDate && !hasValidDates ? (
                      <p className="rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                        End date must be greater than the selected start date.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">Selected Template</p>
                      <h4 className="mt-1 font-bold">{selectedTemplate?.name ?? 'No template selected'}</h4>
                      <p className="mt-1 text-sm text-muted">{selectedTemplate?.description ?? 'Choose a KPI template to pull KPIs and departments into this cycle.'}</p>
                    </div>
                    {selectedTemplate ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : null}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-surface-raised p-3">
                      <p className="font-display text-2xl font-extrabold">{previewKpis.length}</p>
                      <p className="text-xs text-muted">KPIs</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-raised p-3">
                      <p className="font-display text-2xl font-extrabold">{previewDepartments.length}</p>
                      <p className="text-xs text-muted">Departments</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-raised p-3">
                      <p className="font-display text-2xl font-extrabold">{new Set(previewKpis.map((kpi) => kpi.category)).size}</p>
                      <p className="text-xs text-muted">Categories</p>
                    </div>
                  </div>
                  <button className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={isPublishedCycle} onClick={() => setPickerOpen(true)} type="button">
                    <Layers3 className="h-4 w-4" /> {selectedTemplate ? 'Change Template' : 'Pick KPI Template'}
                  </button>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="eyebrow">Template KPI Review</p>
                    <h3 className="mt-1 text-lg font-bold">{selectedTemplate ? 'KPIs pulled into this cycle' : 'Select a template to preview KPIs'}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewDepartments.slice(0, 3).map((department) => (
                      <span className="status-pill border-primary/15 bg-primary-tint text-primary" key={department.id}>{department.name}</span>
                    ))}
                    {previewDepartments.length > 3 ? <span className="status-pill border-border bg-surface-raised text-muted">+{previewDepartments.length - 3}</span> : null}
                  </div>
                </div>
                {previewKpis.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-surface-raised text-xs uppercase text-muted">
                        <tr>
                          <th className="px-4 py-3">KPI</th>
                          <th>Department</th>
                          <th>Category</th>
                          <th>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedPreviewKpis.map((kpi, index) => {
                          const department = departments.find((item) => item.id === kpi.departmentId)
                          return (
                            <motion.tr
                              className="border-t border-border transition hover:bg-primary-tint"
                              key={kpi.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.015 }}
                            >
                              <td className="px-4 py-3">
                                <p className="font-semibold">{kpi.name}</p>
                                <p className="mt-1 line-clamp-1 text-xs text-muted">{kpi.description}</p>
                              </td>
                              <td><span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{department?.name}</span></td>
                              <td>{kpi.category}</td>
                              <td className="font-mono text-xs">{kpi.targetType}</td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-xs text-muted">
                        Showing {kpiPage * kpisPerPage + 1}-{Math.min(previewKpis.length, (kpiPage + 1) * kpisPerPage)} of {previewKpis.length} KPIs
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary h-8 px-3 text-xs"
                          disabled={kpiPage === 0}
                          onClick={() => setKpiPage((page) => Math.max(0, page - 1))}
                          type="button"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" /> Previous
                        </button>
                        <span className="rounded-full border border-border bg-surface-raised px-3 py-1 font-mono text-xs text-muted">
                          {kpiPage + 1} / {kpiPageCount}
                        </span>
                        <button
                          className="btn-secondary h-8 px-3 text-xs"
                          disabled={kpiPage >= kpiPageCount - 1}
                          onClick={() => setKpiPage((page) => Math.min(kpiPageCount - 1, page + 1))}
                          type="button"
                        >
                          Next <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[360px] place-items-center p-8 text-center">
                    <div>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <h4 className="mt-4 font-bold">No KPI template selected</h4>
                      <p className="mt-2 text-sm text-muted">Open the template picker to choose the exact KPI template for this cycle.</p>
                      <button className="btn-primary mt-4" onClick={() => setPickerOpen(true)} type="button"><Layers3 className="h-4 w-4" /> Open Template Picker</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!editing ? (
        <section className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase text-muted"><tr><th className="px-4 py-3">Cycle</th><th>Template</th><th>Dates</th><th>Status</th></tr></thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr className="border-t border-border hover:bg-primary-tint" key={cycle.id}>
                  <td className="px-4 py-3">
                    <button className="text-left font-semibold text-text underline-offset-4 transition hover:text-primary hover:underline" onClick={() => openCycle(cycle)} type="button">
                      {cycle.label}
                    </button>
                    <p className="mt-1 text-xs text-muted">{cycle.type === 'quarterly' ? 'Quarterly evaluation' : 'Yearly evaluation'}</p>
                  </td>
                  <td>{templates.find((template) => template.id === cycle.templateId)?.name}</td>
                  <td className="font-mono text-xs">{cycle.startDate} - {cycle.endDate}</td>
                  <td>
                    <StatusPill value={cycle.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <Modal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        icon={<Layers3 className="h-5 w-5" />}
        eyebrow="KPI Template Picker"
        title="Select the KPI template for this cycle"
        description="Choose exactly one template. The selected template controls which KPIs and department owners are pulled into the cycle."
      >
        <div className="space-y-5">
          <div className="form-field-surface flex h-11 items-center gap-3 px-3">
            <Search className="h-4 w-4 text-muted" />
            <input className="h-full flex-1 bg-transparent text-sm font-medium text-text outline-none" placeholder="Search templates..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTemplates.map((template, index) => {
              const { kpis, departments: templateDepartments, categories } = templateStats(template)
              const selected = editing?.templateId === template.id
              return (
                <motion.button
                  className={`group rounded-[22px] border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-premium ${selected ? 'border-primary shadow-card' : 'border-border'}`}
                  key={template.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => selectTemplate(template.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-tint text-primary transition group-hover:scale-105">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="eyebrow">Template</p>
                          <h4 className="truncate font-bold">{template.name}</h4>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{template.description}</p>
                    </div>
                    {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-primary" />}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{kpis.length}</p><p className="text-xs text-muted">KPIs</p></div>
                    <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{templateDepartments.length}</p><p className="text-xs text-muted">Departments</p></div>
                    <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{categories.size}</p><p className="text-xs text-muted">Categories</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {templateDepartments.slice(0, 4).map((department) => <span className="status-pill border-primary/15 bg-primary-tint text-primary" key={department.id}>{department.name}</span>)}
                    {templateDepartments.length > 4 ? <span className="status-pill border-border bg-surface-raised text-muted">+{templateDepartments.length - 4} more</span> : null}
                  </div>
                  <div className="mt-4 max-h-40 space-y-2 overflow-hidden">
                    {kpis.slice(0, 4).map((kpi) => (
                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs" key={kpi.id}>
                        <span className="truncate font-semibold">{kpi.name}</span>
                        <span className="ml-3 shrink-0 text-muted">{departments.find((department) => department.id === kpi.departmentId)?.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.button>
              )
            })}
            {!filteredTemplates.length ? (
              <div className="col-span-full rounded-[22px] border border-border bg-surface p-8 text-center">
                <p className="font-bold">No templates found</p>
                <p className="mt-2 text-sm text-muted">Try a different template name or description.</p>
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
