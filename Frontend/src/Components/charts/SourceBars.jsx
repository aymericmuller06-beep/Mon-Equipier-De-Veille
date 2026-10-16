import { STATUS_SERIES } from './series'
import ToolIcon from '../ToolIcon'

// Barres empilées par source : montre quelles sources ramènent surtout du bruit
export default function SourceBars({ sources }) {
  if (sources.length === 0) return <p className="viz-empty">Aucune source pour le moment.</p>

  return (
    <>
      <ul className="source-bars">
        {sources.map((source) => {
          const total = source.new + source.validated + source.trash
          const decided = source.validated + source.trash
          const relevance = decided ? Math.round((source.validated / decided) * 100) : null
          return (
            <li key={source.id}>
              <div className="source-bars-head">
                <span className="source-bars-name" title={source.name}><ToolIcon type={source.tool_type} size={12} /> {source.name}</span>
                <span className="source-bars-value">
                  {relevance === null ? `${total} article(s)` : `${relevance} % pertinents`}
                </span>
              </div>
              <div className="source-bars-track" role="img" aria-label={`${source.name} : ${source.validated} validés, ${source.new} à traiter, ${source.trash} refusés`}>
                {total === 0 ? (
                  <span className="source-bars-empty" />
                ) : (
                  STATUS_SERIES.filter((s) => source[s.key] > 0).map((series) => (
                    <span
                      key={series.key}
                      className={`source-bars-segment viz-fill--${series.key}`}
                      style={{ flexGrow: source[series.key] }}
                      title={`${series.label} : ${source[series.key]}`}
                    />
                  ))
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <ul className="viz-legend viz-legend--inline">
        {STATUS_SERIES.map((series) => (
          <li key={series.key}>
            <span className={`viz-swatch viz-fill--${series.key}`} aria-hidden="true" />
            <span className="viz-legend-label">{series.label}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
