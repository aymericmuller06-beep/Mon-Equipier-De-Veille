import { useState } from 'react'

const WIDTH = 420
const HEIGHT = 160
const PAD = { top: 12, right: 8, bottom: 22, left: 28 }
const BAR_MAX = 24

function niceMax(value) {
  if (value <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Histogramme : articles collectés par jour
export default function DailyColumns({ data }) {
  const [hovered, setHovered] = useState(null)
  const max = niceMax(Math.max(...data.map((d) => d.count), 0))
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const band = plotW / data.length
  const barW = Math.min(BAR_MAX, band * 0.65)
  const y = (value) => PAD.top + plotH - (value / max) * plotH
  const ticks = [0, max / 2, max]

  const columnPath = (x, value) => {
    const top = y(value)
    const h = PAD.top + plotH - top
    if (h <= 0) return ''
    const r = Math.min(4, h, barW / 2)
    // Bout arrondi côté donnée, carré côté axe
    return `M${x},${PAD.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + plotH} Z`
  }

  const hoveredPoint = hovered !== null ? data[hovered] : null

  return (
    <div className="columns-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Articles collectés par jour">
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="viz-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="viz-axis" x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{tick}</text>
          </g>
        ))}
        {data.map((point, index) => {
          const x = PAD.left + index * band + (band - barW) / 2
          const showLabel = index === 0 || index === data.length - 1 || index === Math.floor(data.length / 2)
          return (
            <g key={point.date}>
              <path className={`viz-column ${hovered !== null && hovered !== index ? 'is-dimmed' : ''}`} d={columnPath(x, point.count)} />
              {showLabel && (
                <text className="viz-axis" x={x + barW / 2} y={HEIGHT - 6} textAnchor="middle">{dayLabel(point.date)}</text>
              )}
              {/* Zone de survol plus large que la barre */}
              <rect
                className="viz-hit"
                x={PAD.left + index * band}
                y={PAD.top}
                width={band}
                height={plotH}
                tabIndex={0}
                aria-label={`${dayLabel(point.date)} : ${point.count} article(s)`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
              />
            </g>
          )
        })}
      </svg>
      {hoveredPoint && (
        <div
          className="viz-tooltip"
          style={{ left: `${((PAD.left + hovered * band + band / 2) / WIDTH) * 100}%` }}
          role="status"
        >
          <strong>{hoveredPoint.count}</strong> article(s)
          <span>{dayLabel(hoveredPoint.date)}</span>
        </div>
      )}
    </div>
  )
}
