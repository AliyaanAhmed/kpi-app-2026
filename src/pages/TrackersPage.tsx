import { motion } from 'framer-motion'
import { BarChart3, Building2, Filter, Sparkles, Users } from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'
import { AppSelect } from '../components/ui/AppSelect'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'

type TrackerView = 'focal_point' | 'department'

function progressPercent(done: number, total: number) {
  return Math.round((done / Math.max(1, total)) * 100)
}

function isSubmitted(status: string) {
  return !['active', 'draft', 'clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(status)
}

function isValidated(status: string) {
  return ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(status)
}

function isDirectorReviewed(status: string) {
  return ['reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(status)
}

function isClarification(status: string) {
  return ['clarification_focal', 'clarification_director', 'clarification_from_performance', 'clarification_from_director'].includes(status)
}

function ProgressBar({ value, tone = 'bg-primary' }: { value: number; tone?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-primary-tint">
      <motion.div className={`h-full rounded-full ${tone}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.45 }} />
    </div>
  )
}

function SummaryCard({
  title,
  icon: Icon,
  total,
  primary,
  secondary,
  progress,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  total: { label: string; value: number }
  primary: { label: string; value: number }
  secondary: { label: string; value: number }
  progress: number
}) {
  return (
    <article className="group rounded-[24px] border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-extrabold text-text">{title}</h3>
          <p className="mt-1 text-sm font-normal text-text">Live movement from current cycle records.</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {[total, primary, secondary].map((metric) => (
          <div key={metric.label}>
            <p className="font-display text-3xl font-extrabold leading-none text-text">{metric.value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{metric.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </article>
  )
}

export function TrackersPage() {
  const { activeCycleId } = useAppStore()
  const [view, setView] = useState<TrackerView>('focal_point')
  const [sectorFilter, setSectorFilter] = useState('all')
  const user = mockApi.getCurrentUser()
  const departments = mockApi.getDepartments()
  const sectors = mockApi.getSectors()
  const teams = mockApi.getTeams()
  const users = mockApi.getUsers()
  const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const visibleKpiIds = new Set(submissions.map((submission) => submission.kpiId))
  const kpis = mockApi.getKpis().filter((kpi) => visibleKpiIds.has(kpi.id))
  const visibleDepartmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
  const visibleDepartments = departments.filter((department) => visibleDepartmentIds.has(department.id) && (sectorFilter === 'all' || department.sectorId === sectorFilter))
  const sectorOptions = [
    { value: 'all', label: 'All Sectors' },
    ...sectors.filter((sector) => departments.some((department) => visibleDepartmentIds.has(department.id) && department.sectorId === sector.id)).map((sector) => ({ value: sector.id, label: sector.name })),
  ]

  const focalRows = useMemo(() => {
    const ids = Array.from(new Set(submissions.map((submission) => submission.focalPointId)))
    return ids.map((id) => {
      const focalSubmissions = submissions.filter((submission) => submission.focalPointId === id)
      const departmentNames = Array.from(new Set(
        focalSubmissions
          .map((submission) => mockApi.getDepartment(mockApi.getKpi(submission.kpiId)?.departmentId ?? '')?.name)
          .filter((name): name is string => Boolean(name)),
      ))
      const completed = focalSubmissions.filter((submission) => submission.status === 'draft' || submission.actualScore !== undefined || isSubmitted(submission.status)).length
      const submitted = focalSubmissions.filter((submission) => isSubmitted(submission.status)).length
      const validated = focalSubmissions.filter((submission) => isValidated(submission.status)).length
      const directorReviewed = focalSubmissions.filter((submission) => isDirectorReviewed(submission.status)).length
      const returned = focalSubmissions.filter((submission) => isClarification(submission.status)).length
      const stage = directorReviewed > 0 ? 'Director Review' : validated > 0 ? 'Performance Team Validation' : 'Entry'
      return {
        id,
        name: users.find((item) => item.id === id)?.name ?? 'Focal Point',
        departmentNames,
        total: focalSubmissions.length,
        completed,
        submitted,
        validated,
        directorReviewed,
        returned,
        stage,
      }
    })
  }, [submissions, users])

  const departmentRows = visibleDepartments.map((department) => {
    const sector = sectors.find((item) => item.id === department.sectorId)
    const departmentKpis = kpis.filter((kpi) => kpi.departmentId === department.id)
    const departmentSubmissions = submissions.filter((submission) => departmentKpis.some((kpi) => kpi.id === submission.kpiId))
    const submitted = departmentSubmissions.filter((submission) => isSubmitted(submission.status)).length
    const validated = departmentSubmissions.filter((submission) => isValidated(submission.status)).length
    const toDirector = departmentSubmissions.filter((submission) => ['submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'director_approved', 'published'].includes(submission.status)).length
    const directorReviewed = departmentSubmissions.filter((submission) => isDirectorReviewed(submission.status)).length
    const team = teams.find((item) => item.departmentId === department.id)
    const focalPoints = (team?.focalPointIds ?? []).map((id) => {
      const focalSubmissions = departmentSubmissions.filter((submission) => submission.focalPointId === id)
      const completed = focalSubmissions.filter((submission) => submission.status === 'draft' || submission.actualScore !== undefined || isSubmitted(submission.status)).length
      const fpValidated = focalSubmissions.filter((submission) => isValidated(submission.status)).length
      const fpDirectorReviewed = focalSubmissions.filter((submission) => isDirectorReviewed(submission.status)).length
      const returned = focalSubmissions.filter((submission) => isClarification(submission.status)).length
      return {
        id,
        name: users.find((item) => item.id === id)?.name ?? 'Focal Point',
        total: focalSubmissions.length,
        completed,
        validated: fpValidated,
        directorReviewed: fpDirectorReviewed,
        returned,
      }
    }).filter((row) => row.total > 0)
    return { department, sector, total: departmentSubmissions.length, submitted, validated, toDirector, directorReviewed, focalPoints }
  })

  const submittedFocalPoints = focalRows.filter((row) => row.submitted > 0).length
  const validatedFocalPoints = focalRows.filter((row) => row.validated > 0).length
  const summary = `${submittedFocalPoints} focal points have submitted, ${validatedFocalPoints} are validated by the Performance Team and are now pending with Director.`
  const departmentSubmissionTotal = departmentRows.length
  const departmentSubmissionCompleted = departmentRows.filter((row) => row.submitted === row.total && row.total > 0).length
  const departmentReviewTotal = departmentRows.length
  const departmentReviewed = departmentRows.filter((row) => row.validated === row.total && row.total > 0).length
  const focalSubmitted = focalRows.filter((row) => row.submitted > 0).length

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl">Department & Focal Point Trackers</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">Track Submission, Review, Director Review, and Clarification / Returned movement across the active cycle.</p>
          </div>
          <div className="inline-flex rounded-2xl border border-border bg-surface p-1 shadow-soft">
            {[
              { id: 'department' as const, label: 'Department' },
              { id: 'focal_point' as const, label: 'Focal Point' },
            ].map((item) => (
              <button className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${view === item.id ? 'bg-primary text-white' : 'text-muted hover:bg-primary-tint hover:text-primary'}`} key={item.id} onClick={() => setView(item.id)} type="button">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          title="Departments / Submission"
          icon={Building2}
          total={{ label: 'Total', value: departmentSubmissionTotal }}
          primary={{ label: 'Completed', value: departmentSubmissionCompleted }}
          secondary={{ label: 'Pending', value: Math.max(0, departmentSubmissionTotal - departmentSubmissionCompleted) }}
          progress={progressPercent(departmentSubmissionCompleted, departmentSubmissionTotal)}
        />
        <SummaryCard
          title="Departments / Review"
          icon={BarChart3}
          total={{ label: 'Total', value: departmentReviewTotal }}
          primary={{ label: 'Reviewed', value: departmentReviewed }}
          secondary={{ label: 'Pending', value: Math.max(0, departmentReviewTotal - departmentReviewed) }}
          progress={progressPercent(departmentReviewed, departmentReviewTotal)}
        />
        <SummaryCard
          title="Focal Points / Submissions"
          icon={Users}
          total={{ label: 'Total', value: focalRows.length }}
          primary={{ label: 'Submitted', value: focalSubmitted }}
          secondary={{ label: 'Pending', value: Math.max(0, focalRows.length - focalSubmitted) }}
          progress={progressPercent(focalSubmitted, focalRows.length)}
        />
      </section>

      <section className="ai-panel">
        <div className="flex items-start gap-3">
          <div className="ai-icon h-11 w-11"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h3 className="ai-heading text-xl font-extrabold">AI Summary</h3>
            <p className="mt-2 text-sm font-semibold text-text">{summary}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[24px] border border-border bg-surface p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-tint text-primary"><Filter className="h-4 w-4" /></div>
          <div>
            <h3 className="text-base font-extrabold">Filters</h3>
            <p className="text-sm text-muted">Department-wise filters: Sector</p>
          </div>
        </div>
        <div className="w-full lg:w-[280px]">
          <AppSelect value={sectorFilter} onValueChange={setSectorFilter} options={sectorOptions} />
        </div>
      </section>

      {view === 'department' ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {departmentRows.map((row, index) => (
            <motion.article className="card p-5" key={row.department.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-extrabold">{row.department.name}</h3>
                    <p className="mt-1 text-sm text-muted">{row.sector?.name ?? 'Sector'}</p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary-tint px-3 py-1 text-xs font-extrabold text-primary">
                  {row.total} KPIs
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border bg-surface-raised p-4">
                  <div className="mb-2 flex justify-between text-sm font-bold">
                    <span>Focal Point Submission</span>
                    <span>{row.total} KPIs / {row.submitted} Submitted / {Math.max(0, row.total - row.submitted)} Pending</span>
                  </div>
                  <ProgressBar value={progressPercent(row.submitted, row.total)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">{row.submitted} Submitted</span>
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">{Math.max(0, row.total - row.submitted)} Pending</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-surface-raised p-4">
                    <p className="text-sm font-bold">Performance Review</p>
                    <p className="mt-2 text-xs text-muted">{row.total} KPIs / {row.validated} Validated / {Math.max(0, row.total - row.validated)} Pending</p>
                    <div className="mt-3"><ProgressBar value={progressPercent(row.validated, row.total)} tone="bg-success" /></div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-raised p-4">
                    <p className="text-sm font-bold">Director Review</p>
                    <p className="mt-2 text-xs text-muted">{row.toDirector} Sent / {row.directorReviewed} Reviewed</p>
                    <div className="mt-3"><ProgressBar value={progressPercent(row.directorReviewed, Math.max(row.toDirector, row.total))} tone="bg-info" /></div>
                  </div>
                  <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                    <p className="text-sm font-bold text-warning">Clarification / Returned</p>
                    <p className="mt-2 font-display text-3xl font-extrabold text-warning">{row.focalPoints.reduce((sum, focal) => sum + focal.returned, 0)}</p>
                    <p className="text-xs font-bold text-muted">KPIs</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">Focal Points</p>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-muted">{row.focalPoints.length} assigned</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {row.focalPoints.map((focal) => (
                      <div className="rounded-2xl border border-border bg-surface p-3" key={focal.id}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-text">{focal.name}</p>
                            <p className="text-xs font-bold text-muted">{focal.total} KPIs, {focal.returned} returned</p>
                          </div>
                          <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
                            {progressPercent(focal.completed, focal.total)}% Entry
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div>
                            <div className="mb-1 flex justify-between text-xs font-bold text-muted"><span>Entry</span><span>{focal.completed}/{focal.total}</span></div>
                            <ProgressBar value={progressPercent(focal.completed, focal.total)} />
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs font-bold text-muted"><span>Review</span><span>{focal.validated}/{focal.total}</span></div>
                            <ProgressBar value={progressPercent(focal.validated, focal.total)} tone="bg-success" />
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs font-bold text-muted"><span>Director</span><span>{focal.directorReviewed}/{focal.total}</span></div>
                            <ProgressBar value={progressPercent(focal.directorReviewed, focal.total)} tone="bg-info" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {!row.focalPoints.length ? (
                      <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm font-bold text-muted">
                        No focal point records for this department in the selected cycle.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {focalRows.map((row, index) => (
            <motion.article className="card p-5" key={row.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-extrabold">{row.name}</h3>
                  <p className="mt-1 text-sm text-muted">{row.departmentNames.join(', ') || 'Departments'}</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary-tint px-3 py-1 text-xs font-extrabold text-primary">Stage: {row.stage}</span>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border bg-surface-raised p-4">
                  <div className="mb-2 flex justify-between text-sm font-bold"><span>Submissions</span><span>{row.total} KPIs / {row.completed} Completed / {Math.max(0, row.total - row.completed)} Remaining</span></div>
                  <ProgressBar value={progressPercent(row.completed, row.total)} />
                  <p className="mt-2 text-xs font-bold text-muted">Status: {row.completed === row.total && row.total > 0 ? 'Submitted' : 'Pending'}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-surface-raised p-4">
                    <p className="text-sm font-bold">Performance Review</p>
                    <p className="mt-2 text-xs text-muted">{row.total} KPIs / {row.validated} Validated / {Math.max(0, row.total - row.validated)} Pending</p>
                    <div className="mt-3"><ProgressBar value={progressPercent(row.validated, row.total)} tone="bg-success" /></div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-raised p-4">
                    <p className="text-sm font-bold">Director Review</p>
                    <p className="mt-2 text-xs text-muted">{row.total} KPIs / {row.directorReviewed} Reviewed</p>
                    <div className="mt-3"><ProgressBar value={progressPercent(row.directorReviewed, row.total)} tone="bg-info" /></div>
                  </div>
                  <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                    <p className="text-sm font-bold text-warning">Clarification / Returned</p>
                    <p className="mt-2 font-display text-3xl font-extrabold text-warning">{row.returned}</p>
                    <p className="text-xs font-bold text-muted">KPIs</p>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </div>
  )
}
