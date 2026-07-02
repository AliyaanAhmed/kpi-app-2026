import { CopyPlus, Eye, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { mockApi } from '../../mockApi/mockApi'
import { useAppStore } from '../../store/appStore'
import type { KpiTemplate } from '../../domain/types'

const blankTemplate: KpiTemplate = { id: '', name: '', description: '', kpiIds: [] }

export function AdminTemplatesPage() {
  useAppStore()
  const templates = mockApi.getTemplates()
  const kpis = mockApi.getKpis()
  const departments = mockApi.getDepartments()
  const [editing, setEditing] = useState<KpiTemplate | null>(null)
  const [viewing, setViewing] = useState<KpiTemplate | null>(null)
  const selectedKpis = useMemo(() => kpis.filter((kpi) => (editing ?? viewing)?.kpiIds.includes(kpi.id)), [editing, viewing, kpis])
  const selectedDepartmentIds = new Set(selectedKpis.map((kpi) => kpi.departmentId))

  function save() {
    if (!editing?.name.trim()) return
    mockApi.upsertTemplate({ ...editing, id: editing.id || `tpl-${Date.now()}` })
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">Admin Module</p><h2 className="text-2xl">KPI Templates</h2></div>
        <button className="btn-primary" onClick={() => setEditing(blankTemplate)}><Plus className="h-4 w-4" /> Create Template</button>
      </div>
      <section className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => {
          const templateKpis = mockApi.getTemplateKpis(template.id)
          const templateDepartments = mockApi.getTemplateDepartments(template.id)
          return (
            <article className="card p-5 transition hover:shadow-card" key={template.id}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow">Template</p><h3 className="mt-1 text-lg font-bold">{template.name}</h3><p className="mt-2 text-sm text-muted">{template.description}</p></div>
                <div className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-right"><p className="font-display text-3xl">{templateKpis.length}</p><p className="text-xs text-muted">KPIs</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {templateDepartments.slice(0, 5).map((department) => <span className="status-pill border-primary/15 bg-primary-tint text-primary" key={department.id}>{department.name}</span>)}
              </div>
              <div className="mt-5 flex gap-2">
                <button className="btn-secondary" onClick={() => setViewing(template)}><Eye className="h-4 w-4" /> View KPIs</button>
                <button className="btn-primary" onClick={() => setEditing(template)}><CopyPlus className="h-4 w-4" /> Edit</button>
              </div>
            </article>
          )
        })}
      </section>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        icon={<CopyPlus className="h-5 w-5" />}
        eyebrow="Template builder"
        title={editing?.id ? 'Edit KPI Template' : 'Create KPI Template'}
        description="Attach multiple KPIs to one template. Departments are automatically pulled from the selected KPI definitions."
        footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save Template</button></div>}
      >
        {editing ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="field" placeholder="Template name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
              <input className="field" placeholder="Description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="space-y-2">
                {kpis.map((kpi) => (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 hover:bg-primary-tint" key={kpi.id}>
                    <input
                      type="checkbox"
                      className="mt-1 accent-[var(--primary)]"
                      checked={editing.kpiIds.includes(kpi.id)}
                      onChange={(event) => {
                        const kpiIds = event.target.checked ? [...editing.kpiIds, kpi.id] : editing.kpiIds.filter((id) => id !== kpi.id)
                        setEditing({ ...editing, kpiIds })
                      }}
                    />
                    <span><span className="block font-semibold">{kpi.name}</span><span className="text-xs text-muted">{kpi.category} / {departments.find((department) => department.id === kpi.departmentId)?.name}</span></span>
                  </label>
                ))}
              </div>
              <aside className="card h-fit p-4">
                <p className="eyebrow">Live Preview</p>
                <p className="mt-2 font-display text-4xl">{selectedKpis.length}</p>
                <p className="text-sm text-muted">KPIs selected</p>
                <div className="mt-4 space-y-2">
                  {departments.filter((department) => selectedDepartmentIds.has(department.id)).map((department) => <div className="rounded-xl border border-border px-3 py-2 text-sm" key={department.id}>{department.name}</div>)}
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        icon={<Eye className="h-5 w-5" />}
        eyebrow="Template review"
        title={viewing?.name ?? 'Template'}
        description="Selected template with the full KPI list and departments pulled through KPI ownership."
      >
        <div className="space-y-3">
          {selectedKpis.map((kpi) => <div className="rounded-2xl border border-border bg-surface px-4 py-3" key={kpi.id}><p className="font-semibold">{kpi.name}</p><p className="text-xs text-muted">{kpi.category} / {departments.find((department) => department.id === kpi.departmentId)?.name}</p></div>)}
        </div>
      </Modal>
    </div>
  )
}
