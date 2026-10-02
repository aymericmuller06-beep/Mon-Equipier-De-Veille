import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ConfirmModal from '../Components/ConfirmModal'
import { useWatch } from '../Context/WatchContext'
import { getArticles, updateArticleStatus } from '../api/articles'

export default function Trash() {
  const { currentWatch } = useWatch()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    getArticles({ themeId: currentWatch.id, status: 'trash' })
      .then((data) => { if (!cancelled) setArticles(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch])

  const handleRestore = async () => {
    await updateArticleStatus(selectedArticle.id, 'new', '')
    setArticles((current) => current.filter((article) => article.id !== selectedArticle.id))
    setSelectedArticle(null)
  }

  return (
    <VeilleLayout>
      <h1>Corbeille</h1>
      <p className="dashboard-subtitle">Articles refusés.</p>

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
                {article.status_reason && <span className="article-list-item-reason">« {article.status_reason} »</span>}
              </div>
              <button type="button" className="watch-modal-cancel" onClick={() => setSelectedArticle(article)}>
                Restaurer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <Trash2 aria-hidden="true" />
          <p>La corbeille est vide.</p>
          <span>Les articles refusés apparaîtront ici.</span>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        onConfirm={handleRestore}
        title="Restaurer l’article"
        message={selectedArticle ? `Renvoyer « ${selectedArticle.title} » dans les nouveaux articles ?` : ''}
        confirmLabel="Restaurer"
      />
    </VeilleLayout>
  )
}
