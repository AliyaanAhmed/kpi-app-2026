import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, ChangeRequest, Cycle, Kpi, KpiSubmission, KpiTemplate, Role, User } from '../domain/types'
import { seedData } from '../mockData/seed'

interface AppStore {
  data: AppData
  activeUserId: string
  activeCycleId: string
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  setTheme(theme: 'dark' | 'light'): void
  setActiveUser(id: string): void
  setActiveCycle(id: string): void
  setSidebarCollapsed(collapsed: boolean): void
  upsertKpi(kpi: Kpi): void
  upsertTemplate(template: KpiTemplate): void
  upsertCycle(cycle: Cycle): void
  upsertUser(user: User): void
  upsertSubmission(submission: KpiSubmission): void
  upsertChangeRequest(changeRequest: ChangeRequest): void
  setData(data: AppData): void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      data: seedData,
      activeUserId: 'u-admin',
      activeCycleId: 'cycle-q2-2026',
      theme: 'dark',
      sidebarCollapsed: false,
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem('kpi-theme', theme)
        set({ theme })
      },
      setActiveUser: (activeUserId) => set({ activeUserId }),
      setActiveCycle: (activeCycleId) => set({ activeCycleId }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      upsertKpi: (kpi) =>
        set((state) => ({
          data: {
            ...state.data,
            kpis: state.data.kpis.some((item) => item.id === kpi.id)
              ? state.data.kpis.map((item) => (item.id === kpi.id ? kpi : item))
              : [...state.data.kpis, kpi],
          },
        })),
      upsertTemplate: (template) =>
        set((state) => ({
          data: {
            ...state.data,
            templates: state.data.templates.some((item) => item.id === template.id)
              ? state.data.templates.map((item) => (item.id === template.id ? template : item))
              : [...state.data.templates, template],
          },
        })),
      upsertCycle: (cycle) =>
        set((state) => ({
          data: {
            ...state.data,
            cycles: state.data.cycles.some((item) => item.id === cycle.id)
              ? state.data.cycles.map((item) => (item.id === cycle.id ? cycle : item))
              : [...state.data.cycles, cycle],
          },
        })),
      upsertUser: (user) =>
        set((state) => ({
          data: {
            ...state.data,
            users: state.data.users.some((item) => item.id === user.id)
              ? state.data.users.map((item) => (item.id === user.id ? user : item))
              : [...state.data.users, user],
          },
        })),
      upsertSubmission: (submission) =>
        set((state) => ({
          data: {
            ...state.data,
            submissions: state.data.submissions.some((item) => item.id === submission.id)
              ? state.data.submissions.map((item) => (item.id === submission.id ? submission : item))
              : [...state.data.submissions, submission],
          },
        })),
      upsertChangeRequest: (changeRequest) =>
        set((state) => ({
          data: {
            ...state.data,
            changeRequests: state.data.changeRequests.some((item) => item.id === changeRequest.id)
              ? state.data.changeRequests.map((item) => (item.id === changeRequest.id ? changeRequest : item))
              : [...state.data.changeRequests, changeRequest],
          },
        })),
      setData: (data) => set({ data }),
    }),
    {
      name: 'kpi-app-state',
      version: 3,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AppStore> | undefined
        return {
          data: seedData,
          activeUserId: persisted?.activeUserId ?? 'u-admin',
          activeCycleId: persisted?.activeCycleId ?? 'cycle-q2-2026',
          theme: persisted?.theme ?? 'dark',
          sidebarCollapsed: persisted?.sidebarCollapsed ?? false,
        }
      },
      partialize: (state) => ({
        data: state.data,
        activeUserId: state.activeUserId,
        activeCycleId: state.activeCycleId,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
)

export function roleLabel(role: Role) {
  return role
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}
