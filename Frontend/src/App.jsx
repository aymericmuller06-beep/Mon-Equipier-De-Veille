import './Style/main.scss'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './Context/ThemeContext'
import Home from './pages/Home'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  )
}

export default App
