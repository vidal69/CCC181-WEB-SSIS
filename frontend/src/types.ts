export type Paginated<T> = {
  data: T[]
  meta: { page: number; per_page: number; total: number }
}

export type User = {
  user_id: number
  username: string
  email: string
  role?: string
}

export type Student = {
  id: string
  firstName: string
  lastName: string
  yearLevel: number
  gender: 'Male' | 'Female' | string
  college: string
  program: string
  photoPath?: string | null
}

export type College = {
  collegeCode: string
  collegeName: string
}

export type Program = {
  programCode: string
  programName: string
  collegeCode: string
}
