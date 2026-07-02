import { Download, FileText, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

export function ReportsPage() {
  const { activeCycleId } = useAppStore()
  const user = mockApi.getCurrentUser()
  const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const visibleKpis = mockApi.getKpisForRole(user.role, user.id, activeCycleId)
  const visibleDepartmentIds = new Set(visibleKpis.map((kpi) => kpi.departmentId))
  const departments = mockApi.getDepartments().filter((department) => visibleDepartmentIds.has(department.id))
  const reportCards: Array<{ title: string; copy: string; Icon: LucideIcon }> = [
    { title: 'Cycle Executive Brief', copy: 'Published KPIs, status counts, and department ranking.', Icon: FileText },
    { title: 'Audit Evidence Pack', copy: 'History log and evidence attachment register.', Icon: ShieldCheck },
    { title: 'Performance Trend', copy: 'Department performance movement across cycles.', Icon: TrendingUp },
  ]
  const data = departments.slice(0, 8).map((department, index) => ({
    department: department.name.split(' ')[0],
    published: submissions.filter((submission) => mockApi.getKpi(submission.kpiId)?.departmentId === department.id && submission.status === 'published').length,
    active: submissions.filter((submission) => mockApi.getKpi(submission.kpiId)?.departmentId === department.id).length || index,
  }))

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <p className="eyebrow">Reports</p>
        <h2 className="mt-1 text-3xl">KPI cycle reporting center</h2>
        <p className="mt-2 text-sm text-muted">Static local report previews for cycle health, published KPI coverage, and audit readiness.</p>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        {reportCards.map(({ title, copy, Icon }) => (
          <article className="card p-5 transition hover:-translate-y-0.5 hover:shadow-premium" key={title}>
            <div className="flex items-start justify-between">
              <div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm text-muted">{copy}</p></div>
              <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><Icon className="h-5 w-5" /></div>
            </div>
            <button className="btn-primary mt-5 h-9 text-xs" type="button"><Download className="h-4 w-4" /> Download Preview</button>
          </article>
        ))}
      </section>
      <section className="card p-5">
        <p className="eyebrow">Department Coverage</p>
        <h2 className="mb-4 text-xl">Published vs active KPI records</h2>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="department" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14 }} />
              <Bar dataKey="active" fill="var(--primary-tint)" radius={[10, 10, 0, 0]} />
              <Bar dataKey="published" fill="var(--primary)" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
