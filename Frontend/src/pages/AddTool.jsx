import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import ManualArticleModal from '../Components/ManualArticleModal'
import ToolIcon from '../Components/ToolIcon'
import { useWatch } from '../Context/useWatch'
import { addManualArticle } from '../api/articles'
import { createSourceAndSync } from '../api/sources'
import { TOOLS, toolPath } from '../utils/tools'

export default function AddTool() {
  const { currentWatch } = useWatch()
  const navigate = useNavigate()
  const [openTool, setOpenTool] = useState(null)
  const [isManualOpen, setManualOpen] = useState(false)

  const handleCreate = async (name, url) => {
    const { syncResult, syncError } = await createSourceAndSync(name, url, currentWatch.id, openTool.type)
    navigate(toolPath(openTool), { state: { syncResult, syncError } })
  }

  const handleManualCreate = async (article) => {
    const created = await addManualArticle(currentWatch.id, article)
    navigate(created.status === 'validated' ? '/veille/articles-valides' : '/veille/nouveaux-articles')
  }

  const Modal = openTool?.Modal

  return (
    <VeilleLayout>
      <h1>Ajouter un outil</h1>
      <p className="dashboard-subtitle">
        Connectez un outil de veille à {currentWatch ? <>la veille « {currentWatch.name} »</> : 'votre veille'}.
        Vous pouvez ajouter plusieurs flux par outil.
      </p>

      <div className="tool-card-grid">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            type="button"
            className="tool-card"
            onClick={() => setOpenTool(tool)}
            disabled={!currentWatch}
          >
            <ToolIcon type={tool.type} size={28} className="tool-card-icon" />
            <span className="tool-card-title">{tool.label}</span>
            <span className="tool-card-description">{tool.description}</span>
          </button>
        ))}

        <button type="button" className="tool-card" onClick={() => setManualOpen(true)} disabled={!currentWatch}>
          <ToolIcon type="manual" size={28} className="tool-card-icon" />
          <span className="tool-card-title">Ajout manuel</span>
          <span className="tool-card-description">Ajoutez un article, une vidéo ou une page trouvés par vous-même.</span>
        </button>

        <div className="tool-card tool-card--soon" aria-disabled="true">
          <span className="tool-card-title">D'autres outils arrivent</span>
          <span className="tool-card-description">Réseaux sociaux, newsletters… à venir.</span>
        </div>
      </div>

      {Modal && <Modal isOpen onClose={() => setOpenTool(null)} onCreate={handleCreate} />}
      <ManualArticleModal isOpen={isManualOpen} onClose={() => setManualOpen(false)} onCreate={handleManualCreate} />
    </VeilleLayout>
  )
}
