import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

function App() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  function handleNavItemClick() {
    const el = document.getElementById('navbarNav')
    if (el && el.classList.contains('show')) {
      el.classList.remove('show')
    }
  }


  return (
    <>
      {!isLanding && (
        <nav className={`navbar navbar-expand-lg app-navbar fixed-top ${scrolled ? 'shadow-sm' : ''}`}>
          <div className="container-fluid">
            <Link className="navbar-brand app-brand" to="/">ARCHV</Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/colleges" onClick={handleNavItemClick}>Colleges</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/programs" onClick={handleNavItemClick}>Programs</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/students" onClick={handleNavItemClick}>Students</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/demographics" onClick={handleNavItemClick}>Demographics</NavLink>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      )}
      <div className={`container app-container${isLanding ? ' no-top' : ''}`}>
        <Outlet />
      </div>
    </>
  )
}

export default App
