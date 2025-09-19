import { useEffect, useMemo, useRef, useState } from 'react'

type College = {
  collegeCode: string
  collegeName: string
}

type SortKey = keyof College
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 50

function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  if (a === b) return 0
  const res = a! < b! ? -1 : 1
  return dir === 'asc' ? res : -res
}

export default function Colleges() {
  const [colleges, setColleges] = useState<College[]>([])

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

  const processedColleges = useMemo(() => {
    const filtered = colleges.filter(c => {
      if (!searchQuery) return true
      const value = String(c[searchField] ?? '').toLowerCase()
      return value.includes(searchQuery.toLowerCase())
    })
    const sorted = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
    return sorted
  }, [colleges, searchQuery, searchField, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processedColleges.length / PAGE_SIZE))
  const pageClamped = Math.min(Math.max(1, page), totalPages)
  const paginated = processedColleges.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  useEffect(() => {
    if (page !== pageClamped) setPage(pageClamped)
  }, [pageClamped])

  function handleSelectRow(indexOnPage: number) {
    const absoluteIndex = (pageClamped - 1) * PAGE_SIZE + indexOnPage
    const c = processedColleges[absoluteIndex]
    if (!c) return
    setSelectedRowIndex(absoluteIndex)
    setDraft({ ...c })
  }

  function clearForm() {
    setSelectedRowIndex(null)
    setDraft({ collegeCode: '', collegeName: '' })
  }

  function onAdd() {
    if (!draft.collegeCode || !draft.collegeName) {
      alert('Both fields are required.')
      return
    }
    if (colleges.some(c => c.collegeCode === draft.collegeCode)) {
      alert('College code already exists.')
      return
    }
    setColleges(prev => [...prev, draft as College])
    clearForm()
  }

  function onUpdate() {
    if (selectedRowIndex === null) {
      alert('Select a college to update.')
      return
    }
    if (!draft.collegeCode || !draft.collegeName) {
      alert('Both fields are required.')
      return
    }
    setColleges(prev => prev.map((c, i) => (i === selectedRowIndex ? (draft as College) : c)))
    clearForm()
  }

  function onDelete() {
    if (selectedRowIndex === null) {
      alert('Select a college to delete.')
      return
    }
    const code = colleges[selectedRowIndex]?.collegeCode
    if (!code) return
    if (!confirm(`Delete college ${code}?`)) return
    setColleges(prev => prev.filter((_, i) => i !== selectedRowIndex))
    clearForm()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
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

  function onRefresh() {
    setPage(1)
  }

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
                    {(['collegeCode','collegeName'] as SortKey[]).map(col => (
                      <th key={col} role="button" onClick={() => toggleSort(col)}>
                        <div className="d-flex align-items-center">
                          <span className="me-1 text-capitalize">{col === 'collegeCode' ? 'College Code' : 'College Name'}</span>
                          {sortKey === col && (
                            <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, idx) => (
                    <tr key={c.collegeCode} className={selectedRowIndex === ((pageClamped - 1) * PAGE_SIZE + idx) ? 'table-primary' : ''} onClick={() => handleSelectRow(idx)} style={{ cursor: 'pointer' }}>
                      <td>{c.collegeCode}</td>
                      <td>{c.collegeName}</td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center text-muted py-4">No colleges to display.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <div>Showing {paginated.length} of {processedColleges.length} colleges</div>
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
