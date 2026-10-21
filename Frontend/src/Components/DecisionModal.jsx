import { useState } from 'react'
import ToolModal from './ToolModal'

// Raccourcis de note : un clic ajoute la raison à la note
const NOTE_PRESETS = {
  validated: ['Info clé', 'À partager', 'À approfondir', 'Concurrent', 'Chiffre intéressant'],
  trash: ['Hors sujet', 'Doublon', 'Trop ancien', 'Source peu fiable', 'Homonyme'],
}

const COPY = {
  validated: { title: 'Valider l’article', question: 'Pourquoi le garder ?', confirm: 'Valider' },
  trash: { title: 'Refuser l’article', question: 'Pourquoi l’écarter ?', confirm: 'Refuser' },
  note: { title: 'Modifier la note', question: 'Note', confirm: 'Enregistrer' },
}

// Fenêtre ouverte au moment de valider ou refuser : la note (facultative) garde la raison du choix.
// `decision` : 'validated' | 'trash' | 'note' (simple modification de la note existante)
function DecisionModalContent({ article, decision, onClose, onConfirm }) {
  const [note, setNote] = useState(article.status_reason || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const copy = COPY[decision]
  const presets = NOTE_PRESETS[decision === 'note' ? article.status : decision] || []

  const togglePreset = (preset) => {
    setNote((current) => {
      const parts = current.split(' — ').map((part) => part.trim()).filter(Boolean)
      const next = parts.includes(preset) ? parts.filter((part) => part !== preset) : [...parts, preset]
      return next.join(' — ')
    })
  }

  const submit = async (event) => {
    event?.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await onConfirm(note.trim())
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title={copy.title} onClose={onClose}>
      <p className="decision-article">{article.title}</p>

      {/* Ctrl + Entrée valide depuis n'importe quel élément (zone de texte ou raisons) */}
      <form
        className="watch-modal-form"
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event)
        }}
      >
        <label htmlFor="decision-note">
          {copy.question} {decision !== 'note' && <span className="tool-modal-optional">(facultatif)</span>}
        </label>
        {presets.length > 0 && (
          <div className="ticket-presets">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={note.split(' — ').includes(preset) ? 'is-active' : ''}
                aria-pressed={note.split(' — ').includes(preset)}
                onClick={() => togglePreset(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
        <textarea
          autoFocus
          id="decision-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Écrivez la raison ou choisissez-en une ci-dessus"
          maxLength={2000}
        />

        {error && <p className="watch-selection-error">{error}</p>}

        <div className="watch-modal-actions">
          <span className="ticket-hint">Ctrl + Entrée</span>
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button
            type="submit"
            className={`watch-selection-submit ${decision === 'trash' ? 'watch-selection-submit--danger' : ''}`}
            disabled={submitting}
          >
            {copy.confirm}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function DecisionModal(props) {
  if (!props.article) return null
  return <DecisionModalContent key={`${props.article.id}-${props.decision}`} {...props} />
}
