import { ChevronRight } from 'lucide-react'

// Carte d'un outil (page « Ajouter un outil ») : disque aux couleurs du logo en fond, flouté par un panneau de verre
// qui porte le titre, une mini description et l'action ; le logo net et la flèche sont dans la colonne de droite. `colors` = couleurs du logo (la première est la principale) ;
// sans couleurs, la carte prend la couleur du site (vert).
export default function ToolCard({ icon, title, description, action, colors, onClick, disabled = false, soon = false }) {
  const Tag = soon ? 'div' : 'button'
  const colorStyle = colors?.length
    ? { '--tool-color': colors[0], '--tool-gradient': `conic-gradient(${[...colors, colors[0]].join(', ')})` }
    : undefined
  const interactiveProps = soon
    ? { 'aria-disabled': 'true' }
    : { type: 'button', onClick, disabled }

  return (
    <Tag className={`tool-card ${soon ? 'tool-card--soon' : ''}`} style={colorStyle} {...interactiveProps}>
      <span className="tool-card-frame" aria-hidden="true"><span className="tool-card-shape" /></span>

      {/* Le flou du panneau est une 2e copie du disque, floutée une seule fois et découpée à la forme du panneau :
          aucun backdrop-filter recalculé à chaque image, la rotation reste gérée par la carte graphique */}
      <span className="tool-card-orb" aria-hidden="true" />
      <span className="tool-card-glass" aria-hidden="true"><span className="tool-card-orb tool-card-orb--blurred" /></span>

      <span className="tool-card-overlay">
        <span className="tool-card-panel">
          <span className="tool-card-title">{title}</span>
          <span className="tool-card-description">{description}</span>
          {action && <span className="tool-card-action">{action}</span>}
        </span>
        <span className="tool-card-side" aria-hidden="true">
          <span className="tool-card-logo">{icon}</span>
          {!soon && <span className="tool-card-arrow"><ChevronRight /></span>}
        </span>
      </span>
    </Tag>
  )
}
