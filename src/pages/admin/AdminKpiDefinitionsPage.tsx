import { Check, Pencil, Plus, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { AppSelect } from '../../components/ui/AppSelect'
import type { Kpi } from '../../domain/types'
import { mockApi } from '../../mockApi/mockApi'
import { useAppStore } from '../../store/appStore'

const blankKpi: Kpi = {
  id: '',
  name: '',
  description: '',
  category: 'Digital Excellence',
  departmentId: '',
  targetType: 'percentage',
  questions: [
    { id: 'analysis', label: 'Analysis' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'recommendations', label: 'Recommendations' },
  ],
}

const aiKpiSuggestion = {
  name: 'Digital Service Adoption Index',
  dimension: 'Digital Excellence',
  unit: 'percentage' as Kpi['targetType'],
}

export function AdminKpiDefinitionsPage() {
  useAppStore()
  const kpis = mockApi.getKpis()
  const departments = mockApi.getDepartments()
  const [editing, setEditing] = useState<Kpi | null>(null)
  const [query, setQuery] = useState('')
  const filtered = kpis.filter((kpi) => `${kpi.name} ${kpi.category}`.toLowerCase().includes(query.toLowerCase()))

  function save() {
    if (!editing?.name || !editing.departmentId) return
    mockApi.upsertKpi({ ...editing, id: editing.id || `kpi-${Date.now()}` })
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">Admin Module</p><h2 className="text-2xl">KPI Definitions</h2></div>
        <button className="btn-primary" onClick={() => setEditing({ ...blankKpi, departmentId: departments[0]?.id ?? '' })}><Plus className="h-4 w-4" /> Add KPI</button>
      </div>
      <input className="field w-full max-w-md" placeholder="Search KPI definitions..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <section className="card overflow-hidden">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase text-muted"><tr><th className="px-4 py-3">KPI</th><th>Department</th><th>Category</th><th>Target Type</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.map((kpi) => (
              <tr className="border-t border-border hover:bg-primary-tint" key={kpi.id}>
                <td className="px-4 py-3"><p className="font-semibold">{kpi.name}</p><p className="text-xs text-muted">{kpi.description}</p></td>
                <td>{departments.find((department) => department.id === kpi.departmentId)?.name}</td>
                <td>{kpi.category}</td>
                <td className="font-mono">{kpi.targetType}</td>
                <td><button className="btn-secondary h-8 px-3 text-xs" onClick={() => setEditing(kpi)}><Pencil className="h-3.5 w-3.5" /> Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        icon={<Target className="h-5 w-5" />}
        eyebrow="KPI definition"
        title={editing?.id ? 'Edit KPI Definition' : 'Add KPI Definition'}
        description="KPI ownership belongs to a department. Templates only reference KPI definitions."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save KPI</button></div>}
      >
        {editing ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[22px] border border-[var(--ai-border)] bg-[var(--ai-soft)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="ai-icon h-10 w-10 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ai-strong)]">AI Suggested KPI Setup</p>
                    <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-muted">
                      Suggested values are generated for demo mode. Apply each field individually, then adjust anything before saving.
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--ai-border)] bg-white px-3 text-xs font-extrabold text-[var(--ai-strong)] transition hover:bg-[var(--ai)] hover:text-white dark:bg-white/5"
                  onClick={() => setEditing({ ...editing, name: aiKpiSuggestion.name, category: aiKpiSuggestion.dimension, targetType: aiKpiSuggestion.unit })}
                  type="button"
                >
                  <Check className="h-3.5 w-3.5" /> Apply All
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Name', value: aiKpiSuggestion.name, onApply: () => setEditing({ ...editing, name: aiKpiSuggestion.name }) },
                  { label: 'Dimension', value: aiKpiSuggestion.dimension, onApply: () => setEditing({ ...editing, category: aiKpiSuggestion.dimension }) },
                  { label: 'Unit', value: 'Percentage', onApply: () => setEditing({ ...editing, targetType: aiKpiSuggestion.unit }) },
                ].map((suggestion) => (
                  <div
                    className="group rounded-2xl border border-[var(--ai-border)] bg-white/80 p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-[var(--ai)] dark:bg-white/5"
                    key={suggestion.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ai-strong)]">{suggestion.label}</p>
                      <Sparkles className="h-3.5 w-3.5 text-[var(--ai)] transition group-hover:scale-110" />
                    </div>
                    <p className="mt-2 min-h-10 text-sm font-extrabold leading-5 text-text">{suggestion.value}</p>
                    <button
                      className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-[var(--ai)] px-3 text-xs font-extrabold text-white transition hover:brightness-95"
                      onClick={suggestion.onApply}
                      type="button"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <input className="field w-full" placeholder="KPI name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <textarea className="min-h-24 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
            <div className="grid gap-3 md:grid-cols-3">
              <AppSelect
                value={editing.departmentId}
                onValueChange={(value) => setEditing({ ...editing, departmentId: value })}
                options={departments.map((department) => ({ value: department.id, label: department.name }))}
              />
              <input className="field" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} />
              <AppSelect
                value={editing.targetType}
                onValueChange={(value) => setEditing({ ...editing, targetType: value as Kpi['targetType'] })}
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'number', label: 'Number' },
                  { value: 'boolean', label: 'Boolean' },
                ]}
              />
            </div>
            <div className="card p-4">
              <p className="eyebrow">Questions</p>
              <div className="mt-3 space-y-2">
                {editing.questions.map((question, index) => (
                  <input className="field w-full" key={question.id} value={question.label} onChange={(event) => {
                    const questions = editing.questions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item)
                    setEditing({ ...editing, questions })
                  }} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
