import SideBar from '../Components/SideBar'
import AccountMenu from '../Components/AccountMenu'
import { useWatch } from '../Context/WatchContext'

export default function Home() {
  const { watchTitle } = useWatch()

  return (
    <div className='container'>
        <SideBar />
        <div className="home">
            {/* Commun à toutes les veilles ; accueillera plus tard un espace de recherche */}
            <header className="veille-header">
                <AccountMenu variant="inline" sansTexte={true} />
            </header>
            <div className="home-content">
                <h1>{watchTitle || 'Votre espace de veille'}</h1>
                <p>Bienvenue dans votre espace de veille.</p>
            </div>
        </div>
    </div>
  )
}
