import { useState } from 'react'
import { ArrowRight, Plus, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatch } from '../Context/WatchContext'
import CreateWatchModal from '../Components/CreateWatchModal'

export default function WatchSelection() {
  const { watches, loading, error, selectWatch, createWatch } = useWatch()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  const openWatch = async (watch) => {
    try {
      await selectWatch(watch)
      navigate('/veille')
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleCreate = async (title, accentColor) => {
    await createWatch(title, accentColor)
    setIsModalOpen(false)
    navigate('/veille')
  }

  return (
    <section className="watch-selection-page">
      <div className="watch-selection-left">
        <p className="watch-selection-eyebrow">MON ÉQUIPIER DE VEILLE</p>
        <h1>Vos espaces de veille</h1>
        <p className="watch-selection-description">
          Ouvrez une veille déjà créée ou démarrez-en une nouvelle.
        </p>

        {actionError && <p className="watch-selection-error">{actionError}</p>}

        <button className="watch-selection-submit" type="button" onClick={() => setIsModalOpen(true)}>
          Nouvelle veille <Plus aria-hidden="true" />
        </button>
      </div>

      <aside className="watch-selection-right" aria-labelledby="created-watches-title">
        <div className="watch-selection-card-heading">
          <div>
            <h2 id="created-watches-title">Veilles créées</h2>
            <p>Retrouvez vos espaces de travail.</p>
          </div>
          <span className="watch-count">{watches.length}</span>
        </div>

        {loading ? (
          <p className="watch-selection-status">Chargement des veilles…</p>
        ) : error ? (
          <p className="watch-selection-status watch-selection-error">Impossible de contacter le serveur : {error}</p>
        ) : watches.length > 0 ? (
          <ul className="watch-list">
            {watches.map((watch) => (
              <li key={watch.id}>
                <button
                  className={`watch-list-item watch-list-item--${watch.accent_color || 'green'}`}
                  type="button"
                  onClick={() => openWatch(watch.name)}
                >
                  <span className={`watch-list-radio watch-list-radio--${watch.accent_color || 'green'}`} aria-hidden="true"><Radio /></span>
                  <span className="watch-list-title">{watch.name}</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="watch-empty-state">
            <Radio aria-hidden="true" />
            <p>Aucune veille pour le moment.</p>
            <span>Créez votre premier espace pour commencer.</span>
          </div>
        )}
      </aside>

      <CreateWatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  )
}