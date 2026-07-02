import type { KpiMetric } from '../domain/kpi'

const trendLabel: Record<KpiMetric['trend'], string> = {
  up: 'Improving',
  down: 'Reduced',
  steady: 'Stable',
}

interface KpiCardProps {
  metric: KpiMetric
}

export function KpiCard({ metric }: KpiCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__header">
        <span>{metric.label}</span>
        <span className={`trend trend-${metric.trend}`}>{trendLabel[metric.trend]}</span>
      </div>
      <strong>{metric.value}</strong>
      <div className="metric-card__footer">
        <span>{metric.detail}</span>
        <b>{metric.delta}</b>
      </div>
    </article>
  )
}
