// Histogramme en pilules : articles collectés par jour. Jour sans article = pilule hachurée ;
// la valeur s'affiche au survol (CSS seul, aucun rendu React).
const MIN_HEIGHT = 16 // % : une petite valeur reste visible
const EMPTY_HEIGHT = 34 // % : hauteur des pilules hachurées

const toDate = (iso) => new Date(`${iso}T00:00:00`)
const dayInitial = (iso) => toDate(iso).toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase()
const dayLabel = (iso) => toDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function DailyColumns({ data }) {
  const max = Math.max(...data.map((point) => point.count), 1)
  const lastIndex = data.length - 1

  return (
    <div className="pill-chart" role="list" aria-label="Articles collectés par jour">
      {data.map((point, index) => {
        const empty = point.count === 0
        const height = empty ? EMPTY_HEIGHT : Math.max((point.count / max) * 100, MIN_HEIGHT)
        const classes = ['pill-chart-bar', empty && 'is-empty', point.count === max && 'is-peak'].filter(Boolean).join(' ')
        return (
          <div key={point.date} className={`pill-chart-col ${index === lastIndex ? 'is-today' : ''}`} role="listitem" tabIndex={0}
            aria-label={`${dayLabel(point.date)} : ${point.count} article(s)`}>
            <div className="pill-chart-track">
              <span className={classes} style={{ height: `${height}%` }}>
                <span className="pill-chart-tip" aria-hidden="true">{point.count}</span>
              </span>
            </div>
            <span className="pill-chart-label" aria-hidden="true" title={dayLabel(point.date)}>{dayInitial(point.date)}</span>
          </div>
        )
      })}
    </div>
  )
}
