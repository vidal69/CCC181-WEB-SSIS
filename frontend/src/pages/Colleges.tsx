import { useEffect, useRef, useState } from 'react'
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
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

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
  const refreshCollegeList = async () => {
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
  }

  // Fetch list from server whenever relevant params change
  useEffect(() => {
    refreshCollegeList()
  }, [page, sortKey, sortDir, searchField, searchQuery])

  function handleSelectRow(indexOnPage: number) {
    const c = colleges[indexOnPage]
    if (!c) return
    console.log('Selected college:', c)
    
    setSelectedRowIndex(indexOnPage)
    setDraft({ ...c })
  }

  function clearForm() {
    setSelectedRowIndex(null)
    setDraft({ collegeCode: '', collegeName: '' })
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

  async function onUpdate() {
    if (selectedRowIndex === null) {
      alert('Select a college row to update.')
      return
    }
    
    const errors = validateCollegeDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      const orig = colleges[selectedRowIndex]
      console.log('Original college:', orig)
      console.log('Draft updates:', draft)
      
      // Prepare update payload - only include changed fields
      const updates: Partial<College> = {}
      if (draft.collegeCode && draft.collegeCode !== orig.collegeCode) updates.collegeCode = draft.collegeCode
      if (draft.collegeName && draft.collegeName !== orig.collegeName) updates.collegeName = draft.collegeName
      
      console.log('Updates to send:', updates)
      
      if (Object.keys(updates).length === 0) {
        alert('No changes to update')
        return
      }
      
      await updateCollege(orig.collegeCode, updates)
      alert('College updated successfully!')
      
      await refreshCollegeList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update college'
      alert(errorMessage)
      console.error('Update college error:', err)
    }
  }

  async function onDelete() {
    if (selectedRowIndex === null) {
      alert('Select a college row to delete.')
      return
    }
    
    if (!confirm('Are you sure you want to delete this college?')) return
    
    try {
      const orig = colleges[selectedRowIndex]
      await deleteCollege(orig.collegeCode)
      alert('College deleted successfully!')
      
      await refreshCollegeList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete college'
      alert(errorMessage)
      console.error('Delete college error:', err)
    }
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
  const hasSelectedCollege = selectedRowIndex !== null

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

          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
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
                    className="btn btn-warning" 
                    onClick={onUpdate} 
                    disabled={selectedRowIndex === null || !canSubmit}
                  >
                    Update
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={onDelete} 
                    disabled={selectedRowIndex === null}
                  >
                    Delete
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
                
                {/* Status Messages */}
                <div className="col-12">
                  {hasSelectedCollege && (
                    <div className="alert alert-info py-2 mt-2 small">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-building me-2"></i>
                        <div>
                          Editing: <strong>{draft.collegeName}</strong>
                        </div>
                      </div>
                    </div>
                  )}
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
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((c, idx) => (
                    <tr key={c.collegeCode} 
                        className={selectedRowIndex === idx ? 'table-primary' : ''} 
                        onClick={() => handleSelectRow(idx)} 
                        style={{ cursor: 'pointer' }}>
                      <td>{c.collegeCode}</td>
                      <td>{c.collegeName}</td>
                    </tr>
                  ))}
                  {colleges.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center text-muted py-4">
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
    </div>
  )
}