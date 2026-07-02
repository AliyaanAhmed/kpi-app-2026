export type KpiTrend = 'up' | 'down' | 'steady'

export interface KpiMetric {
  id: string
  label: string
  value: string
  detail: string
  trend: KpiTrend
  delta: string
}

export interface WorkstreamStatus {
  id: string
  name: string
  owner: string
  progress: number
  status: 'On Track' | 'Watch' | 'At Risk'
  nextMilestone: string
}

export interface KpiDashboard {
  reportingPeriod: string
  lastUpdated: string
  summary: string
  metrics: KpiMetric[]
  workstreams: WorkstreamStatus[]
}
