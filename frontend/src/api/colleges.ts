import { apiClient } from "./index";
import type { College, Paginated } from "../types";

function fromServer(col: any): College {
    return {
        collegeCode: col.college_code,
        collegeName: col.college_name,
    } as College
}

function toServer(col: Partial<College>) {
    return {
        college_code: col.collegeCode,
        college_name: col.collegeName,
    }
}

export async function listColleges(params: Record<string, any>): Promise<Paginated<College>> {
    const resp = await apiClient.get("/colleges", { params });
    const payload = resp.data;
    return {
        data: (payload.data || []).map(fromServer),
        meta: payload.meta || { page: 1, per_page: params.page_size || 50, total: 0 }
    } as Paginated<College>;
}

export async function createCollege(college: College) {
    const resp = await apiClient.post("/colleges", toServer(college));
    return resp.data.data;
}

export async function updateCollege(college_code: string, updates: Partial<College>) {
    const resp = await apiClient.put(`/colleges/${college_code}`, toServer(updates));
    return resp.data.data;
}

export async function deleteCollege(college_code: string) {
    const resp = await apiClient.delete(`/colleges/${college_code}`);
    return resp.data;
}
