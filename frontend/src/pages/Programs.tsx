import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

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
  const refreshProgramList = async () => {
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
  }

  // Fetch list from server whenever relevant params change
  useEffect(() => {
    refreshProgramList()
  }, [page, sortKey, sortDir, searchField, searchQuery, filterCollege])

  function handleSelectRow(indexOnPage: number) {
    const p = programs[indexOnPage]
    if (!p) return
    console.log('Selected program:', p)
    
    setSelectedRowIndex(indexOnPage)
    setDraft({ ...p })
  }

  function clearForm() {
    setSelectedRowIndex(null)
    setDraft({ programCode: '', programName: '', collegeCode: '' })
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

  async function onUpdate() {
    if (selectedRowIndex === null) {
      alert('Select a program row to update.')
      return
    }
    
    const errors = validateProgramDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    
    try {
      const orig = programs[selectedRowIndex]
      console.log('Original program:', orig)
      console.log('Draft updates:', draft)
      
      // Prepare update payload - only include changed fields
      const updates: Partial<Program> = {}
      if (draft.programCode && draft.programCode !== orig.programCode) updates.programCode = draft.programCode
      if (draft.programName && draft.programName !== orig.programName) updates.programName = draft.programName
      if (draft.collegeCode && draft.collegeCode !== orig.collegeCode) {
        console.log('College changed from', orig.collegeCode, 'to', draft.collegeCode)
        updates.collegeCode = draft.collegeCode
      }
      
      console.log('Updates to send:', updates)
      
      if (Object.keys(updates).length === 0) {
        alert('No changes to update')
        return
      }
      
      await updateProgram(orig.programCode, updates)
      alert('Program updated successfully!')
      
      await refreshProgramList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update program'
      alert(errorMessage)
      console.error('Update program error:', err)
    }
  }

  async function onDelete() {
    if (selectedRowIndex === null) {
      alert('Select a program row to delete.')
      return
    }
    
    if (!confirm('Are you sure you want to delete this program?')) return
    
    try {
      const orig = programs[selectedRowIndex]
      await deleteProgram(orig.programCode)
      alert('Program deleted successfully!')
      
      await refreshProgramList()
      clearForm()
      
    } catch (err: unknown) {
      const error = err as ApiError
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete program'
      alert(errorMessage)
      console.error('Delete program error:', err)
    }
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
  const hasSelectedProgram = selectedRowIndex !== null

  // REMOVED THE DUPLICATE DECLARATIONS HERE

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
                <div className="col-12">
                  <label className="form-label">Filter College</label>
                  <select className="form-select" value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
                    {filterCollegeOptions.map(option => 
                      <option key={option.code} value={option.code}>{option.name}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
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
                  {hasSelectedProgram && (
                    <div className="alert alert-info py-2 mt-2 small">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-book me-2"></i>
                        <div>
                          Editing: <strong>{draft.programName}</strong>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.map((p, idx) => (
                    <tr key={p.programCode} 
                        className={selectedRowIndex === idx ? 'table-primary' : ''} 
                        onClick={() => handleSelectRow(idx)} 
                        style={{ cursor: 'pointer' }}>
                      <td>{p.programCode}</td>
                      <td>{p.programName}</td>
                      {/* Show College Code instead of College Name */}
                      <td>{p.collegeCode}</td>
                    </tr>
                  ))}
                  {filteredPrograms.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
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
    </div>
  )
}