import { Home, Bolt } from 'lucide-react';

export default function SideBar() {
  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div>
          <button> <Home /> Menu</button>
          <button> <Bolt /> Paramètres</button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <h3>Catégories</h3>
        <ul>
          <li><a href="#">Accueil</a></li>
          <li><a href="#">Catégorie 1</a></li>
          <li><a href="#">Catégorie 2</a></li>
          <li><a href="#">Catégorie 3</a></li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <h4>Mon équipier de veille</h4>
        <p>Produit par MULLER Aymeric</p>
      </div>
    </aside>
  )
}
