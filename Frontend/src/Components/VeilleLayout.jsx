import { Navigate } from 'react-router-dom'
import SideBar from './SideBar'
import AccountMenu from './AccountMenu'
import { useWatch } from '../Context/WatchContext'

// Ossature commune (sidebar + en-tête) à toutes les pages d'une veille
export default function VeilleLayout({ children }) {
  const { currentWatch, loading } = useWatch()

  // Évite un écran de chargement infini si aucune veille n'est (ou plus) sélectionnée
  if (!loading && !currentWatch) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="container">
      <SideBar />
      <div className="home">
        <header className="veille-header">
          <AccountMenu variant="inline" sansTexte={true} />
        </header>
        <div className="home-content">
          {children}
        </div>
      </div>
    </div>
  )
}
