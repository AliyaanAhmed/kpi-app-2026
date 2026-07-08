import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, ChangeRequest, Cycle, Kpi, KpiSubmission, KpiTemplate, Role, User } from '../domain/types'
import { seedData } from '../mockData/seed'

const demoFocalPointNames: Record<string, string> = {
  'u-fp-data': 'Ghaith - Focal Point 1',
  'u-fp-cloud': 'Ihab - Focal Point 2',
  'u-fp-shared': 'Ali Solomoni - Focal Point 3',
  'u-fp-demo': 'Noura Al Mansoori - Focal Point 4',
}

const demoUserNames: Record<string, Partial<User>> = {
  'u-pa-1': { name: 'Hussain Mohammed', email: 'hussain.mohammed@govdigital.local' },
}

function normalizeDemoData(data: AppData): AppData {
  return {
    ...data,
    users: data.users.map((user) => ({
      ...user,
      ...demoUserNames[user.id],
      ...(demoFocalPointNames[user.id] ? { name: demoFocalPointNames[user.id] } : {}),
    })),
  }
}

function mergeById<T extends { id: string }>(current: T[], seeded: T[]) {
  const currentIds = new Set(current.map((item) => item.id))
  return [...current, ...seeded.filter((item) => !currentIds.has(item.id))]
}

const demoFocalPointId = 'u-fp-demo'
const demoFocalPointKpiIds = new Set(['kpi-037', 'kpi-038', 'kpi-039', 'kpi-040'])

function resetDemoFocalPointSubmissions(submissions: KpiSubmission[]) {
  const seedDemoSubmissions = seedData.submissions.filter((submission) => submission.focalPointId === demoFocalPointId)
  return [
    ...submissions.filter((submission) => submission.focalPointId !== demoFocalPointId && !demoFocalPointKpiIds.has(submission.kpiId)),
    ...seedDemoSubmissions,
  ]
}

function mergeSeedSubmissions(submissions: KpiSubmission[]) {
  const seededIds = new Set(seedData.submissions.map((submission) => submission.id))
  return [
    ...submissions.filter((submission) => !seededIds.has(submission.id)),
    ...seedData.submissions,
  ]
}

function mergeSeedData(data: AppData): AppData {
  const normalized = normalizeDemoData(data)
  const teams = mergeById(normalized.teams, seedData.teams).map((team) => {
    const seeded = seedData.teams.find((item) => item.id === team.id)
    if (!seeded) return team
    return {
      ...team,
      focalPointIds: Array.from(new Set([...team.focalPointIds, ...seeded.focalPointIds])),
    }
  })
  const templates = mergeById(normalized.templates, seedData.templates).map((template) => {
    const seeded = seedData.templates.find((item) => item.id === template.id)
    if (!seeded) return template
    return {
      ...template,
      kpiIds: Array.from(new Set([...template.kpiIds, ...seeded.kpiIds])),
    }
  })

  return {
    ...normalized,
    sectors: mergeById(normalized.sectors, seedData.sectors),
    departments: mergeById(normalized.departments, seedData.departments),
    teams,
    users: mergeById(normalized.users, seedData.users),
    kpis: mergeById(normalized.kpis, seedData.kpis),
    templates,
    cycles: mergeById(normalized.cycles, seedData.cycles),
    submissions: resetDemoFocalPointSubmissions(mergeSeedSubmissions(normalized.submissions)),
    changeRequests: mergeById(normalized.changeRequests, seedData.changeRequests),
  }
}

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
      version: 14,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AppStore> | undefined
        const persistedData = persisted?.data ? mergeSeedData(persisted.data) : seedData
        const activeUserId = seedData.users.some((user) => user.id === persisted?.activeUserId) ? persisted?.activeUserId : 'u-admin'
        const activeCycleId = seedData.cycles.some((cycle) => cycle.id === persisted?.activeCycleId) ? persisted?.activeCycleId : 'cycle-q2-2026'
        return {
          data: persistedData,
          activeUserId,
          activeCycleId,
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
