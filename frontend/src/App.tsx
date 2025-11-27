import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { logout } from './api/auth'

function App() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  
  // Define which routes should show the topbar
  const topbarRoutes = ['/colleges', '/programs', '/students']
  const shouldShowTopbar = topbarRoutes.includes(location.pathname)

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

  async function handleLogout() {
    try {
      await logout()
      // Clear any local storage or session storage if used
      localStorage.removeItem('authToken')
      sessionStorage.removeItem('authToken')
      // Redirect to login page
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if the API call fails, still redirect to login
      localStorage.removeItem('authToken')
      sessionStorage.removeItem('authToken')
      navigate('/login')
    }
  }

  return (
    <>
      {shouldShowTopbar && (
        <nav className={`navbar navbar-expand-lg app-navbar fixed-top ${scrolled ? 'shadow-sm' : ''}`}>
          <div className="container-fluid">
            <Link className="navbar-brand app-brand" to="/home">ARCHV</Link>
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
              </ul>
              {/* Logout Button */}
              <div className="navbar-nav">
                <button 
                  className="btn btn-outline-danger btn-sm" 
                  onClick={handleLogout}
                  style={{ marginLeft: 'auto' }}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      <div className={`container app-container${shouldShowTopbar ? '' : ' no-top'}`}>
        <Outlet />
      </div>
    </>
  )
}

export default App