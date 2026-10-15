import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import StatusDonut from '../Components/charts/StatusDonut'
import DailyColumns from '../Components/charts/DailyColumns'
import SourceBars from '../Components/charts/SourceBars'
import GoogleLogo from '../Components/GoogleLogo'
import { useWatch } from '../Context/useWatch'
import { getStats } from '../api/stats'
import { getArticles, updateArticle } from '../api/articles'
import { formatRelative } from '../utils/format'

function Kpi({ label, value, hint, highlight = false }) {
  return (
    <div className={`kpi ${highlight ? 'kpi--highlight' : ''}`}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  )
}

export default function Home() {
  const { currentWatch } = useWatch()
  const [stats, setStats] = useState(null)
  const [toProcess, setToProcess] = useState([])
  const [lastValidated, setLastValidated] = useState([])
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    Promise.all([
      getStats(currentWatch.id),
      getArticles({ themeId: currentWatch.id, status: 'new', limit: 5 }),
      getArticles({ themeId: currentWatch.id, status: 'validated', limit: 3, sort: 'decision' }),
    ])
      .then(([statsData, newData, validatedData]) => {
        if (cancelled) return
        setStats(statsData)
        setToProcess(newData)
        setLastValidated(validatedData)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })

    return () => { cancelled = true }
  }, [currentWatch, reloadKey])

  // Tri rapide depuis le dashboard ; la note se gère ensuite depuis les pages d'articles
  const quickDecide = async (article, status) => {
    setBusyId(article.id)
    try {
      await updateArticle(article.id, { status })
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (error && !stats) {
    return (
      <VeilleLayout>
        <p className="dashboard-status dashboard-status--error">Impossible de contacter le serveur : {error}</p>
      </VeilleLayout>
    )
  }

  if (!stats) {
    return (
      <VeilleLayout>
        <p className="dashboard-status">Chargement du tableau de bord…</p>
      </VeilleLayout>
    )
  }

  if (stats.by_source.length === 0) {
    return (
      <VeilleLayout>
        <div className="dash-welcome">
          <h2>Votre veille est prête</h2>
          <p>Ajoutez votre premier outil : les articles arriveront ici automatiquement, toutes les heures.</p>
          <Link className="watch-selection-submit" to="/veille/ajouter-un-outil">
            Ajouter un outil
          </Link>
        </div>
      </VeilleLayout>
    )
  }

  const { by_status: byStatus } = stats
  const decided = byStatus.validated + byStatus.trash
  const relevance = decided ? `${Math.round((byStatus.validated / decided) * 100)} %` : '—'

  return (
    <VeilleLayout>
      <div className="dash">
        <div className="dash-kpis">
          <Kpi label="À traiter" value={byStatus.new} highlight />
          <Kpi label="Taux de pertinence" value={relevance} hint="validés / triés" />
          <Kpi label="Collectés (7 j)" value={stats.collected_7d} />
          <Kpi label="Triés (7 j)" value={stats.processed_7d} />
          <Kpi label={<><GoogleLogo size={13} /> Alertes Google</>} value={stats.by_source.length} />
        </div>

        <section className="dash-card dash-card--donut" aria-labelledby="dash-donut-title">
          <h2 id="dash-donut-title">Répartition</h2>
          <StatusDonut byStatus={byStatus} />
        </section>

        <section className="dash-card dash-card--days" aria-labelledby="dash-days-title">
          <h2 id="dash-days-title">Articles collectés · 14 derniers jours</h2>
          <DailyColumns data={stats.by_day} />
        </section>

        <section className="dash-card dash-card--sources" aria-labelledby="dash-sources-title">
          <h2 id="dash-sources-title">Pertinence par alerte</h2>
          <SourceBars sources={stats.by_source} />
        </section>

        <section className="dash-card dash-card--todo" aria-labelledby="dash-todo-title">
          <div className="dash-card-head">
            <h2 id="dash-todo-title">À traiter maintenant</h2>
            <Link to="/veille/nouveaux-articles">Tout voir ({byStatus.new}) →</Link>
          </div>
          {toProcess.length > 0 ? (
            <ul className="dash-todo">
              {toProcess.map((article) => (
                <li key={article.id}>
                  <div className="dash-todo-text">
                    <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                    <span>{article.source_name} · {formatRelative(article.published_at || article.created_at)}</span>
                  </div>
                  <button type="button" className="ticket-button ticket-button--small" onClick={() => quickDecide(article, 'trash')} disabled={busyId === article.id} aria-label={`Refuser « ${article.title} »`}>
                    Refuser
                  </button>
                  <button type="button" className="ticket-button ticket-button--small ticket-button--primary" onClick={() => quickDecide(article, 'validated')} disabled={busyId === article.id} aria-label={`Valider « ${article.title} »`}>
                    Valider
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Tout est trié.</p>
          )}
        </section>

        <section className="dash-card dash-card--side" aria-labelledby="dash-tags-title">
          <h2 id="dash-tags-title">Tags les plus utilisés</h2>
          {stats.top_tags.length > 0 ? (
            <ul className="dash-tags">
              {stats.top_tags.map((tag) => (
                <li key={tag.id}>#{tag.name}<span>{tag.count}</span></li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Ajoutez des tags sur vos articles pour les classer.</p>
          )}

          <h2 className="dash-card-subtitle">Dernières validations</h2>
          {lastValidated.length > 0 ? (
            <ul className="dash-validated">
              {lastValidated.map((article) => (
                <li key={article.id}>
                  <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                  {article.status_reason && <span>« {article.status_reason} »</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Aucun article validé pour l’instant.</p>
          )}
        </section>
      </div>
    </VeilleLayout>
  )
}
