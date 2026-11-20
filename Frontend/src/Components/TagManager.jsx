import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmModal from './ConfirmModal'
import { useWatch } from '../Context/useWatch'
import { deleteTag, getTags, mergeTag, renameTag } from '../api/tags'

// Où retrouver les articles d'un tag, selon leur statut
const STATUS_LINKS = [
  { status: 'new', path: '/veille/nouveaux-articles', label: (n) => `${n} à traiter` },
  { status: 'validated', path: '/veille/articles-valides', label: (n) => `${n} validé${n > 1 ? 's' : ''}` },
  { status: 'trash', path: '/veille/corbeille', label: (n) => `${n} en corbeille` },
]

const inWatch = (tag) => tag.new + tag.validated + tag.trash
const sameName = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

// Gestion des tags (communs à toutes les veilles) : renommer, fusionner, supprimer, ouvrir leurs articles.
// Utilisée par la page « Tags » et par la fenêtre ouverte depuis une liste d'articles.
// `onChanged` : appelé après une modification. `onNavigate` : appelé quand on suit un lien vers des articles.
export default function TagManager({ onChanged, onNavigate }) {
  const { currentWatch } = useWatch()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [editError, setEditError] = useState('')
  // Action à confirmer : { type: 'merge', tag, target } ou { type: 'delete', tag }
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false
    getTags(currentWatch.id)
      .then((data) => {
        if (cancelled) return
        setTags(data)
        setError('')
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentWatch, reloadKey])

  const afterChange = () => {
    setReloadKey((key) => key + 1)
    onChanged?.()
  }

  const startEditing = (tag) => {
    setEditingId(tag.id)
    setDraft(tag.name)
    setEditError('')
  }

  const stopEditing = () => {
    setEditingId(null)
    setEditError('')
  }

  const submitRename = async (tag) => {
    const name = draft.trim()
    if (!name || name === tag.name) return stopEditing()
    // Nom déjà pris par un autre tag : on propose de fusionner les deux
    const target = tags.find((other) => other.id !== tag.id && sameName(other.name, name))
    if (target) {
      setConfirm({ type: 'merge', tag, target })
      return
    }
    try {
      await renameTag(tag.id, name)
      stopEditing()
      afterChange()
    } catch (err) {
      setEditError(err.message)
    }
  }

  const handleConfirm = async () => {
    if (confirm.type === 'merge') {
      await mergeTag(confirm.tag.id, confirm.target.id)
      stopEditing()
    } else {
      await deleteTag(confirm.tag.id)
    }
    setConfirm(null)
    afterChange()
  }

  const confirmMessage = () => {
    if (!confirm) return ''
    const { tag, target } = confirm
    if (confirm.type === 'merge') {
      return `Le tag #${target.name} existe déjà. Fusionner #${tag.name} dans #${target.name} ? `
        + (tag.total === 1 ? `Son article recevra #${target.name}, ` : tag.total > 1 ? `Ses ${tag.total} articles recevront #${target.name}, ` : '')
        + `puis #${tag.name} sera supprimé.`
    }
    const others = tag.total - inWatch(tag)
    const where = others > 0 ? `, dont ${others} dans d’autres veilles` : ''
    return tag.total
      ? `Supprimer le tag #${tag.name} ? Il sera retiré de ${plural(tag.total, 'article')}${where}. Les articles eux-mêmes sont conservés.`
      : `Supprimer le tag #${tag.name} ? Il n’est utilisé par aucun article.`
  }

  if (loading) return <p className="dashboard-status">Chargement des tags…</p>
  if (error && tags.length === 0) {
    return <p className="dashboard-status dashboard-status--error">Impossible de charger les tags : {error}</p>
  }
  if (tags.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucun tag pour le moment.</p>
        <span>Ajoutez-en depuis un article avec « + Tag ».</span>
      </div>
    )
  }

  // Les tags les plus utilisés dans cette veille d'abord
  const sorted = [...tags].sort((a, b) => inWatch(b) - inWatch(a) || a.name.localeCompare(b.name, 'fr'))

  return (
    <>
      {error && <p className="watch-selection-error">{error}</p>}
      <ul className="tag-manager">
        {sorted.map((tag) => {
          const count = inWatch(tag)
          return (
            <li key={tag.id} className="tag-manager-row">
              {editingId === tag.id ? (
                <form className="tag-manager-edit" onSubmit={(event) => { event.preventDefault(); submitRename(tag) }}>
                  <span aria-hidden="true">#</span>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Escape') return
                      event.stopPropagation() // n'annule que le renommage, sans fermer la fenêtre
                      stopEditing()
                    }}
                    maxLength={50}
                    aria-label={`Nouveau nom du tag ${tag.name}`}
                  />
                  <button type="submit" className="ticket-button ticket-button--primary">Enregistrer</button>
                  <button type="button" className="ticket-button" onClick={stopEditing}>Annuler</button>
                  {editError && <p className="ticket-error">{editError}</p>}
                </form>
              ) : (
                <>
                  <div className="tag-manager-info">
                    <span className="tag-manager-name">#{tag.name}</span>
                    <span className="tag-manager-usage">
                      {count === 0 ? (
                        'Aucun article dans cette veille'
                      ) : (
                        STATUS_LINKS.filter(({ status }) => tag[status] > 0).map(({ status, path, label }) => (
                          <Link key={status} to={path} state={{ tagId: tag.id }} onClick={() => onNavigate?.()}>
                            {label(tag[status])}
                          </Link>
                        ))
                      )}
                    </span>
                    {tag.other_themes.length > 0 && (
                      <span className="tag-manager-others">Aussi utilisé dans : {tag.other_themes.join(', ')}</span>
                    )}
                  </div>
                  <div className="tag-manager-actions">
                    <button type="button" className="ticket-button" onClick={() => startEditing(tag)}>Renommer</button>
                    <button type="button" className="ticket-button ticket-button--danger" onClick={() => setConfirm({ type: 'delete', tag })}>
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmModal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.type === 'merge' ? 'Fusionner les tags' : 'Supprimer le tag'}
        message={confirmMessage()}
        confirmLabel={confirm?.type === 'merge' ? 'Fusionner' : 'Supprimer'}
        variant={confirm?.type === 'merge' ? 'default' : 'danger'}
      />
    </>
  )
}
