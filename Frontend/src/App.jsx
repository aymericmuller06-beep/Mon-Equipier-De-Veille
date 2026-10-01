import './Style/main.scss'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './Context/ThemeContext'
import { WatchProvider } from './Context/WatchContext'
import Home from './pages/Home'
import WatchSelection from './pages/WatchSelection'

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
            </Routes>
          </main>
        </ThemeProvider>
      </Router>
    </WatchProvider>
  )
}

export default App
