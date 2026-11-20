import { Tags } from 'lucide-react'
import ToolModal from './ToolModal'
import TagManager from './TagManager'

// Gestion des tags dans une fenêtre, ouverte depuis une liste d'articles
export default function TagManagerModal({ isOpen, onClose, onChanged }) {
  if (!isOpen) return null
  return (
    <ToolModal title="Gérer les tags" icon={<Tags size={20} aria-hidden="true" />} onClose={onClose} wide>
      <p className="tool-modal-intro">Les tags sont communs à toutes vos veilles : un changement ici s’applique partout.</p>
      <div className="tag-manager-scroll">
        <TagManager onChanged={onChanged} onNavigate={onClose} />
      </div>
    </ToolModal>
  )
}
