import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TicketsPage from './pages/TicketsPage'

function App() {
  const location = useLocation()

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <div className="logo-icon">✈</div>
            <span>КудаИз.РФ Viewer</span>
          </Link>
          <nav className="nav">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Главная
            </Link>
            <Link to="/tickets/cheap" className={`nav-link ${location.pathname.includes('/tickets') ? 'active' : ''}`}>
              Билеты
            </Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tickets/:type" element={<TicketsPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>Данные с сайта кудаиз.рф • Интерфейс для удобного поиска авиабилетов</p>
      </footer>
    </div>
  )
}

export default App
