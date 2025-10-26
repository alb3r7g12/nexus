import { Routes, Route, NavLink } from 'react-router-dom'
import classNames from 'classnames'
import DashboardPage from './DashboardPage'
import PackerPage from './PackerPage'
import logoAvion from './assets/gategropus.png'
import './App.css'

function App() {
  const currentYear = new Date().getFullYear()

  const navLinkClassName = ({ isActive }) =>
    classNames('app-nav__link', { 'app-nav__link--active': isActive })

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src={logoAvion} alt="Gategroup" />
          <div>
            <h1 className="app-title">gategroup | Freshness Intelligence</h1>
            <p className="app-subtitle">Trazabilidad y frescura en tiempo real para operaciones críticas</p>
          </div>
        </div>

        <nav className="app-nav">
          <NavLink to="/" className={navLinkClassName} end>
            Dashboard (Supervisor)
          </NavLink>
          <NavLink to="/check" className={navLinkClassName}>
            Scanner (Empacador)
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/check" element={<PackerPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>© {currentYear} gategroup Freshness Intelligence</span>
        <span className="pill">HackMTY MVP • Backend local activo</span>
      </footer>
    </div>
  )
}

export default App
