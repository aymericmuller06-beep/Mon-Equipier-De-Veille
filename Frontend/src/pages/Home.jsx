import SideBar from '../Components/SideBar'

export default function Home() {
  return (
    <div className='container'>
        <SideBar />
        <div className="home">
            <h1>Accueil</h1>
            <p>Bienvenue!</p>
        </div>
    </div>
  )
}
