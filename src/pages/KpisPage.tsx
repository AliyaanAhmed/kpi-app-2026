import { StatusPill } from '../components/ui/StatusPill'
import { AppSelect } from '../components/ui/AppSelect'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleUserRound, Search } from 'lucide-react'
import { cn } from '../lib/cn'
import type { SubmissionStatus } from '../domain/types'

type KpiStatusFilter =
  | 'all'
  | 'active'
  | 'draft'
  | 'submitted'
  | 'performance_assigned'
  | 'focal_points'
  | 'submitted_to_director'
  | 'director_approved'
  | 'published'
  | 'clarification_focal'
  | 'clarification_director'

function assignmentForKpi(kpiId: string, activeCycleId: string) {
  const kpi = mockApi.getKpi(kpiId)
  const submission = mockApi.getVisibleSubmissionsForRole('admin', 'u-admin', activeCycleId).find((item) => item.kpiId === kpiId)
  const users = mockApi.getUsers()
  const focalPoint = submission?.focalPointId
    ? users.find((item) => item.id === submission.focalPointId)
    : kpi
      ? users.find((item) => item.id === mockApi.getAssignedFocalPointId(kpi, activeCycleId))
      : undefined
  const department = kpi ? mockApi.getDepartment(kpi.departmentId) : undefined
  const director = department ? users.find((item) => item.id === department.directorId) : undefined
  const performanceUser = users.find((item) => item.role === 'performance_team')
  const status = submission?.status ?? 'active'

  if (['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director'].includes(status)) {
    return { role: 'Focal Point', name: focalPoint?.name ?? 'Unassigned Focal Point' }
  }
  if (['with_performance_team', 'director_approved'].includes(status)) {
    return { role: 'Performance Team', name: performanceUser?.name ?? 'Performance Team Queue' }
  }
  if (status === 'submitted_to_director') {
    return { role: 'Department Director', name: director?.name ?? 'Department Director Queue' }
  }
  if (status === 'published') {
    return { role: 'Published View', name: 'Executive / DGE visibility' }
  }
  return { role: 'Workflow Owner', name: focalPoint?.name ?? 'Unassigned' }
}

export function KpisPage() {
  const { activeCycleId } = useAppStore()
  const [sectorFilter, setSectorFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<KpiStatusFilter>('all')
  const [query, setQuery] = useState('')
  const user = mockApi.getCurrentUser()
  const roleKpis = mockApi.getKpisForRole(user.role, user.id, activeCycleId)
  const departments = mockApi.getDepartments()
  const sectors = mockApi.getSectors()
  const assignedDepartment = user.departmentId ? departments.find((department) => department.id === user.departmentId) : undefined
  const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
  const submissionByKpi = useMemo(() => new Map(submissions.map((submission) => [submission.kpiId, submission])), [submissions])
  const kpis = useMemo(
    () => user.role === 'admin'
      ? roleKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'active')
      : roleKpis,
    [roleKpis, submissionByKpi, user.role],
  )
  const visibleDepartmentIds = new Set(kpis.map((kpi) => kpi.departmentId))
  const visibleDepartments = departments.filter((department) => visibleDepartmentIds.has(department.id))
  const visibleSectorIds = new Set(visibleDepartments.map((department) => department.sectorId))
  const visibleSectors = sectors.filter((sector) => visibleSectorIds.has(sector.id))
  const defaultPerformanceSectorId = visibleSectors[0]?.id
  useEffect(() => {
    setSectorFilter('all')
    setDepartmentFilter('all')
    setStatusFilter('all')
    setQuery('')
  }, [activeCycleId, user.id])
  useEffect(() => {
    if (user.role === 'performance_team' && sectorFilter === 'all' && defaultPerformanceSectorId) {
      setSectorFilter(defaultPerformanceSectorId)
    }
  }, [defaultPerformanceSectorId, sectorFilter, user.role])
  const statusMatches = useCallback((status: SubmissionStatus) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return status === 'active'
    if (statusFilter === 'draft') return status === 'draft'
    if (statusFilter === 'submitted') return ['submitted', 'with_performance_team'].includes(status)
    if (statusFilter === 'performance_assigned') return ['with_performance_team', 'director_approved'].includes(status)
    if (statusFilter === 'focal_points') return ['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director'].includes(status)
    return status === statusFilter
  }, [statusFilter])
  const filteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        const submission = submissionByKpi.get(kpi.id)
        const status = submission?.status ?? 'active'
        const matchesSector = sectorFilter === 'all' || department?.sectorId === sectorFilter
        const matchesDepartment = departmentFilter === 'all' || kpi.departmentId === departmentFilter
        const matchesQuery = `${kpi.name} ${kpi.description} ${kpi.category} ${department?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = !['focal_point', 'performance_team', 'department_director'].includes(user.role) || statusMatches(status)
        return matchesSector && matchesDepartment && matchesQuery && matchesStatus
      }),
    [departmentFilter, departments, kpis, query, sectorFilter, statusMatches, submissionByKpi, user.role],
  )
  const departmentTabs = useMemo(
    () => [
      { id: 'all', label: 'All Departments', count: kpis.length },
      ...visibleDepartments.map((department) => ({
        id: department.id,
        label: department.name,
        count: kpis.filter((kpi) => kpi.departmentId === department.id).length,
      })),
    ],
    [kpis, visibleDepartments],
  )
  const sectorTabs = useMemo(
    () => [
      { id: 'all', label: 'All Sectors', count: kpis.length },
      ...visibleSectors.map((sector) => {
        const sectorDepartmentIds = new Set(departments.filter((department) => department.sectorId === sector.id).map((department) => department.id))
        return {
          id: sector.id,
          label: sector.name,
          count: kpis.filter((kpi) => sectorDepartmentIds.has(kpi.departmentId)).length,
        }
      }),
    ],
    [departments, kpis, visibleSectors],
  )
  const performanceSectorTabs = sectorTabs
  const performanceSectorFilteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        return sectorFilter === 'all' || department?.sectorId === sectorFilter
      }),
    [departments, kpis, sectorFilter],
  )
  const performanceDepartmentTabs = useMemo(
    () => [
      { id: 'all', label: 'All Departments', count: performanceSectorFilteredKpis.length },
      ...visibleDepartments
        .filter((department) => sectorFilter === 'all' || department.sectorId === sectorFilter)
        .map((department) => ({
          id: department.id,
          label: department.name,
          count: performanceSectorFilteredKpis.filter((kpi) => kpi.departmentId === department.id).length,
        })),
    ],
    [performanceSectorFilteredKpis, sectorFilter, visibleDepartments],
  )
  const baseDepartmentFilteredKpis = useMemo(
    () =>
      kpis.filter((kpi) => {
        const department = departments.find((item) => item.id === kpi.departmentId)
        const matchesSector = sectorFilter === 'all' || department?.sectorId === sectorFilter
        const matchesDepartment = departmentFilter === 'all' || kpi.departmentId === departmentFilter
        return matchesSector && matchesDepartment
      }),
    [departmentFilter, departments, kpis, sectorFilter],
  )
  const statusTabs = [
    { id: 'all' as const, label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'active' as const,
      label: 'Active',
      count: baseDepartmentFilteredKpis.filter((kpi) => {
        const status = submissionByKpi.get(kpi.id)?.status ?? 'active'
        return status === 'active'
      }).length,
    },
    {
      id: 'draft' as const,
      label: 'Draft',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'draft').length,
    },
    {
      id: 'submitted' as const,
      label: 'Submitted to Performance Team',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['submitted', 'with_performance_team'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
  ]
  const performanceStatusTabs: { id: KpiStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'performance_assigned',
      label: 'Assigned to Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['with_performance_team', 'director_approved'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
    {
      id: 'submitted_to_director',
      label: 'Submitted to Director',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'submitted_to_director').length,
    },
    {
      id: 'published',
      label: 'Published',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'published').length,
    },
    {
      id: 'clarification_focal',
      label: 'Clarification from Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'clarification_focal').length,
    },
    {
      id: 'clarification_director',
      label: 'Clarification from Director',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'clarification_director').length,
    },
  ]
  const directorStatusTabs: { id: KpiStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: baseDepartmentFilteredKpis.length },
    {
      id: 'focal_points',
      label: 'With Focal Points',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['active', 'draft', 'submitted', 'clarification_focal', 'clarification_director'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
    {
      id: 'performance_assigned',
      label: 'With Performance Team',
      count: baseDepartmentFilteredKpis.filter((kpi) => ['with_performance_team', 'director_approved'].includes(submissionByKpi.get(kpi.id)?.status ?? 'active')).length,
    },
    {
      id: 'submitted_to_director',
      label: 'Submitted to Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'submitted_to_director').length,
    },
    {
      id: 'director_approved',
      label: 'Approved By Me',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'director_approved').length,
    },
    {
      id: 'published',
      label: 'Published',
      count: baseDepartmentFilteredKpis.filter((kpi) => (submissionByKpi.get(kpi.id)?.status ?? 'active') === 'published').length,
    },
  ]
  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active
        ? 'bg-primary text-white shadow-soft'
        : 'border border-border bg-surface-raised text-text hover:bg-primary-tint hover:text-primary',
    )

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Role and cycle filtered</p>
            <h2 className="text-xl">KPI Browser</h2>
            <p className="mt-1 text-sm text-muted">
              {user.role === 'department_director' && assignedDepartment
                ? `${filteredKpis.length} KPI records visible for ${assignedDepartment.name} only.`
                : `${filteredKpis.length} visible KPI records for the selected cycle.`}
            </p>
          </div>
          <StatusPill value={user.role} />
        </div>
        {user.role === 'focal_point' ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {departmentTabs.map((tab) => (
              <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {user.role === 'performance_team' ? (
          <div className="mt-4 rounded-[22px] border border-border bg-surface-raised p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-sm font-extrabold">Performance filters</h3>
                <p className="mt-1 text-xs text-muted">Select one sector, narrow by department, then filter by workflow movement.</p>
              </div>
              <div className="form-field-surface flex h-10 w-full items-center gap-2 px-3 text-muted xl:w-[440px]">
                <Search className="h-4 w-4" />
                <input className="h-full flex-1 bg-transparent text-sm font-medium text-text outline-none" placeholder="Search KPI, category, or department..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Sectors</span>
                <div className="flex flex-wrap gap-2">
                  {performanceSectorTabs.map((tab) => (
                    <button
                      className={tabClass(sectorFilter === tab.id)}
                      key={tab.id}
                      onClick={() => {
                        setSectorFilter(tab.id)
                        setDepartmentFilter('all')
                      }}
                      type="button"
                    >
                      {tab.label}
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', sectorFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Departments</span>
                <div className="flex flex-wrap gap-2">
                  {performanceDepartmentTabs.map((tab) => (
                    <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                      {tab.label}
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
                <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Flow</span>
                <div className="flex flex-wrap gap-2">
                {performanceStatusTabs.map((tab) => (
                  <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {user.role !== 'performance_team' ? (
        <div className={cn('mt-4 grid gap-3', ['focal_point', 'department_director', 'executive_director', 'director_general'].includes(user.role) ? 'lg:grid-cols-1' : 'lg:grid-cols-[1fr_260px]')}>
          <div className="form-field-surface flex h-10 items-center gap-2 px-3 text-muted">
            <Search className="h-4 w-4" />
            <input className="h-full flex-1 bg-transparent text-sm font-medium text-text outline-none" placeholder="Search KPI, category, or department..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {!['focal_point', 'department_director', 'executive_director', 'director_general'].includes(user.role) ? (
            <AppSelect
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              options={
                user.role === 'department_director' && assignedDepartment
                  ? [{ value: 'all', label: assignedDepartment.name }]
                  : [{ value: 'all', label: 'All visible departments' }, ...visibleDepartments.map((department) => ({ value: department.id, label: department.name }))]
              }
            />
          ) : null}
        </div>
        ) : null}
        {user.role === 'director_general' ? (
          <div className="mt-3 space-y-3 rounded-[22px] border border-border bg-surface-raised p-3">
            <div className="grid gap-2 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
              <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Sectors</span>
              <div className="flex flex-wrap gap-2">
                {sectorTabs.map((tab) => (
                  <button
                    className={tabClass(sectorFilter === tab.id)}
                    key={tab.id}
                    onClick={() => {
                      setSectorFilter(tab.id)
                      setDepartmentFilter('all')
                    }}
                    type="button"
                  >
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', sectorFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 border-t border-border pt-3 xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start">
              <span className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Departments</span>
              <div className="flex flex-wrap gap-2">
                {performanceDepartmentTabs.map((tab) => (
                  <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {user.role === 'executive_director' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {departmentTabs.map((tab) => (
              <button className={tabClass(departmentFilter === tab.id)} key={tab.id} onClick={() => setDepartmentFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', departmentFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {user.role === 'department_director' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {directorStatusTabs.map((tab) => (
              <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {user.role === 'focal_point' ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {statusTabs.map((tab) => (
              <button className={tabClass(statusFilter === tab.id)} key={tab.id} onClick={() => setStatusFilter(tab.id)} type="button">
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold', statusFilter === tab.id ? 'bg-white/20' : 'bg-surface text-muted')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="sticky top-0 bg-surface-raised text-xs uppercase text-muted">
            {user.role === 'admin' ? (
              <tr><th className="px-4 py-3">KPI</th><th>Department</th><th>Category</th><th>Status</th></tr>
            ) : (
              <tr><th className="px-4 py-3">KPI</th><th>Department</th><th>Assigned To</th><th>Category</th><th>Status</th></tr>
            )}
          </thead>
          <tbody>
            {filteredKpis.map((kpi) => {
              const assignment = assignmentForKpi(kpi.id, activeCycleId)
              return (
                <tr className="border-t border-border hover:bg-primary-tint" key={kpi.id}>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-text transition hover:text-primary" to={user.role === 'focal_point' ? `/kpis/${kpi.id}/fill` : `/kpis/${kpi.id}`}>{kpi.name}</Link>
                    <p className="text-xs text-muted">{kpi.description}</p>
                  </td>
                  <td>{departments.find((department) => department.id === kpi.departmentId)?.name}</td>
                  {user.role === 'admin' ? (
                    <>
                      <td>{kpi.category}</td>
                      <td><StatusPill value={submissions.find((submission) => submission.kpiId === kpi.id)?.status ?? 'active'} /></td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="flex min-w-[210px] items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                            <CircleUserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{assignment.name}</p>
                            <p className="text-xs text-muted">{assignment.role}</p>
                          </div>
                        </div>
                      </td>
                      <td>{kpi.category}</td>
                      <td><StatusPill value={submissions.find((submission) => submission.kpiId === kpi.id)?.status ?? 'active'} /></td>
                    </>
                  )}
                </tr>
              )
            })}
            {!filteredKpis.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-muted" colSpan={user.role === 'admin' ? 4 : 5}>
                  No KPIs are visible for this role and cycle yet. Published KPIs will appear here for view-only roles.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
