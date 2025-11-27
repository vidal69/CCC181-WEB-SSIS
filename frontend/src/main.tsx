import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './theme.css'
import App from './App.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Students from './pages/Students'
import Programs from './pages/Programs'
import Colleges from './pages/Colleges'
import Demographics from './pages/Demographics'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Login from './pages/Login'
import { AuthProvider, ProtectedRoute } from './auth'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'home', element: <ProtectedRoute><Home /></ProtectedRoute> },
      { path: 'students', element: <ProtectedRoute><Students /></ProtectedRoute> },
      { path: 'programs', element: <ProtectedRoute><Programs /></ProtectedRoute> },
      { path: 'colleges', element: <ProtectedRoute><Colleges /></ProtectedRoute> },
      { path: 'demographics', element: <ProtectedRoute><Demographics /></ProtectedRoute> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
