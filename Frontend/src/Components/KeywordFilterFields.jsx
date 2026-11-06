import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'

// Le serveur accepte 500 caractères par liste (mots séparés par des virgules)
const MAX_LIST_LENGTH = 500

const splitKeywords = (value) => value.split(',').map((keyword) => keyword.trim()).filter(Boolean)
const sameKeyword = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0

// Mots-clés en badges : un bouton « Ajouter un mot » ouvre une petite saisie validée par ✓ ou Entrée.
// Quitter la saisie sans valider ajoute quand même le mot : rien ne se perd. `value` reste une chaîne « mot, mot ».
function KeywordChips({ id, value, onChange, variant }) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [tooLong, setTooLong] = useState(false)
  const keywords = splitKeywords(value)

  const addKeywords = (candidates) => {
    const next = [...keywords]
    for (const candidate of candidates.flatMap(splitKeywords)) {
      if (!next.some((keyword) => sameKeyword(keyword, candidate))) next.push(candidate)
    }
    const joined = next.join(', ')
    if (joined.length > MAX_LIST_LENGTH) {
      setTooLong(true)
      return false
    }
    setTooLong(false)
    if (next.length !== keywords.length) onChange(joined)
    return true
  }

  const removeKeyword = (index) => {
    setTooLong(false)
    onChange(keywords.filter((_, position) => position !== index).join(', '))
  }

  const closeEditor = () => {
    setDraft('')
    setEditing(false)
  }

  // keepOpen : après ✓ ou Entrée, la saisie reste ouverte pour enchaîner un autre mot
  const commitDraft = (keepOpen) => {
    if (draft.trim() && !addKeywords([draft])) return
    if (keepOpen && draft.trim()) setDraft('')
    else closeEditor()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      // Entrée valide le mot au lieu d'envoyer le formulaire
      event.preventDefault()
      commitDraft(true)
    } else if (event.key === 'Escape') {
      // Échap annule la saisie sans fermer la fenêtre
      event.stopPropagation()
      closeEditor()
    }
  }

  // Le bouton ✓ prend le focus au clic : on ne valide au blur que si le focus quitte la bulle
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) commitDraft(false)
  }

  return (
    <>
      <div className={`keyword-chips keyword-chips--${variant}`}>
        {keywords.map((keyword, index) => (
          <span key={keyword} className="keyword-chip">
            {keyword}
            <button type="button" onClick={() => removeKeyword(index)} aria-label={`Retirer « ${keyword} »`}>
              <X aria-hidden="true" />
            </button>
          </span>
        ))}

        {editing ? (
          <span className="keyword-chip-form" onBlur={handleBlur}>
            <input
              autoFocus
              id={id}
              type="text"
              placeholder="Un mot ou une expression"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={100}
            />
            <button type="button" onClick={() => commitDraft(true)} aria-label="Valider ce mot" title="Valider">
              <Check aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button id={id} type="button" className="keyword-chip-add" onClick={() => setEditing(true)}>
            <Plus aria-hidden="true" /> {keywords.length ? 'Ajouter un mot' : 'Ajouter des mots'}
          </button>
        )}
      </div>
      {tooLong && <p className="tool-modal-warning">Liste trop longue : retirez des mots avant d’en ajouter d’autres.</p>}
    </>
  )
}

// Champs « doit contenir » / « ne doit pas contenir » d'une source
export default function KeywordFilterFields({ include, exclude, onIncludeChange, onExcludeChange, idPrefix }) {
  return (
    <>
      <label htmlFor={`${idPrefix}-include`}>
        Garder seulement si ça parle de <span className="tool-modal-optional">(facultatif)</span>
      </label>
      <KeywordChips
        id={`${idPrefix}-include`}
        value={include}
        onChange={onIncludeChange}
        variant="include"
      />

      <label htmlFor={`${idPrefix}-exclude`}>
        Écarter si ça parle de <span className="tool-modal-optional">(facultatif)</span>
      </label>
      <KeywordChips
        id={`${idPrefix}-exclude`}
        value={exclude}
        onChange={onExcludeChange}
        variant="exclude"
      />
    </>
  )
}
