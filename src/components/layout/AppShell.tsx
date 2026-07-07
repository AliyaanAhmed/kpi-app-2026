import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Gauge,
  History,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Moon,
  FilePenLine,
  ShieldCheck,
  Sun,
  Target,
  UserCog,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { mockApi } from '../../mockApi/mockApi'
import { roleLabel, useAppStore } from '../../store/appStore'
import { cn } from '../../lib/cn'
import type { Role } from '../../domain/types'

const navItems: { label: string; path: string; icon: React.ComponentType<{ className?: string }>; roles: Role[] }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'focal_point', 'performance_team', 'department_director', 'executive_director', 'director_general'] },
  { label: 'KPIs', path: '/kpis', icon: Target, roles: ['admin', 'focal_point', 'performance_team', 'department_director', 'executive_director', 'director_general'] },
  { label: 'Change Requests', path: '/change-requests', icon: FilePenLine, roles: ['focal_point', 'performance_team'] },
  { label: 'Review Queue', path: '/approval/validate', icon: ListChecks, roles: ['performance_team'] },
  { label: 'Approval Queue', path: '/approval/queue', icon: ShieldCheck, roles: ['department_director'] },
  { label: 'Trackers', path: '/trackers/departments', icon: BarChart3, roles: ['performance_team'] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'performance_team', 'department_director', 'executive_director', 'director_general'] },
  { label: 'Audit Log', path: '/activity', icon: History, roles: ['admin', 'performance_team'] },
  { label: 'KPI Templates', path: '/admin/templates', icon: Gauge, roles: ['admin'] },
  { label: 'KPI Definitions', path: '/admin/kpi-definitions', icon: Target, roles: ['admin'] },
  { label: 'Cycle Management', path: '/admin/cycles', icon: CalendarDays, roles: ['admin'] },
  { label: 'User Management', path: '/admin/users', icon: UserCog, roles: ['admin'] },
  { label: 'DGE Hierarchy', path: '/admin/hierarchy', icon: Landmark, roles: ['admin'] },
] as const

const demoRoleUserIds = [
  'u-admin',
  'u-fp-data',
  'u-fp-cloud',
  'u-fp-shared',
  'u-pa-1',
  'u-dir-data',
  'u-dir-cloud',
  'u-ed-digital',
  'u-dg-1',
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeUserId, activeCycleId, setActiveUser, setActiveCycle, theme, setTheme, sidebarCollapsed, setSidebarCollapsed } =
    useAppStore()
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [cycleMenuOpen, setCycleMenuOpen] = useState(false)
  const roleMenuRef = useRef<HTMLDivElement>(null)
  const cycleMenuRef = useRef<HTMLDivElement>(null)
  const users = mockApi.getUsers()
  const cycles = mockApi.getCycles()
  const user = users.find((item) => item.id === activeUserId) ?? users[0]
  const roleSwitchUsers = demoRoleUserIds
    .map((id) => users.find((item) => item.id === id))
    .filter((item): item is typeof users[number] => Boolean(item))
  const activeCycle = cycles.find((cycle) => cycle.id === activeCycleId) ?? cycles[0]
  const showActiveCycleCard = location.pathname === '/dashboard'
  const visibleNav = navItems.filter((item) => item.roles.includes(user.role))
  const queueCounts = useMemo(() => {
    const visibleSubmissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, activeCycleId)
    return {
      '/approval/validate': visibleSubmissions.filter((submission) => ['submitted_to_performance_team', 'reviewed_by_performance_team', 'with_performance_team', 'approved_by_director', 'director_approved'].includes(submission.status)).length,
      '/approval/queue': visibleSubmissions.filter((submission) => {
        if (submission.status !== 'submitted_to_director') return false
        const kpi = mockApi.getKpi(submission.kpiId)
        return kpi?.departmentId === user.departmentId
      }).length,
      '/change-requests': user.role === 'performance_team'
        ? mockApi.getChangeRequests().filter((request) => request.status === 'pending').length
        : mockApi.getChangeRequests().filter((request) => request.focalPointId === user.id && request.status === 'pending').length,
    }
  }, [activeCycleId, user.id, user.role, user.departmentId])
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setRoleMenuOpen(false)
    setCycleMenuOpen(false)
  }, [location.pathname])
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (roleMenuOpen && roleMenuRef.current && !roleMenuRef.current.contains(target)) setRoleMenuOpen(false)
      if (cycleMenuOpen && cycleMenuRef.current && !cycleMenuRef.current.contains(target)) setCycleMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [cycleMenuOpen, roleMenuOpen])

  return (
    <div className="min-h-screen bg-bg text-text">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-surface px-3 text-text transition-all',
          sidebarCollapsed ? 'w-[76px]' : 'w-[280px]',
        )}
      >
        <div className="-mx-3 flex h-16 shrink-0 items-center border-b border-border px-3">
          <button
            className={cn(
              'group flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left text-text transition hover:bg-primary-tint hover:text-primary',
              sidebarCollapsed && 'justify-center px-0',
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition duration-200 group-hover:scale-105 group-hover:bg-primary-hover">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-text">GovDigital</p>
                <p className="truncate text-xs font-medium text-muted">KPI Management System</p>
              </div>
            ) : null}
          </button>
        </div>

        <nav className="mt-4 grid gap-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-primary-tint hover:text-primary',
                  isActive && 'bg-primary text-white hover:bg-primary hover:text-white',
                  sidebarCollapsed && 'justify-center px-0',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0 transition group-hover:scale-110" />
              {!sidebarCollapsed ? item.label : null}
              {!sidebarCollapsed && queueCounts[item.path as keyof typeof queueCounts] ? (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-hover px-1.5 text-[11px] font-bold text-white">
                  {queueCounts[item.path as keyof typeof queueCounts]}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-surface-raised p-3 text-text">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{user.name}</p>
                <p className="truncate text-xs font-semibold text-primary">{roleLabel(user.role)}</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className={cn('transition-all', sidebarCollapsed ? 'pl-[76px]' : 'pl-[280px]')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white px-6 backdrop-blur dark:bg-surface">
          <div className="relative" ref={cycleMenuRef}>
            <button
              className="flex h-11 min-w-[230px] items-center gap-2 rounded-2xl border border-border bg-surface px-2.5 text-left transition hover:bg-surface-raised hover:shadow-soft"
              onClick={() => setCycleMenuOpen((open) => !open)}
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{activeCycle.label}</p>
                <p className="truncate text-xs text-muted">{activeCycle.startDate} - {activeCycle.endDate}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {cycleMenuOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.85rem)] z-50 w-[330px] overflow-hidden rounded-2xl border border-border bg-surface p-2 text-text shadow-modal">
                <div className="mb-1 rounded-xl bg-surface-raised p-3">
                  <p className="eyebrow">Current Cycle</p>
                  <p className="mt-1 text-sm font-semibold">{activeCycle.label}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{activeCycle.startDate} - {activeCycle.endDate}</p>
                </div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted">Switch Cycle</div>
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {cycles.map((cycle) => {
                    const active = cycle.id === activeCycleId
                    const submissions = mockApi.getVisibleSubmissionsForRole(user.role, user.id, cycle.id)
                    return (
                      <button
                        className={cn(
                          'mb-1 flex w-full items-start gap-2 rounded-xl p-2.5 text-left text-sm transition hover:bg-surface-raised hover:text-primary',
                          active && 'bg-primary-tint text-primary',
                        )}
                        key={cycle.id}
                        onClick={() => {
                          setActiveCycle(cycle.id)
                          setCycleMenuOpen(false)
                        }}
                        type="button"
                      >
                        <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface', active && 'border-primary/15 bg-surface-raised')}>
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{cycle.label}</p>
                          <p className="mt-1 text-xs leading-tight text-muted">{cycle.startDate} - {cycle.endDate}</p>
                          <p className="mt-1 text-xs leading-tight text-muted">{submissions.length} visible KPI submissions</p>
                        </div>
                        {active ? <Check className="mt-1 h-4 w-4 shrink-0" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex-1" />
          <button className="btn-secondary h-10 w-10 rounded-full p-0" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="relative" ref={roleMenuRef}>
            <button
              className="flex h-11 min-w-[240px] items-center gap-3 rounded-2xl border border-border bg-surface px-3 text-left transition hover:bg-surface-raised hover:shadow-soft"
              onClick={() => setRoleMenuOpen((open) => !open)}
              type="button"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-muted">{roleLabel(user.role)}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {roleMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.85rem)] z-50 w-[310px] overflow-hidden rounded-2xl border border-border bg-surface p-2 text-text shadow-modal">
                <div className="mb-1 rounded-xl bg-surface-raised p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted">{roleLabel(user.role)}</p>
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted">Switch Role</div>
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {roleSwitchUsers.map((option) => {
                    const active = option.id === activeUserId
                    return (
                      <button
                        className={cn(
                          'mb-1 flex w-full items-start gap-2 rounded-xl p-3 text-left text-sm transition hover:bg-surface-raised hover:text-primary',
                          active && 'bg-primary-tint text-primary',
                        )}
                        key={option.id}
                        onClick={() => {
                          setActiveUser(option.id)
                          setRoleMenuOpen(false)
                          navigate('/dashboard')
                        }}
                        type="button"
                      >
                        <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface', active && 'border-primary/15 bg-surface-raised')}>
                          <CircleUserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{option.name}</p>
                          <p className="mt-1 text-xs leading-tight text-muted">{roleLabel(option.role)}</p>
                        </div>
                        {active ? <Check className="mt-1 h-4 w-4 shrink-0" /> : null}
                      </button>
                    )
                  })}
                </div>
                <div className="-mx-1 my-1 h-px bg-border" />
                <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm transition hover:bg-surface-raised hover:text-primary" type="button">
                  <BriefcaseBusiness className="h-4 w-4" /> Manage Profile
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="px-6 py-6">
          {showActiveCycleCard ? (
            <div className="mb-5">
              <div>
                <p className="eyebrow">Active Cycle</p>
                <h1 className="mt-1 text-3xl">{activeCycle.label}</h1>
              </div>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

    </div>
  )
}
