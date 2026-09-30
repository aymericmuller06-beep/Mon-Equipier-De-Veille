import SideBar from '../Components/SideBar'
import { ThemeToggle } from '../Components/ThemeToggle'

export default function Home() {
  return (
    <div className='container'>
        <SideBar />
        <div className="home">
            <ThemeToggle />
            <h1>Accueil</h1>
            <p>Bienvenue!</p>
        </div>
    </div>
  )
}
