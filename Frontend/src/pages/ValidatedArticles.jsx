import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ConfirmModal from '../Components/ConfirmModal'
import { useWatch } from '../Context/WatchContext'
import { getArticles, updateArticleStatus } from '../api/articles'

export default function ValidatedArticles() {
  const { currentWatch } = useWatch()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    getArticles({ themeId: currentWatch.id, status: 'validated' })
      .then((data) => { if (!cancelled) setArticles(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch])

  const handleMoveToTrash = async () => {
    await updateArticleStatus(selectedArticle.id, 'trash', '')
    setArticles((current) => current.filter((article) => article.id !== selectedArticle.id))
    setSelectedArticle(null)
  }

  return (
    <VeilleLayout>
      <h1>Articles validés</h1>
      <p className="dashboard-subtitle">Articles retenus pour votre veille.</p>

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
              <button type="button" className="watch-modal-cancel" onClick={() => setSelectedArticle(article)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <CheckCircle2 aria-hidden="true" />
          <p>Aucun article validé.</p>
          <span>Validez des articles depuis « Nouveaux articles » pour les retrouver ici.</span>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        onConfirm={handleMoveToTrash}
        title="Retirer l’article"
        message={selectedArticle ? `Envoyer « ${selectedArticle.title} » à la corbeille ?` : ''}
        confirmLabel="Envoyer à la corbeille"
        variant="danger"
      />
    </VeilleLayout>
  )
}
