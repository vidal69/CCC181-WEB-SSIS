import { useEffect, useMemo, useRef, useState } from 'react'

type Program = {
  programCode: string
  programName: string
  collegeCode: string
}

type SortKey = keyof Program
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 50
const COLLEGE_OPTIONS = ['Engineering', 'Science', 'Business']

function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  if (a === b) return 0
  const res = a! < b! ? -1 : 1
  return dir === 'asc' ? res : -res
}

export default function ProgramManager() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [draft, setDraft] = useState<Partial<Program>>({
    programCode: '',
    programName: '',
    collegeCode: '',
  })
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  const [searchField, setSearchField] = useState<SortKey>('programCode')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('programCode')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const [page, setPage] = useState(1)

  const leftColRef = useRef<HTMLDivElement | null>(null)
  const [tableMaxHeight, setTableMaxHeight] = useState<number | null>(null)

  const processedPrograms = useMemo(() => {
    const filtered = programs.filter(p => {
      if (!searchQuery) return true
      const value = String(p[searchField] ?? '').toLowerCase()
      return value.includes(searchQuery.toLowerCase())
    })
    return [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
  }, [programs, searchQuery, searchField, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processedPrograms.length / PAGE_SIZE))
  const pageClamped = Math.min(Math.max(1, page), totalPages)
  const paginated = processedPrograms.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  useEffect(() => {
    if (page !== pageClamped) setPage(pageClamped)
  }, [pageClamped])

  function handleSelectRow(idx: number) {
    const absoluteIndex = (pageClamped - 1) * PAGE_SIZE + idx
    const p = processedPrograms[absoluteIndex]
    if (!p) return
    setSelectedRowIndex(absoluteIndex)
    setDraft({ ...p })
  }

  function clearForm() {
    setSelectedRowIndex(null)
    setDraft({ programCode: '', programName: '', collegeCode: '' })
  }

  function onAdd() {
    if (!draft.programCode || !draft.programName || !draft.collegeCode) {
      alert('Program Code, Program Name, and College Code are required.')
      return
    }
    if (programs.some(p => p.programCode === draft.programCode)) {
      alert('Program code already exists.')
      return
    }
    setPrograms(prev => [...prev, draft as Program])
    clearForm()
  }

  function onUpdate() {
    if (selectedRowIndex === null) {
      alert('Select a program to update.')
      return
    }
    if (!draft.programCode || !draft.programName || !draft.collegeCode) {
      alert('Program Code, Program Name, and College Code are required.')
      return
    }
    setPrograms(prev => prev.map((p, i) => (i === selectedRowIndex ? (draft as Program) : p)))
    clearForm()
  }

  function onDelete() {
    if (selectedRowIndex === null) {
      alert('Select a program to delete.')
      return
    }
    if (!confirm('Delete this program?')) return
    setPrograms(prev => prev.filter((_, i) => i !== selectedRowIndex))
    clearForm()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function onRefresh() {
    setPage(1)
  }

  useEffect(() => {
    function syncHeights() {
      const h = leftColRef.current?.offsetHeight
      if (h && h > 200) setTableMaxHeight(h)
    }
    syncHeights()
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [draft, searchField, searchQuery, paginated.length])

  return (
    <div>
      <h2 className="mb-3">Programs</h2>

      <div className="row g-3 align-items-stretch">
        
        <div className="col-12 col-lg-4" ref={leftColRef}>
          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
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
                  <label className="form-label">College Code</label>
                  <select className="form-select" value={draft.collegeCode || ''} onChange={e => setDraft(prev => ({ ...prev, collegeCode: e.target.value }))}>
                    <option value="">Select</option>
                    {COLLEGE_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={onAdd}>Add</button>
                  <button className="btn btn-warning" onClick={onUpdate} disabled={selectedRowIndex === null}>Update</button>
                  <button className="btn btn-danger" onClick={onDelete} disabled={selectedRowIndex === null}>Delete</button>
                  <button className="btn btn-outline-secondary" onClick={clearForm}>Clear</button>
                  <button className="btn btn-outline-success" onClick={onRefresh}>Refresh</button>
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
                          <span className="me-1 text-capitalize">{col}</span>
                          {sortKey === col && (
                            <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, idx) => (
                    <tr key={p.programCode} 
                        className={selectedRowIndex === ((pageClamped - 1) * PAGE_SIZE + idx) ? 'table-primary' : ''} 
                        onClick={() => handleSelectRow(idx)} 
                        style={{ cursor: 'pointer' }}>
                      <td>{p.programCode}</td>
                      <td>{p.programName}</td>
                      <td>{p.collegeCode}</td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">No programs to display.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <div>Showing {paginated.length} of {processedPrograms.length} programs</div>
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped === 1}>Prev</button>
                <span>Page</span>
                <input style={{ width: 80 }} className="form-control" value={String(pageClamped)} onChange={e => {
                  const n = Number(e.target.value)
                  setPage(Number.isFinite(n) ? n : pageClamped)
                }} />
                <span>of {totalPages}</span>
                <button className="btn btn-outline-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
