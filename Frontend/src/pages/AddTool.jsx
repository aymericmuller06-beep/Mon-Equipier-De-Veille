import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ManualArticleModal from '../Components/ManualArticleModal'
import ToolIcon from '../Components/ToolIcon'
import ToolCard from '../Components/ToolCard'
import { useWatch } from '../Context/useWatch'
import { addManualArticle } from '../api/articles'
import { createSourceAndSync } from '../api/sources'
import { TOOLS, toolPath } from '../utils/tools'

export default function AddTool() {
  const { currentWatch } = useWatch()
  const navigate = useNavigate()
  const [openTool, setOpenTool] = useState(null)
  const [isManualOpen, setManualOpen] = useState(false)

  const handleCreate = async (name, url, filters) => {
    const { syncResult, syncError } = await createSourceAndSync(name, url, currentWatch.id, openTool.type, filters)
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
          <ToolCard
            key={tool.type}
            icon={<ToolIcon type={tool.type} size={34} />}
            title={tool.label}
            description={tool.description}
            action={tool.addLabel}
            colors={tool.colors}
            onClick={() => setOpenTool(tool)}
            disabled={!currentWatch}
          />
        ))}

        <ToolCard
          icon={<ToolIcon type="manual" size={30} />}
          title="Ajout manuel"
          description="Un article, une vidéo ou une page trouvés par vous-même."
          action="Ajouter un article"
          onClick={() => setManualOpen(true)}
          disabled={!currentWatch}
        />

        <ToolCard
          icon={<Sparkles size={28} className="tool-icon" />}
          title="Bientôt"
          description="Réseaux sociaux, newsletters… d’autres outils arrivent."
          soon
        />
      </div>

      {Modal && <Modal isOpen onClose={() => setOpenTool(null)} onCreate={handleCreate} />}
      <ManualArticleModal isOpen={isManualOpen} onClose={() => setManualOpen(false)} onCreate={handleManualCreate} />
    </VeilleLayout>
  )
}
