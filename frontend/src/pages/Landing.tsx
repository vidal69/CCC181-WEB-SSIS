import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing-page min-vh-100 d-flex justify-content-center align-items-center text-center">
      <div className="landing-card p-5">
        <h1 className="display-4 fw-semibold mb-3 animate-fade-in">
          "ARCHV"
        </h1>
        <p className="lead text-muted mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Manage Colleges, Programs, and Students with clean tables and quick search.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Link to="/home" className="btn landing-cta btn-lg px-4">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
