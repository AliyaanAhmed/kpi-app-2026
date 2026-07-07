import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RouteGuard } from './components/routing/RouteGuard'
import { AdminCyclesPage } from './pages/admin/AdminCyclesPage'
import { AdminHierarchyPage } from './pages/admin/AdminHierarchyPage'
import { AdminKpiDefinitionsPage } from './pages/admin/AdminKpiDefinitionsPage'
import { AdminTemplatesPage } from './pages/admin/AdminTemplatesPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { ApprovalQueuePage } from './pages/ApprovalQueuePage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { ChangeRequestsPage } from './pages/ChangeRequestsPage'
import { DashboardPage } from './pages/DashboardPage'
import { KpiDetailPage } from './pages/KpiDetailPage'
import { KpiFillPage } from './pages/KpiFillPage'
import { KpisPage } from './pages/KpisPage'
import { ReportsPage } from './pages/ReportsPage'
import { TrackersPage } from './pages/TrackersPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'kpis', element: <KpisPage /> },
      { path: 'kpis/:id', element: <KpiDetailPage /> },
      { path: 'kpis/:id/fill', element: <RouteGuard roles={['focal_point']}><KpiFillPage /></RouteGuard> },
      { path: 'kpis/:id/edit', element: <RouteGuard roles={['focal_point']}><KpiFillPage /></RouteGuard> },
      { path: 'published', element: <Navigate to="/kpis" replace /> },
      { path: 'approval/validate', element: <RouteGuard roles={['performance_team']}><ApprovalQueuePage mode="performance" /></RouteGuard> },
      { path: 'approval/queue', element: <RouteGuard roles={['department_director']}><ApprovalQueuePage mode="director" /></RouteGuard> },
      { path: 'trackers/departments', element: <RouteGuard roles={['performance_team']}><TrackersPage /></RouteGuard> },
      { path: 'reports', element: <RouteGuard roles={['admin', 'performance_team', 'department_director', 'executive_director', 'director_general']}><ReportsPage /></RouteGuard> },
      { path: 'activity', element: <RouteGuard roles={['admin', 'performance_team']}><ActivityLogPage /></RouteGuard> },
      { path: 'notifications', element: <Navigate to="/dashboard" replace /> },
      { path: 'change-requests', element: <RouteGuard roles={['focal_point', 'performance_team']}><ChangeRequestsPage /></RouteGuard> },
      { path: 'admin/templates', element: <RouteGuard roles={['admin']}><AdminTemplatesPage /></RouteGuard> },
      { path: 'admin/kpi-definitions', element: <RouteGuard roles={['admin']}><AdminKpiDefinitionsPage /></RouteGuard> },
      { path: 'admin/cycles', element: <RouteGuard roles={['admin']}><AdminCyclesPage /></RouteGuard> },
      { path: 'admin/users', element: <RouteGuard roles={['admin']}><AdminUsersPage /></RouteGuard> },
      { path: 'admin/hierarchy', element: <RouteGuard roles={['admin']}><AdminHierarchyPage /></RouteGuard> },
    ],
  },
])
