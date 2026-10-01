import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, X } from 'lucide-react'
import { useTheme } from '../Context/useTheme'
import avatarPlaceholder from '../assets/Avatar-placeholder.jpeg'

export default function AccountMenu() {
  const { isDark, toggleDarkMode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

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
    <div className="account-menu" ref={panelRef}>
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
        <span>Votre compte</span>
      </button>
    </div>
  )
}
