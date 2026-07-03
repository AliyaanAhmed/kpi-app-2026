import { motion } from 'framer-motion'
import { Building2, CheckCircle2, Clock3, RotateCcw, Send, Users } from 'lucide-react'
import { StatusPill } from '../components/ui/StatusPill'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

export function TrackersPage() {
  const { activeCycleId } = useAppStore()
  const user = mockApi.getCurrentUser()
  const departments = mockApi.getDepartments()
  const teams = mockApi.getTeams()
  const users = mockApi.getUsers()
  const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const visibleKpiIds = new Set(submissions.map((submission) => submission.kpiId))
  const kpis = mockApi.getKpis().filter((kpi) => visibleKpiIds.has(kpi.id))
  const visibleDepartmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
  const visibleDepartments = departments.filter((department) => visibleDepartmentIds.has(department.id))
  const trackerStats = [
    { label: 'Pending Validation', value: submissions.filter((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status)).length, icon: Clock3 },
    { label: 'Director Handoff', value: new Set(submissions.filter((submission) => submission.status === 'submitted_to_director').map((submission) => mockApi.getKpi(submission.kpiId)?.departmentId)).size, icon: Send },
    { label: 'Returned KPIs', value: submissions.filter((submission) => ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)).length, icon: RotateCcw },
    { label: 'Published Departments', value: new Set(submissions.filter((submission) => submission.status === 'published').map((submission) => mockApi.getKpi(submission.kpiId)?.departmentId)).size, icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Performance Team</p>
            <h2 className="mt-1 text-3xl">Department & Focal Point Trackers</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">Monitor validation movement, focal point submissions, director handoff, and published scope by department.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {trackerStats.map((stat) => (
              <div className="rounded-2xl border border-border bg-surface px-4 py-3" key={stat.label}>
                <div className="flex items-center gap-2 text-primary">
                  <stat.icon className="h-4 w-4" />
                  <p className="font-display text-2xl font-extrabold">{stat.value}</p>
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        {visibleDepartments.map((department, departmentIndex) => {
          const departmentKpis = kpis.filter((kpi) => kpi.departmentId === department.id)
          const departmentSubmissions = submissions.filter((submission) => departmentKpis.some((kpi) => kpi.id === submission.kpiId))
          const published = departmentSubmissions.filter((submission) => submission.status === 'published').length
          const pending = departmentSubmissions.filter((submission) => ['submitted_to_performance_team', 'with_performance_team'].includes(submission.status)).length
          const director = departmentSubmissions.filter((submission) => submission.status === 'submitted_to_director').length
          const returned = departmentSubmissions.filter((submission) => ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(submission.status)).length
          const completion = Math.round((published / Math.max(1, departmentSubmissions.length)) * 100)
          const team = teams.find((item) => item.departmentId === department.id)
          const focalRows = team?.focalPointIds.map((id) => {
            const focalSubmissions = departmentSubmissions.filter((submission) => submission.focalPointId === id)
            const moved = focalSubmissions.filter((submission) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
            return {
              id,
              name: users.find((item) => item.id === id)?.name ?? 'Focal Point',
              total: focalSubmissions.length,
              moved,
              percent: Math.round((moved / Math.max(1, focalSubmissions.length)) * 100),
            }
          }) ?? []

          return (
            <motion.article
              className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-premium"
              key={department.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: departmentIndex * 0.04 }}
            >
              <div className="border-b border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="eyebrow">Department Tracker</p>
                      <h3 className="mt-1 truncate text-xl font-bold">{department.name}</h3>
                      <p className="mt-1 text-sm text-muted">{departmentSubmissions.length} KPI submissions</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary-tint px-4 py-3 text-right">
                    <p className="font-display text-3xl font-extrabold leading-none text-primary">{published}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">Published KPIs</p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
                    <span>Publishing progress</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary-tint">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${completion}%` }}
                      transition={{ delay: departmentIndex * 0.04, duration: 0.45 }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{pending}</p><p className="text-xs text-muted">Pending validation</p></div>
                  <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{director}</p><p className="text-xs text-muted">With directors</p></div>
                  <div className="rounded-2xl border border-border bg-surface-raised p-3"><p className="font-display text-2xl font-extrabold">{returned}</p><p className="text-xs text-muted">Returned</p></div>
                </div>
              </div>
              <div className="space-y-2 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">Focal point movement</p>
                </div>
                {focalRows.map((row) => (
                  <div className="rounded-2xl border border-border bg-surface-raised p-3" key={row.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.name}</p>
                        <p className="mt-1 text-xs text-muted">{row.moved}/{row.total} submitted onward</p>
                      </div>
                      <StatusPill value={row.moved === row.total && row.total > 0 ? 'submitted_to_performance_team' : 'active'} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-tint">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${row.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          )
        })}
      </section>
    </div>
  )
}
