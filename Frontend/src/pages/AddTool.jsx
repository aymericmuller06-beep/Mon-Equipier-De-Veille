import { useState } from 'react'
import { Bell, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import GoogleAlertModal from '../Components/GoogleAlertModal'
import { useWatch } from '../Context/WatchContext'
import { createSource, syncSource } from '../api/sources'

export default function AddTool() {
  const { currentWatch } = useWatch()
  const [isGoogleAlertOpen, setGoogleAlertOpen] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const handleCreateGoogleAlert = async (name, url) => {
    const created = await createSource(name, url, currentWatch.id, 'google_alerts')
    const result = await syncSource(created.id)
    setSyncMessage(`${result.inserted} nouvel(s) article(s) importé(s) depuis « ${created.name} » (${result.fetched} trouvés dans le flux).`)
    setGoogleAlertOpen(false)
  }

  return (
    <VeilleLayout>
      <h1>Ajouter un outil</h1>
      <p className="dashboard-subtitle">
        Connectez un outil de veille à {currentWatch ? <>la veille « {currentWatch.name} »</> : 'votre veille'}.
      </p>

      <div className="tool-card-grid">
        <button
          type="button"
          className="tool-card"
          onClick={() => setGoogleAlertOpen(true)}
          disabled={!currentWatch}
        >
          <Bell aria-hidden="true" className="tool-card-icon" />
          <span className="tool-card-title">Google Alerts</span>
          <span className="tool-card-description">Suivez les alertes Google via leur flux RSS.</span>
        </button>

        <div className="tool-card tool-card--soon" aria-disabled="true">
          <Sparkles aria-hidden="true" className="tool-card-icon" />
          <span className="tool-card-title">D'autres outils arrivent</span>
          <span className="tool-card-description">Réseaux sociaux, newsletters… à venir.</span>
        </div>
      </div>

      {syncMessage && (
        <p className="add-tool-sync-message">
          {syncMessage} Retrouvez vos alertes dans <Link to="/veille/outils/google-alerts">Outils → Google Alerts</Link>.
        </p>
      )}

      <GoogleAlertModal
        isOpen={isGoogleAlertOpen}
        onClose={() => setGoogleAlertOpen(false)}
        onCreate={handleCreateGoogleAlert}
      />
    </VeilleLayout>
  )
}

