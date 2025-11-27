import { apiClient } from "./index";
import type { User, Paginated } from "../types";

export async function listUsers(params: Record<string, any>): Promise<Paginated<User>> {
    const resp = await apiClient.get("/users", { params });
    const payload = resp.data;
    return {
        data: payload.data || [],
        meta: payload.meta || { page: 1, per_page: params.page_size || 50, total: 0 }
    } as Paginated<User>;
}

export async function getUser(user_id: number): Promise<User> {
    const resp = await apiClient.get(`/users/${user_id}`);
    return resp.data.data as User;
}

export async function createUser(user: User) {
    const resp = await apiClient.post("/users", user);
    return resp.data.data;
}

export async function updateUser(user_id: number, updates: Partial<User>) {
    const resp = await apiClient.put(`/users/${user_id}`, updates);
    return resp.data.data;
}

export async function deleteUser(user_id: number) {
    const resp = await apiClient.delete(`/users/${user_id}`);
    return resp.data;
}
