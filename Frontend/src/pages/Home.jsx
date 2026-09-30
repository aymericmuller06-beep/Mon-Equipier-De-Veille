import SideBar from '../Components/SideBar'
import { useWatch } from '../Context/WatchContext'

export default function Home() {
  const { watchTitle } = useWatch()

  return (
    <div className='container'>
        <SideBar />
        <div className="home">
            <h1>{watchTitle || 'Votre espace de veille'}</h1>
            <p>Bienvenue dans votre espace de veille.</p>
        </div>
    </div>
  )
}
