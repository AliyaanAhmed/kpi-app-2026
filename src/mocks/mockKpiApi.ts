import type { KpiApi } from '../api/kpiApi'
import type { KpiDashboard } from '../domain/kpi'

const mockDashboard: KpiDashboard = {
  reportingPeriod: 'FY 2026 planning cycle',
  lastUpdated: 'Local static preview',
  summary:
    'Static KPI view prepared for design review. Dataverse and Power Apps runtime wiring will be added after the interface is approved.',
  metrics: [
    {
      id: 'budget-coverage',
      label: 'Budget coverage',
      value: '82%',
      detail: 'Mapped to strategic priorities',
      trend: 'up',
      delta: '+6%',
    },
    {
      id: 'active-workstreams',
      label: 'Active workstreams',
      value: '14',
      detail: 'Across ICT portfolio',
      trend: 'steady',
      delta: '0',
    },
    {
      id: 'review-items',
      label: 'Review items',
      value: '9',
      detail: 'Awaiting SME validation',
      trend: 'down',
      delta: '-3',
    },
    {
      id: 'alignment-score',
      label: 'Alignment score',
      value: '91%',
      detail: 'Strategy to KPI traceability',
      trend: 'up',
      delta: '+4%',
    },
  ],
  workstreams: [
    {
      id: 'digital-services',
      name: 'Digital Services Enablement',
      owner: 'Strategy Team',
      progress: 78,
      status: 'On Track',
      nextMilestone: 'KPI baseline approval',
    },
    {
      id: 'cloud-modernization',
      name: 'Cloud Modernization',
      owner: 'Infrastructure',
      progress: 64,
      status: 'Watch',
      nextMilestone: 'Cost model review',
    },
    {
      id: 'data-platform',
      name: 'Enterprise Data Platform',
      owner: 'Data Office',
      progress: 52,
      status: 'At Risk',
      nextMilestone: 'Dependency resolution',
    },
  ],
}

export const mockKpiApi: KpiApi = {
  async getDashboard() {
    return mockDashboard
  },
}
