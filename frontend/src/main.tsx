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

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'home', element: <Home /> },
      { path: 'students', element: <Students /> },
      { path: 'programs', element: <Programs /> },
      { path: 'colleges', element: <Colleges /> },
      { path: 'demographics', element: <Demographics /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
