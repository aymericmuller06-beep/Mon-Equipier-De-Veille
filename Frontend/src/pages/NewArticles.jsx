import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ArticleStatusModal from '../Components/ArticleStatusModal'
import { useWatch } from '../Context/WatchContext'
import { getArticles, updateArticleStatus } from '../api/articles'

export default function NewArticles() {
  const { currentWatch } = useWatch()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    getArticles({ themeId: currentWatch.id, status: 'new' })
      .then((data) => { if (!cancelled) setArticles(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch])

  const handleDecision = async (status, reason) => {
    await updateArticleStatus(selectedArticle.id, status, reason)
    setArticles((current) => current.filter((article) => article.id !== selectedArticle.id))
    setSelectedArticle(null)
  }

  return (
    <VeilleLayout>
      <h1>Nouveaux articles</h1>
      <p className="dashboard-subtitle">Articles collectés par vos outils, en attente de traitement.</p>

      {loading ? (
        <p className="dashboard-status">Chargement des articles…</p>
      ) : error ? (
        <p className="dashboard-status dashboard-status--error">Impossible de contacter le serveur : {error}</p>
      ) : articles.length > 0 ? (
        <ul className="article-list">
          {articles.map((article) => (
            <li key={article.id} className="article-list-item">
              <div className="article-list-item-content">
                <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                {article.published_at && <span className="article-list-item-date">{article.published_at}</span>}
              </div>
              <button type="button" className="watch-selection-submit" onClick={() => setSelectedArticle(article)}>
                Traiter
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <Inbox aria-hidden="true" />
          <p>Aucun nouvel article.</p>
          <span>Les articles collectés par vos outils apparaîtront ici.</span>
        </div>
      )}

      <ArticleStatusModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
        onSubmit={handleDecision}
      />
    </VeilleLayout>
  )
}
