import { useState } from 'react'
import { STATUS_SERIES } from './series'

const SIZE = 160
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // espace de la couleur du fond entre deux segments

// Camembert (anneau) de la répartition des articles par statut
export default function StatusDonut({ byStatus }) {
  const [hovered, setHovered] = useState(null)
  const total = STATUS_SERIES.reduce((sum, s) => sum + (byStatus[s.key] || 0), 0)
  const activeSeries = STATUS_SERIES.filter((s) => byStatus[s.key] > 0)

  const gap = activeSeries.length > 1 ? GAP : 0
  const segments = activeSeries.map((series, index) => {
    const value = byStatus[series.key]
    const length = (value / total) * CIRCUMFERENCE
    // Position de départ : somme des segments précédents
    const offset = activeSeries.slice(0, index).reduce((sum, s) => sum + (byStatus[s.key] / total) * CIRCUMFERENCE, 0)
    return { ...series, value, dash: Math.max(length - gap, 0.5), offset }
  })

  const focus = hovered ? STATUS_SERIES.find((s) => s.key === hovered) : null
  const percent = (value) => (total ? Math.round((value / total) * 100) : 0)

  return (
    <div className="donut">
      <div className="donut-figure">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Répartition de ${total} articles par statut`}>
          <circle className="donut-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              className={`donut-segment viz-stroke--${segment.key} ${hovered && hovered !== segment.key ? 'is-dimmed' : ''}`}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              strokeWidth={STROKE}
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={-segment.offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              onMouseEnter={() => setHovered(segment.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${segment.label} : ${segment.value} (${percent(segment.value)} %)`}</title>
            </circle>
          ))}
        </svg>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-center-value">{focus ? byStatus[focus.key] : total}</span>
          <span className="donut-center-label">{focus ? focus.label : 'articles'}</span>
        </div>
      </div>

      <ul className="viz-legend">
        {STATUS_SERIES.map((series) => (
          <li key={series.key} onMouseEnter={() => setHovered(series.key)} onMouseLeave={() => setHovered(null)}>
            <span className={`viz-swatch viz-fill--${series.key}`} aria-hidden="true" />
            <span className="viz-legend-label">{series.label}</span>
            <span className="viz-legend-value">{byStatus[series.key] || 0} · {percent(byStatus[series.key] || 0)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
