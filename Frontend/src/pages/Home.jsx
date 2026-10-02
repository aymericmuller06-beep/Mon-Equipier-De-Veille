import { useEffect, useMemo, useState } from 'react'
import { Rss, Inbox, CheckCircle2, Trash2, Newspaper } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import { useWatch } from '../Context/WatchContext'
import { getSources } from '../api/sources'
import { getArticles } from '../api/articles'

export default function Home() {
  const { watchTitle, currentWatch } = useWatch()
  const [sources, setSources] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    Promise.all([
      getSources(currentWatch.id),
      getArticles({ themeId: currentWatch.id }),
    ])
      .then(([sourcesData, articlesData]) => {
        if (cancelled) return
        setSources(sourcesData)
        setArticles(articlesData)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch])

  const stats = useMemo(() => ({
    sources: sources.length,
    new: articles.filter((article) => article.status === 'new').length,
    validated: articles.filter((article) => article.status === 'validated').length,
    trash: articles.filter((article) => article.status === 'trash').length,
  }), [sources, articles])

  const recentArticles = articles.slice(0, 5)

  return (
    <VeilleLayout>
      <h1>{watchTitle || 'Votre espace de veille'}</h1>
      <p className="dashboard-subtitle">Vue d’ensemble de votre veille.</p>

      {loading ? (
        <p className="dashboard-status">Chargement du tableau de bord…</p>
      ) : error ? (
        <p className="dashboard-status dashboard-status--error">Impossible de contacter le serveur : {error}</p>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <Rss aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.sources}</span>
              <span className="dashboard-stat-label">Sources</span>
            </div>
            <div className="dashboard-stat-card">
              <Inbox aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.new}</span>
              <span className="dashboard-stat-label">Nouveaux articles</span>
            </div>
            <div className="dashboard-stat-card">
              <CheckCircle2 aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.validated}</span>
              <span className="dashboard-stat-label">Articles validés</span>
            </div>
            <div className="dashboard-stat-card">
              <Trash2 aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.trash}</span>
              <span className="dashboard-stat-label">Corbeille</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-section" aria-labelledby="dashboard-sources-title">
              <h2 id="dashboard-sources-title">Sources</h2>
              {sources.length > 0 ? (
                <ul className="dashboard-source-list">
                  {sources.map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <Rss aria-hidden="true" />
                  <p>Aucune source pour le moment.</p>
                  <span>Ajoutez un outil pour commencer à collecter des articles.</span>
                </div>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="dashboard-recent-title">
              <h2 id="dashboard-recent-title">Derniers articles ajoutés</h2>
              {recentArticles.length > 0 ? (
                <ul className="dashboard-article-list">
                  {recentArticles.map((article) => (
                    <li key={article.id}>
                      <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                      <span className={`dashboard-article-status dashboard-article-status--${article.status}`}>
                        {article.status === 'new' ? 'Nouveau' : article.status === 'validated' ? 'Validé' : 'Corbeille'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <Newspaper aria-hidden="true" />
                  <p>Aucun article pour le moment.</p>
                  <span>Les articles collectés par vos outils apparaîtront ici.</span>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </VeilleLayout>
  )
}
