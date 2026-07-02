import { Pencil, Plus, Target } from 'lucide-react'
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
