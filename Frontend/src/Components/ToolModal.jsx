import { useEffect } from 'react'
import { X } from 'lucide-react'

// Coque commune des fenêtres d'ajout (fond, en-tête, fermeture par Échap ou clic à l'extérieur)
export default function ToolModal({ title, icon, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="watch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`watch-modal tool-modal ${wide ? 'tool-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="watch-modal-header">
          <h2 id="tool-modal-title" className="tool-modal-title">{icon} {title}</h2>
          <button type="button" className="watch-modal-close" onClick={onClose} aria-label="Fermer la fenêtre">
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Étapes numérotées d'un tutoriel : chaque étape = une action courte + un détail facultatif
export function ToolSteps({ steps }) {
  return (
    <ol className="tool-steps">
      {steps.map(({ action, detail }, index) => (
        <li key={index}>
          <span className="tool-steps-number" aria-hidden="true">{index + 1}</span>
          <div>
            <p className="tool-steps-action">{action}</p>
            {detail && <p className="tool-steps-detail">{detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
