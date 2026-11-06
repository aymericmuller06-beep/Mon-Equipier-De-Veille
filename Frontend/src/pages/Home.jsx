import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Plus, X } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import DecisionModal from '../Components/DecisionModal'
import ToolIcon from '../Components/ToolIcon'
import SortGauge from '../Components/charts/SortGauge'
import DailyColumns from '../Components/charts/DailyColumns'
import { useWatch } from '../Context/useWatch'
import { getStats } from '../api/stats'
import { getArticles, updateArticle } from '../api/articles'
import { formatRelative } from '../utils/format'

// Tuile chiffrée : toute la tuile mène à la page détaillée (flèche ronde comme indice visuel).
// `tone` = couleur d'accent de la tuile, reprise de la palette des outils (le vert reste la couleur principale)
function Kpi({ label, value, hint, to, tone, highlight = false }) {
  return (
    <Link to={to} className={`kpi dash-tone--${tone} ${highlight ? 'kpi--highlight' : ''}`}>
      <span className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-arrow" aria-hidden="true"><ArrowUpRight /></span>
      </span>
      <span className="kpi-value">{value}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
    </Link>
  )
}

// Logo de l'outil d'un article, dans une pastille ronde (comme un avatar)
function SourceAvatar({ toolType }) {
  return <span className="dash-avatar" aria-hidden="true"><ToolIcon type={toolType} size={18} /></span>
}

export default function Home() {
  const { currentWatch } = useWatch()
  const [stats, setStats] = useState(null)
  const [toProcess, setToProcess] = useState([])
  const [lastValidated, setLastValidated] = useState([])
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pending, setPending] = useState(null)

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

  // Tri depuis le dashboard : même fenêtre de note que sur les pages d'articles
  const confirmDecision = async (note) => {
    const { article, decision } = pending
    await updateArticle(article.id, { status: decision, status_reason: note })
    setPending(null)
    setReloadKey((key) => key + 1)
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
  const collectedToday = stats.by_day.at(-1)?.count ?? 0
  const sourceCount = stats.by_source.filter((source) => source.tool_type !== 'manual').length

  return (
    <VeilleLayout>
      <div className="dash">
        <header className="dash-header">
          <div>
            <h1>Tableau de bord</h1>
            <p>Veille « {currentWatch.name} » : triez les nouveaux articles, gardez l’essentiel.</p>
          </div>
          <div className="dash-header-actions">
            <Link className="dash-button dash-button--primary" to="/veille/ajouter-un-outil"><Plus aria-hidden="true" /> Ajouter un outil</Link>
            <Link className="dash-button" to="/veille/nouveaux-articles">Trier les articles</Link>
          </div>
        </header>

        <div className="dash-kpis">
          <Kpi label="À traiter" value={byStatus.new} hint={`${collectedToday} collecté(s) aujourd’hui`} to="/veille/nouveaux-articles" tone="green" highlight />
          <Kpi label="Collectés" value={stats.collected_7d} hint="sur les 7 derniers jours" to="/veille/nouveaux-articles" tone="blue" />
          <Kpi label="Triés" value={stats.processed_7d} hint="validés ou refusés en 7 jours" to="/veille/articles-valides" tone="yellow" />
          <Kpi label="Sources" value={sourceCount} hint="synchronisées chaque heure" to="/veille/ajouter-un-outil" tone="orange" />
        </div>

        <section className="dash-card dash-card--days dash-tone--blue" aria-labelledby="dash-days-title">
          <h2 id="dash-days-title">Articles collectés · 14 derniers jours</h2>
          <DailyColumns data={stats.by_day} />
        </section>

        <section className="dash-card dash-card--gauge dash-tone--green" aria-labelledby="dash-gauge-title">
          <h2 id="dash-gauge-title">Avancement du tri</h2>
          <SortGauge byStatus={byStatus} />
        </section>

        <section className="dash-card dash-card--todo dash-tone--yellow" aria-labelledby="dash-todo-title">
          <div className="dash-card-head">
            <h2 id="dash-todo-title">À traiter maintenant</h2>
            <Link className="dash-button dash-button--small" to="/veille/nouveaux-articles">Tout voir ({byStatus.new}) <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          {toProcess.length > 0 ? (
            <ul className="dash-todo">
              {toProcess.map((article) => (
                <li key={article.id}>
                  <SourceAvatar toolType={article.tool_type} />
                  <div className="dash-todo-text">
                    <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                    <span>{article.source_name} · {formatRelative(article.published_at || article.created_at)}</span>
                  </div>
                  <button type="button" className="dash-button dash-button--small" onClick={() => setPending({ article, decision: 'trash' })} aria-label={`Refuser « ${article.title} »`}>
                    <X aria-hidden="true" /> Refuser
                  </button>
                  <button type="button" className="dash-button dash-button--small dash-button--primary" onClick={() => setPending({ article, decision: 'validated' })} aria-label={`Valider « ${article.title} »`}>
                    <Check aria-hidden="true" /> Valider
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Tout est trié.</p>
          )}
        </section>

        <section className="dash-card dash-card--side dash-tone--orange" aria-labelledby="dash-validated-title">
          <div className="dash-card-head">
            <h2 id="dash-validated-title">Dernières validations</h2>
            <Link className="dash-button dash-button--small" to="/veille/articles-valides">Tout voir <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          {lastValidated.length > 0 ? (
            <ul className="dash-validated">
              {lastValidated.map((article) => (
                <li key={article.id}>
                  <SourceAvatar toolType={article.tool_type} />
                  <div>
                    <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                    <span>{article.status_reason ? `« ${article.status_reason} »` : `Validé ${formatRelative(article.status_changed_at || article.created_at)}`}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Aucun article validé pour l’instant.</p>
          )}

          <h2 className="dash-card-subtitle">Tags les plus utilisés</h2>
          {stats.top_tags.length > 0 ? (
            <ul className="dash-tags">
              {stats.top_tags.map((tag) => (
                <li key={tag.id}>#{tag.name}<span>{tag.count}</span></li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty">Ajoutez des tags sur vos articles pour les classer.</p>
          )}
        </section>
      </div>

      <DecisionModal
        article={pending?.article}
        decision={pending?.decision}
        onClose={() => setPending(null)}
        onConfirm={confirmDecision}
      />
    </VeilleLayout>
  )
}
