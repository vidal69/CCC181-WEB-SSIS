import { apiClient } from "./index";
import type { Student, Paginated } from "../types";

export async function listStudents(params: Record<string, any>): Promise<Paginated<Student>> {
    const resp = await apiClient.get("/students", { params });
    const payload = resp.data;
    // Map server-side snake_case to client-friendly camelCase
    const items = (payload.data || []).map((s: any) => ({
        id: s.id_number,
        firstName: s.first_name,
        lastName: s.last_name,
        yearLevel: s.year_level,
        gender: s.gender ? (s.gender[0] + s.gender.slice(1).toLowerCase()) : undefined,
        college: s.college_code || s.college || '',
        program: s.program_code || '',
        photoPath: s.photo_path || null,
    }))

    return {
        data: items,
        meta: payload.meta || { page: 1, per_page: params.page_size || 50, total: 0 }
    } as Paginated<Student>;
}

export async function getStudent(id_number: string) {
    const resp = await apiClient.get(`/students/${id_number}`);
    const payload = resp.data;
    // In some endpoints backend returns raw student object
    const s = payload.data || payload;
    return {
        id: s.id_number,
        firstName: s.first_name,
        lastName: s.last_name,
        yearLevel: s.year_level,
        gender: s.gender ? (s.gender[0] + s.gender.slice(1).toLowerCase()) : undefined,
        college: s.college_code || s.college || '',
        program: s.program_code || '',
        photoPath: s.photo_path || null,
    } as Student;
}

export async function createStudent(student: Student) {
    const payload = {
        id_number: student.id,
        first_name: student.firstName,
        last_name: student.lastName,
        year_level: student.yearLevel,
        gender: student.gender ? student.gender.toUpperCase() : undefined,
        program_code: student.program,
        photo_path: (student as any).photoPath || ''
    }
    const resp = await apiClient.post("/students", payload);
    return resp.data.data;
}

export async function updateStudent(id_number: string, updates: Partial<Student>) {
    const payload: any = {};
    if (updates.id) payload.id_number = updates.id;
    if (updates.firstName) payload.first_name = updates.firstName;
    if (updates.lastName) payload.last_name = updates.lastName;
    if (typeof updates.yearLevel !== 'undefined') payload.year_level = updates.yearLevel;
    if (updates.gender) payload.gender = updates.gender.toUpperCase();
    if (updates.program) payload.program_code = updates.program;
    if ((updates as any).photoPath !== undefined) payload.photo_path = (updates as any).photoPath;

    const resp = await apiClient.put(`/students/${id_number}`, payload);
    return resp.data.data;
}

export async function deleteStudent(id_number: string) {
    const resp = await apiClient.delete(`/students/${id_number}`);
    return resp.data;
}

export async function getPhotoUploadUrl(id_number: string, filename: string, content_type: string) {
    const { data } = await apiClient.post(`/students/${id_number}/avatar/photo-upload-url`, {
        filename,
        content_type,
    });

    return data; // { upload_url, avatar_path, expires_in }
}

export async function confirmAvatarUpload(id_number: string, avatar_path: string) {
    const resp = await apiClient.post(`/students/${id_number}/avatar/confirm`, {
        avatar_path,
    });

    // backend returns raw student object here
    return resp.data;
}

export async function getAvatarUrl(id_number: string) {
    const { data } = await apiClient.get(`/students/${id_number}/avatar/url`);
    // backend returns { avatar_url, expires_in }
    return data.avatar_url;
}

export async function deleteAvatar(id_number: string) {
    const { data } = await apiClient.delete(`/students/${id_number}/avatar`);
    return data;
}

// Helper: upload file bytes to signed URL then confirm with backend
export async function uploadAvatarFile(id_number: string, file: File) {
    const u = await getPhotoUploadUrl(id_number, file.name, file.type || 'image/jpeg');
    const uploadUrl = u.upload_url;
    const avatar_path = u.avatar_path;

    // upload with PUT
    await apiClient.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        // do not send cookies to the signed URL
        withCredentials: false as any,
    });

    // confirm
    const confirmed = await confirmAvatarUpload(id_number, avatar_path);
    return confirmed;
}