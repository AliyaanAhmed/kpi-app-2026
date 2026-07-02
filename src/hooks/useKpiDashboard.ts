import { useEffect, useState } from 'react'
import type { KpiDashboard } from '../domain/kpi'
import { kpiService } from '../services/kpiService'

type DashboardState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: KpiDashboard }
  | { status: 'error'; data: null }

export function useKpiDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({
    status: 'loading',
    data: null,
  })

  useEffect(() => {
    let isMounted = true

    kpiService
      .getDashboard()
      .then((data) => {
        if (isMounted) {
          setState({ status: 'ready', data })
        }
      })
      .catch(() => {
        if (isMounted) {
          setState({ status: 'error', data: null })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return state
}
