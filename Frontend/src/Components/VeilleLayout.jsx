import { Navigate } from 'react-router-dom'
import { CloudOff } from 'lucide-react'
import SideBar from './SideBar'
import AccountMenu from './AccountMenu'
import ArticleSearch from './ArticleSearch'
import { useWatch } from '../Context/useWatch'

// Ossature commune (sidebar + en-tête) à toutes les pages d'une veille
export default function VeilleLayout({ children }) {
  const { currentWatch, watchId, loading, error } = useWatch()
  // Serveur injoignable avant d'avoir pu charger la veille : on reste sur la page, qui se remplira à son retour
  const serverDown = Boolean(error) && !currentWatch && Boolean(watchId)

  // Évite un écran de chargement infini si aucune veille n'est (ou plus) sélectionnée
  if (!loading && !currentWatch && !serverDown) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="container">
      <SideBar />
      <div className="home">
        <header className="veille-header">
          <ArticleSearch />
          <AccountMenu variant="inline" sansTexte={true} />
        </header>
        <div className="home-content">
          {serverDown ? (
            <div className="server-down" role="status">
              <CloudOff aria-hidden="true" />
              <p>Le serveur ne répond pas.</p>
              <span>Nouvel essai automatique en cours : la page s’affichera dès son retour.</span>
            </div>
          ) : children}
        </div>
      </div>
    </div>
  )
}
