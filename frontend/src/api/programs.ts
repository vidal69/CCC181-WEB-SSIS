import { apiClient } from "./index";
import type { Program, Paginated } from "../types";

function fromServer(p: any): Program {
    return {
        programCode: p.program_code,
        programName: p.program_name,
        collegeCode: p.college_code,
    } as Program
}

function toServer(p: Partial<Program>) {
    return {
        program_code: p.programCode,
        program_name: p.programName,
        college_code: p.collegeCode,
    }
}

export async function listPrograms(params: Record<string, any>): Promise<Paginated<Program>> {
    const resp = await apiClient.get("/programs", { params });
    const payload = resp.data;
    return {
        data: (payload.data || []).map(fromServer),
        meta: payload.meta || { page: 1, per_page: params.page_size || 50, total: 0 }
    } as Paginated<Program>;
}

export async function createProgram(program: Program) {
    const resp = await apiClient.post("/programs", toServer(program));
    return resp.data.data;
}

export async function updateProgram(program_code: string, updates: Partial<Program>) {
    const resp = await apiClient.put(`/programs/${program_code}`, toServer(updates));
    return resp.data.data;
}

export async function deleteProgram(program_code: string) {
    const resp = await apiClient.delete(`/programs/${program_code}`);
    return resp.data;
}
