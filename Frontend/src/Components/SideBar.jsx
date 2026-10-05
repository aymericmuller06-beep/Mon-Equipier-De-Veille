import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Settings2, LayoutDashboard, Inbox, CheckCircle2, Trash2, PlusCircle, Bell } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useWatch } from '../Context/WatchContext'
import { getSources } from '../api/sources'

// Mémorise par veille la présence d'alertes pour éviter tout délai d'affichage quand la barre est recréée
const googleAlertsCache = new Map()

export default function SideBar() {
  const [activePanel, setActivePanel] = useState('menu')
  const { watchTitle, currentWatch } = useWatch()
  const { pathname } = useLocation()
  const [hasGoogleAlerts, setHasGoogleAlerts] = useState(() => (currentWatch ? googleAlertsCache.get(currentWatch.id) ?? false : false))

  // La catégorie "Outils" ne doit apparaître que si au moins un outil a été ajouté
  useEffect(() => {
    if (!currentWatch) {
      setHasGoogleAlerts(false)
      return
    }
    let cancelled = false
    setHasGoogleAlerts(googleAlertsCache.get(currentWatch.id) ?? false)

    getSources(currentWatch.id, 'google_alerts')
      .then((data) => {
        const has = data.length > 0
        googleAlertsCache.set(currentWatch.id, has)
        if (!cancelled) setHasGoogleAlerts(has)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [currentWatch, pathname])

  const linkClass = (path) => (pathname === path ? 'is-current' : '')

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-watch-heading">
          <Link className="sidebar-home-button" to="/" aria-label="Retour à l’accueil et aux veilles créées" title="Changer de veille">
            <Home aria-hidden="true" />
          </Link>
          <div className="sidebar-watch-copy">
            <span className="sidebar-watch-caption">Veille actuelle</span>
            <h2 className="sidebar-watch-title" title={watchTitle || 'Aucune veille sélectionnée'}>{watchTitle || 'Aucune veille sélectionnée'}</h2>
          </div>
        </div>
        <div className={`sidebar-header-switcher ${activePanel === 'settings' ? 'is-settings' : ''}`} role="group" aria-label="Contenu de la barre latérale">
          <span className="sidebar-switcher-thumb" aria-hidden="true" />
          <button className={activePanel === 'menu' ? 'is-active' : ''} type="button" aria-pressed={activePanel === 'menu'} onClick={() => setActivePanel('menu')}>
            <LayoutGrid aria-hidden="true" />
            <span>Menu</span>
          </button>
          <button className={activePanel === 'settings' ? 'is-active' : ''} type="button" aria-pressed={activePanel === 'settings'} onClick={() => setActivePanel('settings')}>
            <Settings2 aria-hidden="true" />
            <span>Paramètres</span>
          </button>
        </div>
      </div>

      {activePanel === 'menu' ? (
        <nav className="sidebar-nav" aria-label="Menu de veille">
          <ul>
            <li>
              <Link className={linkClass('/veille')} to="/veille" aria-current={pathname === '/veille' ? 'page' : undefined}>
                <LayoutDashboard aria-hidden="true" />
                <span>Dashboard</span>
              </Link>
            </li>
          </ul>

          <span className="sidebar-nav-separator" role="separator" />

          <span className="sidebar-nav-section">Articles</span>
          <ul>
            <li>
              <Link className={linkClass('/veille/nouveaux-articles')} to="/veille/nouveaux-articles" aria-current={pathname === '/veille/nouveaux-articles' ? 'page' : undefined}>
                <Inbox aria-hidden="true" />
                <span>Nouveaux articles</span>
              </Link>
            </li>
            <li>
              <Link className={linkClass('/veille/articles-valides')} to="/veille/articles-valides" aria-current={pathname === '/veille/articles-valides' ? 'page' : undefined}>
                <CheckCircle2 aria-hidden="true" />
                <span>Articles validés</span>
              </Link>
            </li>
            <li>
              <Link className={linkClass('/veille/corbeille')} to="/veille/corbeille" aria-current={pathname === '/veille/corbeille' ? 'page' : undefined}>
                <Trash2 aria-hidden="true" />
                <span>Corbeille</span>
              </Link>
            </li>
          </ul>

          <span className="sidebar-nav-separator" role="separator" />

          <ul>
            <li>
              <Link className={linkClass('/veille/ajouter-un-outil')} to="/veille/ajouter-un-outil" aria-current={pathname === '/veille/ajouter-un-outil' ? 'page' : undefined}>
                <PlusCircle aria-hidden="true" />
                <span>Ajouter un outil</span>
              </Link>
            </li>
          </ul>

          {hasGoogleAlerts && (
            <>
              <span className="sidebar-nav-separator" role="separator" />

              <span className="sidebar-nav-section">Outils</span>
              <ul>
                <li>
                  <Link className={linkClass('/veille/outils/google-alerts')} to="/veille/outils/google-alerts" aria-current={pathname === '/veille/outils/google-alerts' ? 'page' : undefined}>
                    <Bell aria-hidden="true" />
                    <span>Google Alerts</span>
                  </Link>
                </li>
              </ul>
            </>
          )}
        </nav>
      ) : (
        <section className="sidebar-settings" aria-label="Paramètres de l’interface">
          <h3>Apparence</h3>
          <p>La couleur d’accent choisie ici s’applique uniquement à cette veille. Le thème clair/sombre se gère depuis l’espace « Compte » en bas à droite.</p>
          <ThemeToggle />
        </section>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <h4>Mon équipier de veille</h4>
        <p>Produit par MULLER Aymeric</p>
      </div>
    </aside>
  )
}
