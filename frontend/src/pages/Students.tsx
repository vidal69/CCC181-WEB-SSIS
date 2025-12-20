import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { listStudents, createStudent, updateStudent, deleteStudent, uploadAvatarFile, getAvatarUrl, deleteAvatar } from '../api/students'
import { listColleges } from '../api/colleges'
import { listPrograms } from '../api/programs'

type Gender = 'Male' | 'Female'

// Update Student type to match API structure
type Student = {
    id: string
    firstName: string
    lastName: string
    yearLevel: number
    gender: Gender
    college: string  // This should be college CODE, not name
    program: string  // This should be program CODE, not name
    photoPath?: string | null
}

type College = {
    collegeCode: string
    collegeName: string
}

type Program = {
    programCode: string
    programName: string
    collegeCode: string
}

type SortKey = keyof Pick<Student, 'id' | 'firstName' | 'lastName' | 'yearLevel' | 'gender' | 'college' | 'program'>
type SortDirection = 'asc' | 'desc'

const ID_REGEX = /^\d{4}-\d{4}$/
const NAME_REGEX = /^[A-Za-z\s'-]+$/
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

// Add avatar file validation function
function validateAvatarFile(file: File): string | null {
    // File size validation (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        return 'File size exceeds 5MB limit. Please select a smaller image.';
    }
    
    // File type validation - allow common image types only
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return 'Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed. PDF and other document formats are not supported.';
    }
    
    return null;
}

// Update the form validation to include photo requirement
function validateStudentDraft(draft: Partial<Student>, isCreation: boolean = false, selectedFile: File | null = null): string[] {
    const errors: string[] = []
    if (!draft.id || !ID_REGEX.test(draft.id)) errors.push('ID must be in YYYY-NNNN format (e.g., 2025-0001).')
    if (!draft.firstName || !NAME_REGEX.test(draft.firstName)) errors.push('First Name must contain letters only.')
    if (!draft.lastName || !NAME_REGEX.test(draft.lastName)) errors.push('Last Name must contain letters only.')
    if (!draft.yearLevel || draft.yearLevel < 1 || draft.yearLevel > 4) errors.push('Year Level must be 1-4.')
    if (!draft.gender) errors.push('Gender is required.')
    if (!draft.college) errors.push('College is required.')
    if (!draft.program) errors.push('Program is required.')
    
    // Only require photo for creation, not for updates
    if (isCreation) {
        if (!selectedFile) {
            errors.push('A photo is required to create a student.')
        } else {
            // Validate the photo file
            const photoValidationError = validateAvatarFile(selectedFile)
            if (photoValidationError) {
                errors.push(`Photo: ${photoValidationError}`)
            }
        }
    } else if (selectedFile) {
        // For updates, validate photo if selected (optional)
        const photoValidationError = validateAvatarFile(selectedFile)
        if (photoValidationError) {
            errors.push(`Photo: ${photoValidationError}`)
        }
    }
    
    return errors
}

// utils/photoUrlHelper.ts

export function buildPhotoUrl(
    photoPath: string | null | undefined, 
    bucketName: string = 'ssis_web_bucket'
): string {
    if (!photoPath) {
        console.log('No photo path provided, returning empty string.');
        return "";
    }
    
    try {
        const supabaseUrl = "https://oqqrwmdagqrtkqbfxnlt.supabase.co";
        
        const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;

        let finalPath: string;
        if (cleanPath.startsWith(`${bucketName}/`)) {
            finalPath = cleanPath;
        } else {
            finalPath = `${bucketName}/${cleanPath}`;
        }

        const url = `${supabaseUrl}/storage/v1/object/public/${finalPath}`;
        console.log('Built photo URL:', url);
        
        return url;
    } catch (error) {
        console.error('Error building photo URL:', error);
        return "";
    }
}

export function isValidPhotoUrl(url: string | null): boolean {
    return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

// Default avatar icon (base64 encoded simple icon)
const DEFAULT_AVATAR_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='%236c757d' viewBox='0 0 16 16'%3E%3Cpath d='M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'/%3E%3Cpath fill-rule='evenodd' d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z'/%3E%3C/svg%3E";

export default function Students() {
    const [colleges, setColleges] = useState<College[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [meta, setMeta] = useState<{ page: number; per_page: number; total: number } | null>(null)

    // Keep track of display names for UI
    const [collegeDisplayNames, setCollegeDisplayNames] = useState<Record<string, string>>({})
    const [programDisplayNames, setProgramDisplayNames] = useState<Record<string, string>>({})

    const [draft, setDraft] = useState<Partial<Student>>({
        id: '',
        firstName: '',
        lastName: '',
        yearLevel: undefined,
        gender: undefined,
        college: '',
        program: '',
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const [searchField, setSearchField] = useState<SortKey>('id')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCollege, setFilterCollege] = useState('')
    const [filterProgram, setFilterProgram] = useState('')
    // New filter states
    const [filterGender, setFilterGender] = useState<string>('')
    const [filterYearLevel, setFilterYearLevel] = useState<string>('')

    const [sortKey, setSortKey] = useState<SortKey>('id')
    const [sortDir, setSortDir] = useState<SortDirection>('asc')
    const [page, setPage] = useState(1)

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
    
    // Edit form state
    const [editDraft, setEditDraft] = useState<Partial<Student>>({})
    const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null)

    // File input ref to clear it
    const fileInputRef = useRef<HTMLInputElement>(null)
    const editFileInputRef = useRef<HTMLInputElement>(null)

    // Load colleges and programs from API
    useEffect(() => {
        async function loadCollegesAndPrograms() {
            try {
                // Load colleges
                const collegesResp = await listColleges({ page_size: 1000 })
                const collegesList = collegesResp.data
                setColleges(collegesList)

                // Create mapping of college codes to names for display
                const collegeNameMap: Record<string, string> = {}
                collegesList.forEach(college => {
                    collegeNameMap[college.collegeCode] = college.collegeName
                })
                setCollegeDisplayNames(collegeNameMap)

                // Load programs
                const programsResp = await listPrograms({ page_size: 1000 })
                const programsList = programsResp.data
                setPrograms(programsList)

                // Create mapping of program codes to names for display
                const programNameMap: Record<string, string> = {}
                programsList.forEach(program => {
                    programNameMap[program.programCode] = program.programName
                })
                setProgramDisplayNames(programNameMap)

            } catch (err) {
                console.error('Failed to load colleges/programs', err)
                const error = err as ApiError
                alert(error?.message || 'Failed to load colleges and programs')
            }
        }
        
        loadCollegesAndPrograms()
    }, [])

    // Create a map of program codes to their college codes
    const programToCollegeMap = useMemo(() => {
        const map: Record<string, string> = {}
        programs.forEach(program => {
            map[program.programCode] = program.collegeCode
        })
        return map
    }, [programs])

    // College options for dropdown (using names for display)
    const collegeOptions = useMemo(() => 
        colleges.map(c => ({
            code: c.collegeCode,
            name: c.collegeName
        })).sort((a, b) => a.name.localeCompare(b.name)), 
        [colleges]
    )
    
    // Program options for dropdown based on selected college
    const programOptions = useMemo(() => {
        if (!draft.college) return []
        
        const options = programs
            .filter(p => p.collegeCode === draft.college)
            .map(p => ({
                code: p.programCode,
                name: p.programName
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        
        return options
    }, [programs, draft.college])

    // Program options for edit modal based on selected college
    const editProgramOptions = useMemo(() => {
        if (!editDraft.college) return []
        
        const options = programs
            .filter(p => p.collegeCode === editDraft.college)
            .map(p => ({
                code: p.programCode,
                name: p.programName
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        
        return options
    }, [programs, editDraft.college])

    // For filter dropdowns
    const filterCollegeOptions = useMemo(() => 
        [{ code: '', name: 'All' }, ...collegeOptions], 
        [collegeOptions]
    )
    
    const filterProgramOptions = useMemo(() => {
        if (!filterCollege) return [{ code: '', name: 'All' }]
        
        const options = programs
            .filter(p => p.collegeCode === filterCollege)
            .map(p => ({
                code: p.programCode,
                name: p.programName
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        
        return [{ code: '', name: 'All' }, ...options]
    }, [programs, filterCollege])

    // Gender filter options
    const genderOptions = useMemo(() => [
        { value: '', label: 'All Gender' },
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Other', label: 'Other' }
    ], [])

    // Year level filter options
    const yearLevelOptions = useMemo(() => [
        { value: '', label: 'All Year Levels' },
        { value: '1', label: '1st Years' },
        { value: '2', label: '2nd Years' },
        { value: '3', label: '3rd Years' },
        { value: '4', label: '4th Years' },
        { value: '5', label: '5th Years' }
    ], [])

    // Server-driven listing
    const totalPages = Math.max(1, Math.ceil((meta?.total || 0) / PAGE_SIZE))
    const pageClamped = Math.min(Math.max(1, page), totalPages)

    // Map frontend sort/search fields to server column names
    const fieldToServer: Record<string, string> = {
        id: 'id_number',
        firstName: 'first_name',
        lastName: 'last_name',
        yearLevel: 'year_level',
        gender: 'gender',
        college: 'college_code',
        program: 'program_code',
    }

    // Function to refresh student list
    const refreshStudentList = useCallback(async () => {
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
                params.college_code = filterCollege;
            }
            if (filterProgram) {
                params.program_code = filterProgram;
            }
            // Add new filter parameters
            if (filterGender) {
                params.gender = filterGender.toUpperCase();
            }
            if (filterYearLevel) {
                params.year_level = filterYearLevel;
            }
            
            const res = await listStudents(params)
            
            // DEBUG: Log the raw API response
            console.log('Raw API response:', res.data)
            
            // The API response from listStudents is already converted to camelCase
            const studentList: Student[] = res.data.map((s: any) => {
                console.log('Mapping student:', s)
                // Get the college code from the program code
                const programCode = s.program || s.programCode || ''
                const collegeCode = programToCollegeMap[programCode] || s.college || ''
                
                return {
                    id: s.id,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    yearLevel: s.yearLevel,
                    gender: (s.gender === 'MALE' || s.gender === 'male' ? 'Male' : 
                            s.gender === 'FEMALE' || s.gender === 'female' ? 'Female' : 
                            s.gender) as Gender,
                    college: collegeCode,
                    program: programCode,
                    photoPath: s.photoPath  // This should contain the path from Supabase
                }
            })
            
            console.log('Mapped student list:', studentList)
            
            setStudents(studentList)
            setMeta(res.meta)
            
        } catch (err) {
            console.error('Failed to list students', err)
            const error = err as ApiError
            alert(error?.message || 'Failed to load students')
        }
    }, [pageClamped, sortKey, sortDir, searchField, searchQuery, filterCollege, filterProgram, filterGender, filterYearLevel, programToCollegeMap])

    const getAvatarUrlDirect = useCallback((student: Student) => {
        if (!student.photoPath) return null;
        return buildPhotoUrl(student.photoPath);
    }, []);

    // Fetch list from server whenever relevant params change
    useEffect(() => {
        // Only fetch students if colleges and programs are loaded
        if (colleges.length > 0 && programs.length > 0) {
            refreshStudentList()
        }
    }, [page, sortKey, sortDir, searchField, searchQuery, filterCollege, filterProgram, filterGender, filterYearLevel, colleges.length, programs.length, refreshStudentList])

    // Helper function to clear file input
    const clearFileInput = () => {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Helper function to clear edit file input
    const clearEditFileInput = () => {
        setEditSelectedFile(null)
        if (editFileInputRef.current) {
            editFileInputRef.current.value = ''
        }
    }

    // Update the handleAvatarUpload function to work with your Vue approach
    async function handleAvatarUpload(studentId: string, file: File): Promise<boolean> {
        if (!file) return false
        
        try {
            setIsUploading(true)
            
            // Note: Validation is already done before calling this function
            
            await uploadAvatarFile(studentId, file)
            
            // After upload, refresh to get the new photoPath
            await refreshStudentList()
            
            return true
        } catch (err: unknown) {
            const error = err as ApiError
            const errorMessage = error?.message || 'Failed to upload avatar'
            alert(`Avatar upload failed: ${errorMessage}`)
            return false
        } finally {
            setIsUploading(false)
        }
    }

    // Function to open edit modal
    const handleEditClick = (student: Student) => {
        setStudentToEdit(student)
        setEditDraft({ ...student })
        setEditSelectedFile(null)
        setShowEditModal(true)
    }

    // Function to open delete modal
    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student)
        setShowDeleteModal(true)
    }

    // Function to close edit modal
    const closeEditModal = () => {
        setShowEditModal(false)
        setStudentToEdit(null)
        setEditDraft({})
        setEditSelectedFile(null)
        clearEditFileInput()
    }

    // Function to close delete modal
    const closeDeleteModal = () => {
        setShowDeleteModal(false)
        setStudentToDelete(null)
    }

    async function onAdd() {
        const errors = validateStudentDraft(draft, true, selectedFile) // Pass true for creation AND selectedFile
        if (errors.length) {
            alert(errors.join('\n'))
            return
        }
        
        try {
            // Create student object with proper college/program CODES
            const studentToCreate = {
                id: draft.id!,
                firstName: draft.firstName!,
                lastName: draft.lastName!,
                yearLevel: Number(draft.yearLevel!),
                gender: draft.gender!,
                college: draft.college!,  // college CODE
                program: draft.program!   // program CODE
            }
            
            // First create the student
            await createStudent(studentToCreate)
            
            // Upload avatar (required for creation)
            const uploadSuccess = await handleAvatarUpload(draft.id!, selectedFile!)
            if (!uploadSuccess) {
                // If avatar upload fails, delete the student that was created
                try {
                    await deleteStudent(draft.id!)
                    alert('Student creation failed: Avatar upload failed. Student record deleted.')
                } catch (deleteErr) {
                    alert('Student creation failed: Avatar upload failed. Student record was created but avatar upload failed.')
                }
                return
            }
            
            alert('Student created successfully!')
            
            // Refresh the list
            await refreshStudentList()
            clearForm()
            clearFileInput() // Clear the file input after adding
            
        } catch (err: unknown) {
            const error = err as ApiError
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create student'
            alert(errorMessage)
            console.error('Create student error:', err)
        }
    }

    async function onEdit() {
        if (!studentToEdit) return;
        
        // For updates, pass false for isCreation AND selectedFile
        const errors = validateStudentDraft(editDraft, false, editSelectedFile)
        if (errors.length) {
            alert(errors.join('\n'))
            return
        }
        
        try {
            console.log('Original student:', studentToEdit)
            console.log('Draft updates:', editDraft)
            
            // Prepare update payload - only include changed fields
            const updates: Partial<Student> = {}
            if (editDraft.id && editDraft.id !== studentToEdit.id) updates.id = editDraft.id
            if (editDraft.firstName && editDraft.firstName !== studentToEdit.firstName) updates.firstName = editDraft.firstName
            if (editDraft.lastName && editDraft.lastName !== studentToEdit.lastName) updates.lastName = editDraft.lastName
            if (editDraft.yearLevel !== undefined && editDraft.yearLevel !== studentToEdit.yearLevel) updates.yearLevel = Number(editDraft.yearLevel)
            if (editDraft.gender && editDraft.gender !== studentToEdit.gender) updates.gender = editDraft.gender
            if (editDraft.college && editDraft.college !== studentToEdit.college) {
                console.log('College changed from', studentToEdit.college, 'to', editDraft.college)
                updates.college = editDraft.college
            }
            if (editDraft.program && editDraft.program !== studentToEdit.program) {
                console.log('Program changed from', studentToEdit.program, 'to', editDraft.program)
                updates.program = editDraft.program
            }
            
            console.log('Updates to send:', updates)
            
            if (Object.keys(updates).length === 0 && !editSelectedFile) {
                alert('No changes to update')
                return
            }
            
            // Update student data if there are changes
            if (Object.keys(updates).length > 0) {
                await updateStudent(studentToEdit.id, updates)
            }
            
            // Upload avatar if a new file was selected
            if (editSelectedFile) {
                const uploadSuccess = await handleAvatarUpload(studentToEdit.id, editSelectedFile)
                if (!uploadSuccess) {
                    // If avatar upload fails and we updated the student data,
                    // we should notify the user that data was updated but avatar failed
                    if (Object.keys(updates).length > 0) {
                        alert('Student data updated but avatar upload failed')
                    } else {
                        alert('Avatar upload failed')
                    }
                    // Still refresh to show any successful updates
                    await refreshStudentList()
                    return
                }
            }
            
            alert('Student updated successfully!')
            
            // Refresh the list
            await refreshStudentList()
            closeEditModal()
            
        } catch (err: unknown) {
            const error = err as ApiError
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update student'
            alert(errorMessage)
            console.error('Update student error:', err)
        }
    }

    async function onDelete() {
        if (!studentToDelete) return;
        
        try {
            await deleteStudent(studentToDelete.id)
            alert('Student deleted successfully!')
            
            // Refresh the list
            await refreshStudentList()
            closeDeleteModal()
            
        } catch (err: unknown) {
            const error = err as ApiError
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete student'
            alert(errorMessage)
            console.error('Delete student error:', err)
        }
    }

    // Update the onRemoveAvatar function for edit modal
    async function onRemoveAvatar() {
        if (!studentToEdit) return;
        
        if (!studentToEdit.photoPath) {
            alert('This student does not have an avatar.')
            return
        }
        
        if (!confirm('Are you sure you want to remove this student\'s avatar?')) return
        
        try {
            await deleteAvatar(studentToEdit.id)
            alert('Avatar removed successfully!')
            
            // Refresh to update the photoPath
            await refreshStudentList()
            
        } catch (err: unknown) {
            const error = err as ApiError
            const errorMessage = error?.message || 'Failed to remove avatar'
            alert(`Failed to remove avatar: ${errorMessage}`)
        }
    }

    function clearForm() {
        setDraft({ id: '', firstName: '', lastName: '', yearLevel: undefined, gender: undefined, college: '', program: '' })
        setSelectedFile(null)
        // Clear the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    function onRefresh() {
        refreshStudentList()
    }

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
        else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    // Update the canSubmit calculation to include the photo validation
    const canSubmit = validateStudentDraft(draft, true, selectedFile).length === 0
    
    // Can submit edit form
    const canSubmitEdit = validateStudentDraft(editDraft, false, editSelectedFile).length === 0

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
    }, [draft, searchField, searchQuery, filterCollege, filterProgram, students.length])

    // Filter students based on college and program filters
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (filterCollege && s.college !== filterCollege) return false;
            if (filterProgram && s.program !== filterProgram) return false;
            return true;
        });
    }, [students, filterCollege, filterProgram]);

    // Get current avatar URL for edit modal
    const editAvatarUrl = studentToEdit?.photoPath ? buildPhotoUrl(studentToEdit.photoPath) : null;

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
                                            <option value="college">College Code</option>
                                            <option value="program">Program Code</option>
                                        </select>
                                        <input className="form-control" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                                            placeholder={searchField === 'program' ? 'Search by Program Code (e.g., BSCS)' : ''} />
                                    </div>
                                    {searchField === 'program' && (
                                        <div className="form-text small mt-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Search by program code (e.g., BSCS, BSIT)
                                        </div>
                                    )}
                                </div>
                                
                                {/* New Filter Dropdowns */}
                                <div className="col-12">
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label">Gender</label>
                                            <select 
                                                className="form-select" 
                                                value={filterGender} 
                                                onChange={e => setFilterGender(e.target.value)}
                                            >
                                                {genderOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Year Level</label>
                                            <select 
                                                className="form-select" 
                                                value={filterYearLevel} 
                                                onChange={e => setFilterYearLevel(e.target.value)}
                                            >
                                                {yearLevelOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Existing College/Program Filters */}
                                <div className="col-6">
                                    <label className="form-label">Filter College</label>
                                    <select className="form-select" value={filterCollege} onChange={e => { setFilterCollege(e.target.value); setFilterProgram('') }}>
                                        {filterCollegeOptions.map(option => 
                                            <option key={option.code} value={option.code}>{option.name}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Filter Program</label>
                                    <select className="form-select" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} disabled={!filterCollege}>
                                        {filterProgramOptions.map(option => 
                                            <option key={option.code} value={option.code}>{option.name}</option>
                                        )}
                                    </select>
                                </div>
                                
                                {/* Clear Filters Button */}
                                {(filterGender || filterYearLevel || filterCollege || filterProgram) && (
                                    <div className="col-12">
                                        <button 
                                            className="btn btn-outline-secondary btn-sm w-100"
                                            onClick={() => {
                                                setFilterGender('')
                                                setFilterYearLevel('')
                                                setFilterCollege('')
                                                setFilterProgram('')
                                            }}
                                        >
                                            <i className="bi bi-x-circle me-1"></i>
                                            Clear All Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    
                    <div className="card frosted-glass mb-3">
                        <div className="card-body">
                            <h5 className="card-title mb-3">Add New Student</h5>
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
                                    <select className="form-select" value={draft.yearLevel || ''} onChange={e => setDraft(prev => ({ ...prev, yearLevel: Number(e.target.value) }))}>
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
                                        {collegeOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                    {draft.college && (
                                        <div className="form-text small">
                                            Selected: {collegeDisplayNames[draft.college] || draft.college}
                                        </div>
                                    )}
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Program</label>
                                    <select className="form-select" value={draft.program || ''} onChange={e => setDraft(prev => ({ ...prev, program: e.target.value }))} disabled={!draft.college}>
                                        <option value="">{draft.college ? 'Select' : 'Select College first'}</option>
                                        {programOptions.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                                    </select>
                                    {draft.program && (
                                        <div className="form-text small">
                                            Selected: {programDisplayNames[draft.program] || draft.program}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Avatar Section */}
                                <div className="col-12">
                                    <label className="form-label">Avatar</label>
                                    
                                    {/* Avatar upload for new student */}
                                    <div className="mb-3">
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*" 
                                            className="form-control" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null
                                                if (file) {
                                                    // Validate file before setting it
                                                    const validationError = validateAvatarFile(file)
                                                    if (validationError) {
                                                        alert(validationError)
                                                        // Clear the file input
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = ''
                                                        }
                                                        setSelectedFile(null)
                                                        return
                                                    }
                                                }
                                                setSelectedFile(file)
                                            }}
                                            disabled={isUploading}
                                        />
                                        <div className="form-text">
                                            Select an image to add as avatar (required for new students)
                                        </div>
                                        
                                        {selectedFile && (
                                            <div className="mt-2 p-2 bg-light rounded">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-file-earmark-image text-primary"></i>
                                                    <span className="small">{selectedFile.name}</span>
                                                    <span className="small text-muted">({Math.round(selectedFile.size / 1024)} KB)</span>
                                                    <button 
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary ms-auto"
                                                        onClick={clearFileInput}
                                                    >
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!selectedFile && (
                                            <div className="mt-2 p-2 bg-light rounded text-muted small">
                                                <i className="bi bi-info-circle me-1"></i>
                                                Avatar is <strong>required</strong> for new students. Please select an image.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="col-12 d-flex gap-2 flex-wrap">
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={onAdd} 
                                        disabled={!canSubmit || isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Adding...
                                            </>
                                        ) : 'Add'}
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary" 
                                        onClick={clearForm}
                                        disabled={isUploading}
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        className="btn btn-outline-success" 
                                        onClick={onRefresh}
                                        disabled={isUploading}
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
                                <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 2 }}>
                                    <tr>
                                        <th>Photo</th>
                                        {(['id','firstName','lastName','yearLevel','gender','college','program'] as SortKey[]).map(col => (
                                            <th key={col} role="button" onClick={() => toggleSort(col)}>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-1 text-capitalize">
                                                        {col === 'id' ? 'ID' : 
                                                         col === 'firstName' ? 'First Name' : 
                                                         col === 'lastName' ? 'Last Name' : 
                                                         col === 'yearLevel' ? 'Year' : 
                                                         col === 'gender' ? 'Gender' :
                                                         col === 'college' ? 'College Code' :
                                                         'Program Code'}
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
                                    {filteredStudents.map((s, idx) => {
                                        return (
                                            <tr key={s.id} style={{ cursor: 'pointer' }}>
                                                <td style={{ width: 64 }}>
                                                    <div className="position-relative">
                                                        {s.photoPath ? (
                                                            <>
                                                                <img 
                                                                    src={buildPhotoUrl(s.photoPath)} 
                                                                    alt="avatar" 
                                                                    style={{ 
                                                                        width: 40, 
                                                                        height: 40, 
                                                                        objectFit: 'cover', 
                                                                        borderRadius: 6 
                                                                    }} 
                                                                />
                                                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success" style={{ fontSize: '0.5rem' }}>
                                                                    <i className="bi bi-image"></i>
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <div 
                                                                style={{ 
                                                                    width: 40, 
                                                                    height: 40, 
                                                                    background: '#f1f3f5', 
                                                                    borderRadius: 6,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                                title="No avatar"
                                                            >
                                                                {/* Use base64 encoded icon instead of fetching */}
                                                                <img 
                                                                    src={DEFAULT_AVATAR_ICON}
                                                                    alt="Default avatar"
                                                                    style={{ width: 24, height: 24, opacity: 0.5 }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{s.id}</td>
                                                <td>{s.firstName}</td>
                                                <td>{s.lastName}</td>
                                                <td>{s.yearLevel}</td>
                                                <td>{s.gender}</td>
                                                {/* Show College Code and Program Code instead of names */}
                                                <td>{s.college}</td>
                                                <td>{s.program}</td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <button 
                                                            className="btn btn-sm btn-outline-warning"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(s);
                                                            }}
                                                            title="Edit student"
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
                                                                handleDeleteClick(s);
                                                            }}
                                                            title="Delete student"
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
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4">
                                                <i className="bi bi-people display-6 d-block mb-2"></i>
                                                No students to display.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        
                        <div className="d-flex align-items-center justify-content-between p-3 border-top">
                            <div>Showing {filteredStudents.length} of {meta?.total || 0} students</div>
                            <div className="d-flex align-items-center gap-2">
                                <button 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                                    disabled={pageClamped === 1 || isUploading}
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
                                    disabled={isUploading}
                                />
                                <span>of {totalPages}</span>
                                <button 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={pageClamped === totalPages || isUploading}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Student Modal */}
            {showEditModal && studentToEdit && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Student: {studentToEdit.firstName} {studentToEdit.lastName}</h5>
                                <button type="button" className="btn-close" onClick={closeEditModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label">ID (YYYY-NNNN)</label>
                                        <input 
                                            className="form-control" 
                                            value={editDraft.id || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, id: e.target.value }))}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">First Name</label>
                                        <input 
                                            className="form-control" 
                                            value={editDraft.firstName || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, firstName: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Last Name</label>
                                        <input 
                                            className="form-control" 
                                            value={editDraft.lastName || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, lastName: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Year Level</label>
                                        <select 
                                            className="form-select" 
                                            value={editDraft.yearLevel || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, yearLevel: Number(e.target.value) }))}
                                        >
                                            <option value="">Select</option>
                                            {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Gender</label>
                                        <select 
                                            className="form-select" 
                                            value={editDraft.gender || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, gender: e.target.value as Gender }))}
                                        >
                                            <option value="">Select</option>
                                            {(['Male','Female'] as Gender[]).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">College</label>
                                        <select 
                                            className="form-select" 
                                            value={editDraft.college || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, college: e.target.value }))}
                                        >
                                            <option value="">Select</option>
                                            {collegeOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                        {editDraft.college && (
                                            <div className="form-text small">
                                                Selected: {collegeDisplayNames[editDraft.college] || editDraft.college}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label">Program</label>
                                        <select 
                                            className="form-select" 
                                            value={editDraft.program || ''} 
                                            onChange={e => setEditDraft(prev => ({ ...prev, program: e.target.value }))} 
                                            disabled={!editDraft.college}
                                        >
                                            <option value="">{editDraft.college ? 'Select' : 'Select College first'}</option>
                                            {editProgramOptions.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                                        </select>
                                        {editDraft.program && (
                                            <div className="form-text small">
                                                Selected: {programDisplayNames[editDraft.program] || editDraft.program}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Avatar Section for Edit Modal */}
                                    <div className="col-12">
                                        <label className="form-label">Avatar</label>
                                        
                                        {/* Show current avatar */}
                                        {editAvatarUrl && (
                                            <div className="mb-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <img 
                                                        src={editAvatarUrl} 
                                                        alt="Current avatar" 
                                                        style={{ 
                                                            width: 60, 
                                                            height: 60, 
                                                            objectFit: 'cover', 
                                                            borderRadius: 8,
                                                            border: '2px solid #ddd'
                                                        }} 
                                                    />
                                                    <div>
                                                        <div className="text-success small mb-1">
                                                            <i className="bi bi-check-circle-fill me-1"></i>
                                                            Has avatar
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={onRemoveAvatar}
                                                            disabled={isUploading}
                                                        >
                                                            <i className="bi bi-trash me-1"></i>
                                                            Remove Avatar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Avatar upload for editing */}
                                        <div className="mb-3">
                                            <input 
                                                ref={editFileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="form-control" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null
                                                    if (file) {
                                                        // Validate file before setting it
                                                        const validationError = validateAvatarFile(file)
                                                        if (validationError) {
                                                            alert(validationError)
                                                            // Clear the file input
                                                            if (editFileInputRef.current) {
                                                                editFileInputRef.current.value = ''
                                                            }
                                                            setEditSelectedFile(null)
                                                            return
                                                        }
                                                    }
                                                    setEditSelectedFile(file)
                                                }}
                                                disabled={isUploading}
                                            />
                                            <div className="form-text">
                                                Select a new image to replace current avatar (optional)
                                            </div>
                                            
                                            {editSelectedFile && (
                                                <div className="mt-2 p-2 bg-light rounded">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="bi bi-file-earmark-image text-primary"></i>
                                                        <span className="small">{editSelectedFile.name}</span>
                                                        <span className="small text-muted">({Math.round(editSelectedFile.size / 1024)} KB)</span>
                                                        <button 
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary ms-auto"
                                                            onClick={clearEditFileInput}
                                                        >
                                                            <i className="bi bi-x"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={closeEditModal}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-warning" 
                                    onClick={onEdit}
                                    disabled={!canSubmitEdit || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Updating...
                                        </>
                                    ) : 'Update Student'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && studentToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-danger">Confirm Deletion</h5>
                                <button type="button" className="btn-close" onClick={closeDeleteModal}></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    Are you sure you want to delete student <strong>{studentToDelete.firstName} {studentToDelete.lastName}</strong> (ID: {studentToDelete.id})?
                                </p>
                                <p className="text-danger">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    This action cannot be undone. This will also delete their avatar if it exists.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={closeDeleteModal}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-danger" 
                                    onClick={onDelete}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Deleting...
                                        </>
                                    ) : 'Delete Student'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}