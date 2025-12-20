import { useEffect, useRef, useState, useCallback } from 'react'
import { listColleges, createCollege, updateCollege, deleteCollege } from '../api/colleges'

type College = {
  collegeCode: string
  collegeName: string
}

type SortKey = keyof College
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 50

// Define a type for API errors
type ApiError = {
  message: string
  response?: {
    data?: {
      message?: string
    }
  }
}

function validateCollegeDraft(draft: Partial<College>): string[] {
  const errors: string[] = []
  if (!draft.collegeCode) errors.push('College Code is required.')
  if (!draft.collegeName) errors.push('College Name is required.')
  return errors
}

export default function Colleges() {
  const [colleges, setColleges] = useState<College[]>([])
  const [meta, setMeta] = useState<{ page: number; per_page: number; total: number } | null>(null)

  const [draft, setDraft] = useState<Partial<College>>({
    collegeCode: '',
    collegeName: '',
  })
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [collegeToEdit, setCollegeToEdit] = useState<College | null>(null)
  const [collegeToDelete, setCollegeToDelete] = useState<College | null>(null)
  
  // Edit form state
  const [editDraft, setEditDraft] = useState<Partial<College>>({})

  const [searchField, setSearchField] = useState<SortKey>('collegeCode')
  const [searchQuery, setSearchQuery] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('collegeCode')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const leftColRef = useRef<HTMLDivElement | null>(null)
  const [tableMaxHeight, setTableMaxHeight] = useState<number | null>(null)

  // Server-driven listing
  const totalPages = Math.max(1, Math.ceil((meta?.total || 0) / PAGE_SIZE))
  const pageClamped = Math.min(Math.max(1, page), totalPages)

  // Map frontend sort/search fields to server column names
  const fieldToServer: Record<string, string> = {
    collegeCode: 'college_code',
    collegeName: 'college_name',
  }

  // Function to refresh college list
  const refreshCollegeList = useCallback(async () => {
    try {
      const params: Record<string, any> = {
        page: pageClamped,
        page_size: PAGE_SIZE,
        sort_by: fieldToServer[sortKey],
        sort_order: sortDir === 'asc' ? 'ASC' : 'DESC',
      }
      if (searchQuery) {
        params.q = searchQuery
        params.search_by = fieldToServer[searchField]
      }
      
      const res = await listColleges(params)
      
      // The API response from listColleges is already converted to camelCase
      const collegeList: College[] = res.data.map((c: any) => ({
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
      }))
      
      setColleges(collegeList)
      setMeta(res.meta)
    } catch (err) {
      console.error('Failed to list colleges', err)
      const error = err as ApiError
      alert(error?.message || 'Failed to load colleges')
    }
  }, [pageClamped, sortKey, sortDir, searchField, searchQuery])

  // Fetch list from server whenever relevant params change
  useEffect(() => {
    refreshCollegeList()
  }, [page, sortKey, sortDir, searchField, searchQuery, refreshCollegeList])

  // Function to open edit modal
  const handleEditClick = (college: College) => {
    setCollegeToEdit(college)
    setEditDraft({ ...college })
    setShowEditModal(true)
  }

  // Function to open delete modal
  const handleDeleteClick = (college: College) => {
    setCollegeToDelete(college)
    setShowDeleteModal(true)
  }

  // Function to close edit modal
  const closeEditModal = () => {
    setShowEditModal(false)
    setCollegeToEdit(null)
    setEditDraft({})
  }

  // Function to close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setCollegeToDelete(null)
  }

  async function onAdd() {
    const errors = validateCollegeDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      const collegeToCreate = {
        collegeCode: draft.collegeCode!,
        collegeName: draft.collegeName!,
      }
      
      await createCollege(collegeToCreate)
      alert('College created successfully!')
      
      await refreshCollegeList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create college'
      alert(errorMessage)
      console.error('Create college error:', err)
    }
  }

  async function onEdit() {
    if (!collegeToEdit) return
    
    const errors = validateCollegeDraft(editDraft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      console.log('Original college:', collegeToEdit)
      console.log('Draft updates:', editDraft)
      
      // Prepare update payload - only include changed fields
      const updates: Partial<College> = {}
      if (editDraft.collegeCode && editDraft.collegeCode !== collegeToEdit.collegeCode) updates.collegeCode = editDraft.collegeCode
      if (editDraft.collegeName && editDraft.collegeName !== collegeToEdit.collegeName) updates.collegeName = editDraft.collegeName
      
      console.log('Updates to send:', updates)
      
      if (Object.keys(updates).length === 0) {
        alert('No changes to update')
        return
      }
      
      await updateCollege(collegeToEdit.collegeCode, updates)
      alert('College updated successfully!')
      
      await refreshCollegeList()
      closeEditModal()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update college'
      alert(errorMessage)
      console.error('Update college error:', err)
    }
  }

  async function onDelete() {
    if (!collegeToDelete) return
    
    try {
      await deleteCollege(collegeToDelete.collegeCode)
      alert('College deleted successfully!')
      
      await refreshCollegeList()
      closeDeleteModal()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete college'
      alert(errorMessage)
      console.error('Delete college error:', err)
    }
  }

  function clearForm() {
    setDraft({ collegeCode: '', collegeName: '' })
  }

  function onRefresh() {
    refreshCollegeList()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const canSubmit = validateCollegeDraft(draft).length === 0
  const canSubmitEdit = validateCollegeDraft(editDraft).length === 0

  useEffect(() => {
    function syncHeights() {
      const h = leftColRef.current?.offsetHeight
      if (h && h > 200) setTableMaxHeight(h)
    }
    syncHeights()
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [draft, searchField, searchQuery, colleges.length])

  return (
    <div>
      <h2 className="mb-3">Colleges</h2>

      <div className="row g-3 align-items-stretch">
        
        <div className="col-12 col-lg-4" ref={leftColRef}>
          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <h5 className="card-title mb-3">Search</h5>
              <div className="row g-3 align-items-end">
                <div className="col-12">
                  <label className="form-label">Search by</label>
                  <div className="input-group">
                    <select className="form-select" style={{ maxWidth: 180 }} value={searchField} onChange={e => setSearchField(e.target.value as SortKey)}>
                      <option value="collegeCode">College Code</option>
                      <option value="collegeName">College Name</option>
                    </select>
                    <input className="form-control" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <h5 className="card-title mb-3">Add New College</h5>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">College Code</label>
                  <input className="form-control" value={draft.collegeCode || ''} onChange={e => setDraft(prev => ({ ...prev, collegeCode: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label">College Name</label>
                  <input className="form-control" value={draft.collegeName || ''} onChange={e => setDraft(prev => ({ ...prev, collegeName: e.target.value }))} />
                </div>
                
                {/* Action Buttons */}
                <div className="col-12 d-flex gap-2 flex-wrap">
                  <button 
                    className="btn btn-primary" 
                    onClick={onAdd} 
                    disabled={!canSubmit}
                  >
                    Add
                  </button>
                  <button 
                    className="btn btn-outline-secondary" 
                    onClick={clearForm}
                  >
                    Clear
                  </button>
                  <button 
                    className="btn btn-outline-success" 
                    onClick={onRefresh}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <div className="col-12 col-lg-8 d-flex">
          <div className="card frosted-glass flex-fill">
            <div className="table-responsive scroll-area" style={{ maxHeight: tableMaxHeight ? `${tableMaxHeight - 96}px` : '500px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0">
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
                  <tr>
                    {(['collegeCode','collegeName'] as SortKey[]).map(col => (
                      <th key={col} role="button" onClick={() => toggleSort(col)}>
                        <div className="d-flex align-items-center">
                          <span className="me-1 text-capitalize">
                            {col === 'collegeCode' ? 'College Code' : 'College Name'}
                          </span>
                          {sortKey === col && (
                            <span aria-label={sortDir === 'asc' ? 'ascending' : 'descending'}>
                              {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((c, idx) => (
                    <tr key={c.collegeCode} style={{ cursor: 'pointer' }}>
                      <td>{c.collegeCode}</td>
                      <td>{c.collegeName}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button 
                            className="btn btn-sm btn-outline-warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(c);
                            }}
                            title="Edit college"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(c);
                            }}
                            title="Delete college"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {colleges.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        <i className="bi bi-building display-6 d-block mb-2"></i>
                        No colleges to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <div>Showing {colleges.length} of {meta?.total ?? 0} colleges</div>
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={pageClamped === 1}
                >
                  Prev
                </button>
                <span>Page</span>
                <input 
                  style={{ width: 80 }} 
                  className="form-control" 
                  value={String(pageClamped)} 
                  onChange={e => {
                    const n = Number(e.target.value)
                    setPage(Number.isFinite(n) ? n : pageClamped)
                  }} 
                />
                <span>of {totalPages}</span>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={pageClamped === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit College Modal */}
      {showEditModal && collegeToEdit && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit College: {collegeToEdit.collegeName}</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">College Code</label>
                    <input 
                      className="form-control" 
                      value={editDraft.collegeCode || ''} 
                      onChange={e => setEditDraft(prev => ({ ...prev, collegeCode: e.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">College Name</label>
                    <input 
                      className="form-control" 
                      value={editDraft.collegeName || ''} 
                      onChange={e => setEditDraft(prev => ({ ...prev, collegeName: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={onEdit}
                  disabled={!canSubmitEdit}
                >
                  Update College
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && collegeToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Confirm Deletion</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete college <strong>{collegeToDelete.collegeName}</strong> (Code: {collegeToDelete.collegeCode})?
                </p>
                <p className="text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={onDelete}
                >
                  Delete College
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}