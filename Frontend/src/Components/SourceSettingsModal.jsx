import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import ToolModal from './ToolModal'
import KeywordFilterFields from './KeywordFilterFields'

// Réglages d'un flux : nom et filtres par mots-clés, éventuellement appliqués aux articles déjà importés
function SourceSettingsModalContent({ source, onClose, onSave }) {
  const [name, setName] = useState(source.name)
  const [include, setInclude] = useState(source.include_keywords || '')
  const [exclude, setExclude] = useState(source.exclude_keywords || '')
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setFormError('')
    try {
      await onSave({
        name: name.trim(),
        include_keywords: include,
        exclude_keywords: exclude,
        apply_to_existing: applyToExisting,
      })
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Réglages du flux" icon={<SlidersHorizontal size={20} aria-hidden="true" />} onClose={onClose}>
      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="source-name">Nom</label>
        <input id="source-name" type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={150} required />

        <KeywordFilterFields
          idPrefix="source"
          include={include}
          exclude={exclude}
          onIncludeChange={setInclude}
          onExcludeChange={setExclude}
        />

        <label className="tool-modal-checkbox">
          <input type="checkbox" checked={applyToExisting} onChange={(event) => setApplyToExisting(event.target.checked)} />
          <span>Envoyer aussi à la corbeille les articles à traiter qui ne passent pas ces filtres (vérifié sur le titre)</span>
        </label>

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function SourceSettingsModal(props) {
  if (!props.source) return null
  return <SourceSettingsModalContent key={props.source.id} {...props} />
}
