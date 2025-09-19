import { useEffect, useMemo, useRef, useState } from 'react'

type Gender = 'Male' | 'Female'

type Student = {
  id: string
  firstName: string
  lastName: string
  yearLevel: 1 | 2 | 3 | 4
  gender: Gender
  college: string
  program: string
}

type SortKey = keyof Pick<Student, 'id' | 'firstName' | 'lastName' | 'yearLevel' | 'gender' | 'college' | 'program'>
type SortDirection = 'asc' | 'desc'

const ID_REGEX = /^\d{4}-\d{4}$/
const NAME_REGEX = /^[A-Za-z\s'-]+$/
const PAGE_SIZE = 50

const initialCollegesToPrograms: Record<string, string[]> = {
  'Engineering': ['Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering'],
  'Science': ['Biology', 'Chemistry', 'Physics'],
  'Business': ['Accountancy', 'Marketing', 'Finance'],
}

function validateStudentDraft(draft: Partial<Student>): string[] {
  const errors: string[] = []
  if (!draft.id || !ID_REGEX.test(draft.id)) errors.push('ID must be in YYYY-NNNN format (e.g., 2025-0001).')
  if (!draft.firstName || !NAME_REGEX.test(draft.firstName)) errors.push('First Name must contain letters only.')
  if (!draft.lastName || !NAME_REGEX.test(draft.lastName)) errors.push('Last Name must contain letters only.')
  if (!draft.yearLevel) errors.push('Year Level is required.')
  if (!draft.gender) errors.push('Gender is required.')
  if (!draft.college) errors.push('College is required.')
  if (!draft.program) errors.push('Program is required.')
  return errors
}

function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  if (a === b) return 0
  const res = a! < b! ? -1 : 1
  return dir === 'asc' ? res : -res
}

export default function Students() {
  const [collegesToPrograms] = useState<Record<string, string[]>>(initialCollegesToPrograms)
  const [students, setStudents] = useState<Student[]>([])

  const [draft, setDraft] = useState<Partial<Student>>({
    id: '',
    firstName: '',
    lastName: '',
    yearLevel: undefined,
    gender: undefined,
    college: '',
    program: '',
  })
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  const [searchField, setSearchField] = useState<SortKey>('id')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCollege, setFilterCollege] = useState('')
  const [filterProgram, setFilterProgram] = useState('')

  const [sortKey, setSortKey] = useState<SortKey>('id')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const collegeOptions = useMemo(() => Object.keys(collegesToPrograms).sort(), [collegesToPrograms])
  const programOptions = useMemo(() => {
    if (!draft.college) return []
    const options = collegesToPrograms[draft.college] || []
    return [...options].sort()
  }, [collegesToPrograms, draft.college])

  const prevCollegeRef = useRef<string | null>(null)
  useEffect(() => {
    if (draft.college !== prevCollegeRef.current) {
      setDraft(prev => ({ ...prev, program: '' }))
      prevCollegeRef.current = draft.college || null
    }
  }, [draft.college])

  const processedStudents = useMemo(() => {
    const filtered = students.filter(s => {
      if (searchQuery) {
        const value = String(s[searchField] ?? '').toLowerCase()
        if (!value.includes(searchQuery.toLowerCase())) return false
      }
      if (filterCollege && s.college !== filterCollege) return false
      if (filterProgram && s.program !== filterProgram) return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
    return sorted
  }, [students, searchQuery, searchField, filterCollege, filterProgram, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processedStudents.length / PAGE_SIZE))
  const pageClamped = Math.min(Math.max(1, page), totalPages)
  const paginated = processedStudents.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  useEffect(() => {
    if (page !== pageClamped) setPage(pageClamped)
  }, [pageClamped])

  function handleSelectRow(indexOnPage: number) {
    const absoluteIndex = (pageClamped - 1) * PAGE_SIZE + indexOnPage
    const s = processedStudents[absoluteIndex]
    if (!s) return
    setSelectedRowIndex(absoluteIndex)
    setDraft({ ...s })
  }

  function clearForm() {
    setSelectedRowIndex(null)
    setDraft({ id: '', firstName: '', lastName: '', yearLevel: undefined, gender: undefined, college: '', program: '' })
  }

  function onAdd() {
    const errors = validateStudentDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    if (students.some(s => s.id === draft.id)) {
      alert('A student with this ID already exists.')
      return
    }
    setStudents(prev => [...prev, draft as Student])
    clearForm()
  }

  function onUpdate() {
    if (selectedRowIndex === null) {
      alert('Select a student row to update.')
      return
    }
    const errors = validateStudentDraft(draft)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    setStudents(prev => prev.map((s, i) => (i === selectedRowIndex ? (draft as Student) : s)))
    clearForm()
  }

  function onDelete() {
    if (selectedRowIndex === null) {
      alert('Select a student row to delete.')
      return
    }
    if (!confirm('Are you sure you want to delete this student?')) return
    setStudents(prev => prev.filter((_, i) => i !== selectedRowIndex))
    clearForm()
  }

  function onRefresh() {
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const canSubmit = validateStudentDraft(draft).length === 0

  const leftColRef = useRef<HTMLDivElement | null>(null)
  const [tableMaxHeight, setTableMaxHeight] = useState<number | null>(null)

  useEffect(() => {
    function syncHeights() {
      const h = leftColRef.current?.offsetHeight
      if (h && h > 200) setTableMaxHeight(h)
    }
    syncHeights()
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [draft, searchField, searchQuery, filterCollege, filterProgram, paginated.length])

  return (
    <div>
      <h2 className="mb-3">Students</h2>

      <div className="row g-3 align-items-stretch">
        
        <div className="col-12 col-lg-4" ref={leftColRef}>
          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-12">
                  <label className="form-label">Search by</label>
                  <div className="input-group">
                    <select className="form-select" style={{ maxWidth: 180 }} value={searchField} onChange={e => setSearchField(e.target.value as SortKey)}>
                      <option value="id">ID</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                      <option value="yearLevel">Year</option>
                      <option value="gender">Gender</option>
                      <option value="college">College</option>
                      <option value="program">Program</option>
                    </select>
                    <input className="form-control" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label">Filter College</label>
                  <select className="form-select" value={filterCollege} onChange={e => { setFilterCollege(e.target.value); setFilterProgram('') }}>
                    <option value="">All</option>
                    {collegeOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Filter Program</label>
                  <select className="form-select" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} disabled={!filterCollege}>
                    <option value="">All</option>
                    {(filterCollege ? collegesToPrograms[filterCollege] : []).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          
          <div className="card frosted-glass mb-3">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">ID (YYYY-NNNN)</label>
                  <input className="form-control" value={draft.id || ''} onChange={e => setDraft(prev => ({ ...prev, id: e.target.value }))}/>
                </div>
                <div className="col-12">
                  <label className="form-label">First Name</label>
                  <input className="form-control" value={draft.firstName || ''} onChange={e => setDraft(prev => ({ ...prev, firstName: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label">Last Name</label>
                  <input className="form-control" value={draft.lastName || ''} onChange={e => setDraft(prev => ({ ...prev, lastName: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label">Year Level</label>
                  <select className="form-select" value={draft.yearLevel || ''} onChange={e => setDraft(prev => ({ ...prev, yearLevel: Number(e.target.value) as 1 | 2 | 3 | 4 }))}>
                    <option value="">Select</option>
                    {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={draft.gender || ''} onChange={e => setDraft(prev => ({ ...prev, gender: e.target.value as Gender }))}>
                    <option value="">Select</option>
                    {(['Male','Female'] as Gender[]).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">College</label>
                  <select className="form-select" value={draft.college || ''} onChange={e => setDraft(prev => ({ ...prev, college: e.target.value }))}>
                    <option value="">Select</option>
                    {collegeOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Program</label>
                  <select className="form-select" value={draft.program || ''} onChange={e => setDraft(prev => ({ ...prev, program: e.target.value }))} disabled={!draft.college}>
                    <option value="">{draft.college ? 'Select' : 'Select College first'}</option>
                    {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={onAdd} disabled={!canSubmit}>Add</button>
                  <button className="btn btn-warning" onClick={onUpdate} disabled={selectedRowIndex === null || !canSubmit}>Update</button>
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
                <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 2 }}>
                  <tr>
                    {(['id','firstName','lastName','yearLevel','gender','college','program'] as SortKey[]).map(col => (
                      <th key={col} role="button" onClick={() => toggleSort(col)}>
                        <div className="d-flex align-items-center">
                          <span className="me-1 text-capitalize">
                            {col === 'id' ? 'ID' : col === 'firstName' ? 'First Name' : col === 'lastName' ? 'Last Name' : col === 'yearLevel' ? 'Year' : col}
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
                  {paginated.map((s, idx) => (
                    <tr key={s.id} className={selectedRowIndex === ((pageClamped - 1) * PAGE_SIZE + idx) ? 'table-primary' : ''} onClick={() => handleSelectRow(idx)} style={{ cursor: 'pointer' }}>
                      <td>{s.id}</td>
                      <td>{s.firstName}</td>
                      <td>{s.lastName}</td>
                      <td>{s.yearLevel}</td>
                      <td>{s.gender}</td>
                      <td>{s.college}</td>
                      <td>{s.program}</td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">No students to display.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <div>Showing {paginated.length} of {processedStudents.length} students</div>
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
