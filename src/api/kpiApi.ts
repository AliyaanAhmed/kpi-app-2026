import type { KpiDashboard } from '../domain/kpi'

export interface KpiApi {
  getDashboard(): Promise<KpiDashboard>
}
