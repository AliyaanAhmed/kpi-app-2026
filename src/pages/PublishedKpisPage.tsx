import { FileText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusPill } from '../components/ui/StatusPill'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

export function PublishedKpisPage() {
  const { activeCycleId } = useAppStore()
  const user = mockApi.getCurrentUser()
  const kpis = mockApi.getKpisForRole(user.role, user.id, activeCycleId)
  const kpiIds = new Set(kpis.map((kpi) => kpi.id))
  const submissions = mockApi.getSubmissions().filter((submission) => submission.cycleId === activeCycleId && submission.status === 'published' && kpiIds.has(submission.kpiId))
  const departments = mockApi.getDepartments()

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <p className="eyebrow">Published KPI Browser</p>
        <h2 className="mt-1 text-3xl">Read-only published performance records</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Executive Director and Director General views only expose published KPI submissions through the mock API.
        </p>
      </section>
      <section className="card p-4">
        <div className="field flex max-w-xl items-center gap-2 text-muted"><Search className="h-4 w-4" /> Filter published KPIs by department, category, or KPI name</div>
      </section>
      <section className="grid gap-4">
        {submissions.map((submission) => {
          const kpi = mockApi.getKpi(submission.kpiId)
          const department = departments.find((item) => item.id === kpi?.departmentId)
          return (
            <article className="card p-5 transition hover:-translate-y-0.5 hover:shadow-premium" key={submission.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2"><StatusPill value={submission.status} /><span className="status-pill border-info/20 bg-info/10 text-info">{department?.name}</span></div>
                  <Link className="text-lg font-bold text-text transition hover:text-primary" to={`/kpis/${submission.kpiId}`}>{kpi?.name}</Link>
                  <p className="mt-1 text-sm text-muted">{kpi?.category}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Target</p><p className="font-display text-2xl">{submission.targetScore}</p></div>
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Actual</p><p className="font-display text-2xl">{submission.actualScore}</p></div>
                  <div className="rounded-2xl border border-border px-4 py-3"><p className="text-xs text-muted">Evidence</p><p className="font-display text-2xl">{submission.attachments.length}</p></div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn-secondary h-9 text-xs" type="button"><FileText className="h-4 w-4" /> Export Brief</button>
              </div>
            </article>
          )
        })}
        {!submissions.length ? <div className="card p-8 text-center text-sm text-muted">No published KPI records are visible for this role and cycle yet.</div> : null}
      </section>
    </div>
  )
}
