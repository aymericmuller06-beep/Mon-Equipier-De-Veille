import './Style/main.scss'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './Context/ThemeContext'
import { WatchProvider } from './Context/WatchContext'
import Home from './pages/Home'
import WatchSelection from './pages/WatchSelection'
import NewArticles from './pages/NewArticles'
import ValidatedArticles from './pages/ValidatedArticles'
import Trash from './pages/Trash'
import AddTool from './pages/AddTool'
import GoogleAlerts from './pages/GoogleAlerts'

function App() {
  return (
    <WatchProvider>
      <Router>
        <ThemeProvider>
          <main>
            <Routes>
              <Route path="/" element={<WatchSelection />} />
              <Route path="/selection" element={<WatchSelection />} />
              <Route path="/veille" element={<Home />} />
              <Route path="/veille/nouveaux-articles" element={<NewArticles />} />
              <Route path="/veille/articles-valides" element={<ValidatedArticles />} />
              <Route path="/veille/corbeille" element={<Trash />} />
              <Route path="/veille/outils/google-alerts" element={<GoogleAlerts />} />
              <Route path="/veille/ajouter-un-outil" element={<AddTool />} />
            </Routes>
          </main>
        </ThemeProvider>
      </Router>
    </WatchProvider>
  )
}

export default App
