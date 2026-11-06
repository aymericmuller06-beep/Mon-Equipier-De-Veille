// Jauge en demi-cercle : part des articles triés (validés + refusés), le reste « à traiter » est en gris
const RADIUS = 80
const STROKE = 28
const ARC = `M${100 - RADIUS},100 A${RADIUS},${RADIUS} 0 0 1 ${100 + RADIUS},100`

const SERIES = [
  { key: 'validated', label: 'Validés' },
  { key: 'trash', label: 'Refusés' },
  { key: 'new', label: 'À traiter' },
]

export default function SortGauge({ byStatus }) {
  const validated = byStatus.validated || 0
  const trash = byStatus.trash || 0
  const total = validated + trash + (byStatus.new || 0)
  const share = (value) => (total ? (value / total) * 100 : 0)
  const sortedPercent = Math.round(share(validated + trash))

  // Arcs superposés depuis la gauche (pathLength = 100) : refusés jusqu'à validés + refusés, validés par-dessus
  const arcs = [
    { key: 'trash', length: share(validated + trash), visible: trash > 0 },
    { key: 'validated', length: share(validated), visible: validated > 0 },
  ]

  return (
    <div className="gauge">
      <div className="gauge-figure">
        <svg viewBox="0 0 200 116" role="img" aria-label={`${sortedPercent} % des ${total} articles triés : ${validated} validés, ${trash} refusés`}>
          <path d={ARC} className="gauge-arc gauge-arc--new" strokeWidth={STROKE} pathLength="100" />
          {arcs.filter((arc) => arc.visible).map((arc) => (
            <path
              key={arc.key}
              d={ARC}
              className={`gauge-arc gauge-arc--${arc.key}`}
              strokeWidth={STROKE}
              pathLength="100"
              strokeDasharray={`${arc.length} 100`}
            />
          ))}
        </svg>
        <div className="gauge-center" aria-hidden="true">
          <span className="gauge-value">{sortedPercent} %</span>
          <span className="gauge-label">articles triés</span>
        </div>
      </div>

      <ul className="gauge-legend">
        {SERIES.map((series) => (
          <li key={series.key}>
            <span className={`gauge-swatch gauge-swatch--${series.key}`} aria-hidden="true" />
            {series.label}
            <strong>{byStatus[series.key] || 0}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
