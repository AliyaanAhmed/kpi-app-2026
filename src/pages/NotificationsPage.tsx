import { Bell, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

export function NotificationsPage() {
  const { activeCycleId } = useAppStore()
  const user = mockApi.getCurrentUser()
  const kpis = mockApi.getKpisForRole(user.role, user.id, activeCycleId)
  const visibleIds = new Set(kpis.map((kpi) => kpi.id))
  const submissions = mockApi.getSubmissions().filter((submission) => submission.cycleId === activeCycleId && visibleIds.has(submission.kpiId)).slice(0, 8)

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <p className="eyebrow">Notifications</p>
        <h2 className="mt-1 text-3xl">Role-based alerts</h2>
        <p className="mt-2 text-sm text-muted">Alerts are generated from visible KPI assignments and recent status movement.</p>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {submissions.map((submission, index) => {
          const kpi = mockApi.getKpi(submission.kpiId)
          const urgent = submission.status.includes('clarification') || submission.status === 'with_performance_team'
          return (
            <article className="card p-5 transition hover:-translate-y-0.5 hover:shadow-premium" key={submission.id}>
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${urgent ? 'border-warning/25 bg-warning/10 text-warning' : 'border-primary/20 bg-primary-tint text-primary'}`}>
                  {urgent ? <MessageSquare className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{urgent ? 'Action required' : 'KPI movement update'}</p>
                  <p className="mt-1 text-sm text-muted">{kpi?.name} is currently {submission.status.replaceAll('_', ' ')}.</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">{index + 1} hr ago</span>
                    <Link className="text-sm font-semibold text-primary" to={`/kpis/${submission.kpiId}`}>Open</Link>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
