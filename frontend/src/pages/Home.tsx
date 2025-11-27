import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container my-5">
      <h2 className="mb-3">Get Started</h2>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <div className="card hover-card frosted-glass h-100 fade-up">
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <div className="emoji-badge me-2">🏫</div>
                <h5 className="mb-0">Colleges</h5>
              </div>
              <p className="text-muted mb-3">Add and manage college records. Search and sort instantly.</p>
              <Link to="/colleges" className="stretched-link link-animated">Open Colleges →</Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card hover-card frosted-glass h-100 fade-up" style={{ animationDelay: '60ms' }}>
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <div className="emoji-badge me-2">📚</div>
                <h5 className="mb-0">Programs</h5>
              </div>
              <p className="text-muted mb-3">Maintain programs per college with clean tables and pagination.</p>
              <Link to="/programs" className="stretched-link link-animated">Open Programs →</Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card hover-card frosted-glass h-100 fade-up" style={{ animationDelay: '120ms' }}>
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <div className="emoji-badge me-2">👩‍🎓</div>
                <h5 className="mb-0">Students</h5>
              </div>
              <p className="text-muted mb-3">Create, edit, and filter student records.</p>
              <Link to="/students" className="stretched-link link-animated">Open Students →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
