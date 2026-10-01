import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Trash2, X } from 'lucide-react'
import { useTheme } from '../Context/useTheme'
import { useWatch } from '../Context/WatchContext'
import ConfirmModal from './ConfirmModal'
import avatarPlaceholder from '../assets/Avatar-placeholder.jpeg'

const RESET_CONFIRM_PHRASE = 'Supprimer la base de donnée.'

export default function AccountMenu({ variant = 'floating', sansTexte = false}) {
  const { isDark, toggleDarkMode } = useTheme()
  const { resetAllData } = useWatch()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const panelRef = useRef(null)

  const handleReset = async () => {
    await resetAllData()
    setIsResetConfirmOpen(false)
    setIsOpen(false)
    navigate('/')
  }

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`account-menu account-menu--${variant}`} ref={panelRef}>
      {isOpen && (
        <div className="account-menu-panel" role="dialog" aria-modal="false" aria-labelledby="account-menu-title">
          <div className="account-menu-header">
            <h2 id="account-menu-title">Compte local</h2>
            <button type="button" className="account-menu-close" onClick={() => setIsOpen(false)} aria-label="Fermer">
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="account-menu-description">
            Aucune connexion requise : vos données et préférences sont stockées dans la base locale de l’application.
          </p>

          <div className="account-menu-section" role="group" aria-label="Thème général du site">
            <span className="account-menu-label">Thème général</span>
            <button
              type="button"
              className={`theme-toggle__btn ${isDark ? 'active' : ''}`}
              onClick={toggleDarkMode}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
              aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
            >
              {isDark ? <Sun /> : <Moon />}
            </button>
          </div>

          <p className="account-menu-note">D’autres paramètres de compte arriveront bientôt.</p>

          {/* Suppression complète de la base locale */}
          <div className="account-menu-danger" role="group" aria-label="Zone de danger">
            <span className="account-menu-label">Zone de danger</span>
            <button
              type="button"
              className="theme-toggle__delete"
              onClick={() => setIsResetConfirmOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Réinitialiser la base de données
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Ouvrir le compte local"
      >
        <img className="account-menu-avatar" src={avatarPlaceholder} alt="" />
        {!sansTexte && <span >Votre compte</span>}
      </button>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="Réinitialiser la base de données"
        message="Toutes les veilles, sources et articles seront supprimés définitivement. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        variant="danger"
        confirmPhrase={RESET_CONFIRM_PHRASE}
      />
    </div>
  )
}
