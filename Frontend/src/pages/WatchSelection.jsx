import { useState } from 'react'
import { ArrowRight, Plus, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatch } from '../Context/WatchContext'

export default function WatchSelection() {
  const { watches, loading, error, selectWatch } = useWatch()
  const [title, setTitle] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const openWatch = async (watch) => {
    try {
      await selectWatch(watch)
      navigate('/veille')
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!title.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await selectWatch(title.trim())
      navigate('/veille')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <section className="watch-selection-page">
      <div className="watch-selection-content">
        <header className="watch-selection-header">
          <div className="watch-selection-icon" aria-hidden="true"><Radio /></div>
          <p className="watch-selection-eyebrow">ÉQUIPIER DE VEILLE</p>
          <h1>Vos espaces de veille</h1>
          <p className="watch-selection-description">
            Ouvrez une veille déjà créée ou démarrez-en une nouvelle.
          </p>
        </header>

        <div className="watch-selection-grid">
          <section className="watch-selection-card" aria-labelledby="created-watches-title">
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
          </section>

          <section className="watch-selection-card watch-create-card" aria-labelledby="create-watch-title">
            <div className="watch-create-icon" aria-hidden="true"><Plus /></div>
            <h2 id="create-watch-title">Créer une veille</h2>
            <p>Donnez un nom à votre nouvel espace et commencez à organiser votre suivi.</p>

            {showCreateForm ? (
              <form className="watch-create-form" onSubmit={handleCreate}>
                <label htmlFor="watch-title">Nom de la veille</label>
                <input
                  autoFocus
                  id="watch-title"
                  name="watchTitle"
                  type="text"
                  placeholder="Ex. : Veille technologique"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
                {formError && <p className="watch-selection-error">{formError}</p>}
                <button className="watch-selection-submit" type="submit" disabled={submitting}>
                  {submitting ? 'Création…' : <>Créer et ouvrir <ArrowRight aria-hidden="true" /></>}
                </button>
              </form>
            ) : (
              <button className="watch-selection-submit" type="button" onClick={() => setShowCreateForm(true)}>
                Nouvelle veille <Plus aria-hidden="true" />
              </button>
            )}
          </section>
        </div>

        <p className="watch-selection-note">Les veilles sont enregistrées sur le serveur backend.</p>
      </div>
    </section>
  )
}