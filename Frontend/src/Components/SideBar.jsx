import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, LayoutGrid, Settings2 } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useWatch } from '../Context/WatchContext'

export default function SideBar() {
  const [activePanel, setActivePanel] = useState('menu')
  const { watchTitle } = useWatch()

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
          <h3>Catégories</h3>
          <ul>
            <li><Link className="is-current" to="/veille" aria-current="page">Accueil</Link></li>
            <li><a href="#categorie-1">Catégorie 1</a></li>
            <li><a href="#categorie-2">Catégorie 2</a></li>
            <li><a href="#categorie-3">Catégorie 3</a></li>
          </ul>
        </nav>
      ) : (
        <section className="sidebar-settings" aria-label="Paramètres de l’interface">
          <h3>Apparence</h3>
          <p>Le thème est général ; la couleur d’accent s’applique uniquement à cette veille.</p>
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
