import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { listPrograms, createProgram, updateProgram, deleteProgram } from '../api/programs'
import { listColleges } from '../api/colleges'

type Program = {
  programCode: string
  programName: string
  collegeCode: string
}

type College = {
  collegeCode: string
  collegeName: string
}

type SortKey = keyof Program
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

function validateProgramDraft(draft: Partial<Program>): string[] {
  const errors: string[] = []
  if (!draft.programCode) errors.push('Program Code is required.')
  if (!draft.programName) errors.push('Program Name is required.')
  if (!draft.collegeCode) errors.push('College is required.')
  return errors
}

export default function ProgramManager() {
  const [colleges, setColleges] = useState<College[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [meta, setMeta] = useState<{ page: number; per_page: number; total: number } | null>(null)
  
  // Keep track of display names for UI
  const [collegeDisplayNames, setCollegeDisplayNames] = useState<Record<string, string>>({})

  const [draft, setDraft] = useState<Partial<Program>>({
    programCode: '',
    programName: '',
    collegeCode: '',
  })
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [programToEdit, setProgramToEdit] = useState<Program | null>(null)
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null)
  
  // Edit form state
  const [editDraft, setEditDraft] = useState<Partial<Program>>({})

  const [searchField, setSearchField] = useState<SortKey>('programCode')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCollege, setFilterCollege] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('programCode')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const leftColRef = useRef<HTMLDivElement | null>(null)
  const [tableMaxHeight, setTableMaxHeight] = useState<number | null>(null)

  // Load colleges from API
  useEffect(() => {
    async function loadColleges() {
      try {
        const collegesResp = await listColleges({ page_size: 1000 })
        const collegesList = collegesResp.data
        setColleges(collegesList)

        // Create mapping of college codes to names for display
        const collegeNameMap: Record<string, string> = {}
        collegesList.forEach(college => {
          collegeNameMap[college.collegeCode] = college.collegeName
        })
        setCollegeDisplayNames(collegeNameMap)

      } catch (err) {
        console.error('Failed to load colleges', err)
        const error = err as ApiError
        alert(error?.message || 'Failed to load colleges')
      }
    }
    
    loadColleges()
  }, [])

  // College options for dropdown (using names for display)
  const collegeOptions = useMemo(() => 
    colleges.map(c => ({
      code: c.collegeCode,
      name: c.collegeName
    })).sort((a, b) => a.name.localeCompare(b.name)), 
    [colleges]
  )

  // For filter dropdowns
  const filterCollegeOptions = useMemo(() => 
    [{ code: '', name: 'All' }, ...collegeOptions], 
    [collegeOptions]
  )

  // Server-driven listing
  const totalPages = Math.max(1, Math.ceil((meta?.total || 0) / PAGE_SIZE))
  const pageClamped = Math.min(Math.max(1, page), totalPages)

  // Map frontend sort/search fields to server column names
  const fieldToServer: Record<string, string> = {
    programCode: 'program_code',
    programName: 'program_name',
    collegeCode: 'college_code',
  }

  // Function to refresh program list
  const refreshProgramList = useCallback(async () => {
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
      if (filterCollege) {
        params.college_code = filterCollege
      }
      
      const res = await listPrograms(params)
      
      // The API response from listPrograms is already converted to camelCase
      const programList: Program[] = res.data.map((p: any) => ({
        programCode: p.programCode,
        programName: p.programName,
        collegeCode: p.collegeCode
      }))
      
      setPrograms(programList)
      setMeta(res.meta)
    } catch (err) {
      console.error('Failed to list programs', err)
      const error = err as ApiError
      alert(error?.message || 'Failed to load programs')
    }
  }, [pageClamped, sortKey, sortDir, searchField, searchQuery, filterCollege])

  // Fetch list from server whenever relevant params change
  useEffect(() => {
    refreshProgramList()
  }, [page, sortKey, sortDir, searchField, searchQuery, filterCollege, refreshProgramList])

  // Function to open edit modal
  const handleEditClick = (program: Program) => {
    setProgramToEdit(program)
    setEditDraft({ ...program })
    setShowEditModal(true)
  }

  // Function to open delete modal
  const handleDeleteClick = (program: Program) => {
    setProgramToDelete(program)
    setShowDeleteModal(true)
  }

  // Function to close edit modal
  const closeEditModal = () => {
    setShowEditModal(false)
    setProgramToEdit(null)
    setEditDraft({})
  }

  // Function to close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setProgramToDelete(null)
  }

  async function onAdd() {
    const errors = validateProgramDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      const programToCreate = {
        programCode: draft.programCode!,
        programName: draft.programName!,
        collegeCode: draft.collegeCode!
      }
      
      await createProgram(programToCreate)
      alert('Program created successfully!')
      
      await refreshProgramList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create program'
      alert(errorMessage)
      console.error('Create program error:', err)
    }
  }

  async function onEdit() {
    if (!programToEdit) return
    
    const errors = validateProgramDraft(editDraft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      console.log('Original program:', programToEdit)
      console.log('Draft updates:', editDraft)
      
      // Prepare update payload - only include changed fields
      const updates: Partial<Program> = {}
      if (editDraft.programCode && editDraft.programCode !== programToEdit.programCode) updates.programCode = editDraft.programCode
      if (editDraft.programName && editDraft.programName !== programToEdit.programName) updates.programName = editDraft.programName
      if (editDraft.collegeCode && editDraft.collegeCode !== programToEdit.collegeCode) {
        console.log('College changed from', programToEdit.collegeCode, 'to', editDraft.collegeCode)
        updates.collegeCode = editDraft.collegeCode
      }
      
      console.log('Updates to send:', updates)
      
      if (Object.keys(updates).length === 0) {
        alert('No changes to update')
        return
      }
      
      await updateProgram(programToEdit.programCode, updates)
      alert('Program updated successfully!')
      
      await refreshProgramList()
      closeEditModal()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update program'
      alert(errorMessage)
      console.error('Update program error:', err)
    }
  }

  async function onDelete() {
    if (!programToDelete) return
    
    try {
      await deleteProgram(programToDelete.programCode)
      alert('Program deleted successfully!')
      
      await refreshProgramList()
      closeDeleteModal()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete program'
      alert(errorMessage)
      console.error('Delete program error:', err)
    }
  }

  function clearForm() {
    setDraft({ programCode: '', programName: '', collegeCode: '' })
  }

  function onRefresh() {
    refreshProgramList()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const canSubmit = validateProgramDraft(draft).length === 0
  const canSubmitEdit = validateProgramDraft(editDraft).length === 0

  useEffect(() => {
    function syncHeights() {
      const h = leftColRef.current?.offsetHeight
      if (h && h > 200) setTableMaxHeight(h)
    }
    syncHeights()
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [draft, searchField, searchQuery, filterCollege, programs.length])

  // Filter programs based on college filter
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      if (filterCollege && p.collegeCode !== filterCollege) return false
      return true
    })
  }, [programs, filterCollege])

  return (
    <div>
      <h2 className="mb-3">Programs</h2>

      <div className="row g-3 align-items-stretch">
        
        <div className="col-12 col-lg-4" ref={leftColRef}>
          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-12">
                  <label className="form-label">Search by</label>
                  <div className="input-group">
                    <select className="form-select" style={{ maxWidth: 180 }} value={searchField} onChange={e => setSearchField(e.target.value as SortKey)}>
                      <option value="programCode">Program Code</option>
                      <option value="programName">Program Name</option>
                      <option value="collegeCode">College Code</option>
                    </select>
                    <input className="form-control" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                
                {/* College Filter */}
                <div className="col-12">
                  <label className="form-label">Filter by College</label>
                  <select className="form-select" value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
                    {filterCollegeOptions.map(option => 
                      <option key={option.code} value={option.code}>{option.name}</option>
                    )}
                  </select>
                </div>
                
                {/* Clear Filters Button */}
                {filterCollege && (
                  <div className="col-12">
                    <button 
                      className="btn btn-outline-secondary btn-sm w-100"
                      onClick={() => setFilterCollege('')}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Clear Filter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <h5 className="card-title mb-3">Add New Program</h5>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Program Code</label>
                  <input className="form-control" value={draft.programCode || ''} onChange={e => setDraft(prev => ({ ...prev, programCode: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label">Program Name</label>
                  <input className="form-control" value={draft.programName || ''} onChange={e => setDraft(prev => ({ ...prev, programName: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label">College</label>
                  <select className="form-select" value={draft.collegeCode || ''} onChange={e => setDraft(prev => ({ ...prev, collegeCode: e.target.value }))}>
                    <option value="">Select</option>
                    {collegeOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  {draft.collegeCode && (
                    <div className="form-text small">
                      Selected: {collegeDisplayNames[draft.collegeCode] || draft.collegeCode}
                    </div>
                  )}
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
                    {(['programCode','programName','collegeCode'] as SortKey[]).map(col => (
                      <th key={col} role="button" onClick={() => toggleSort(col)}>
                        <div className="d-flex align-items-center">
                          <span className="me-1 text-capitalize">
                            {col === 'programCode' ? 'Program Code' : 
                             col === 'programName' ? 'Program Name' : 
                             'College Code'}
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
                  {filteredPrograms.map((p, idx) => (
                    <tr key={p.programCode} style={{ cursor: 'pointer' }}>
                      <td>{p.programCode}</td>
                      <td>{p.programName}</td>
                      <td>{p.collegeCode}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button 
                            className="btn btn-sm btn-outline-warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(p);
                            }}
                            title="Edit program"
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
                              handleDeleteClick(p);
                            }}
                            title="Delete program"
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
                  {filteredPrograms.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        <i className="bi bi-book display-6 d-block mb-2"></i>
                        No programs to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <div>Showing {filteredPrograms.length} of {meta?.total ?? 0} programs</div>
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

      {/* Edit Program Modal */}
      {showEditModal && programToEdit && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Program: {programToEdit.programName}</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Program Code</label>
                    <input 
                      className="form-control" 
                      value={editDraft.programCode || ''} 
                      onChange={e => setEditDraft(prev => ({ ...prev, programCode: e.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Program Name</label>
                    <input 
                      className="form-control" 
                      value={editDraft.programName || ''} 
                      onChange={e => setEditDraft(prev => ({ ...prev, programName: e.target.value }))} 
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">College</label>
                    <select 
                      className="form-select" 
                      value={editDraft.collegeCode || ''} 
                      onChange={e => setEditDraft(prev => ({ ...prev, collegeCode: e.target.value }))}
                    >
                      <option value="">Select</option>
                      {collegeOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    {editDraft.collegeCode && (
                      <div className="form-text small">
                        Selected: {collegeDisplayNames[editDraft.collegeCode] || editDraft.collegeCode}
                      </div>
                    )}
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
                  Update Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && programToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Confirm Deletion</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete program <strong>{programToDelete.programName}</strong> (Code: {programToDelete.programCode})?
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
                  Delete Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}