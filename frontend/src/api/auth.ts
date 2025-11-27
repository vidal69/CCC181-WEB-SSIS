import { apiClient } from "./index";

export async function signup(username: string, email: string, password: string) {
    const resp = await apiClient.post("/auth/signup", { username, email, password });
    return resp.data.data;
}

export async function login(email: string, password: string) {
    const resp = await apiClient.post("/auth/login", { email, password });
    return resp.data.data;
}

export async function logout() {
    const resp = await apiClient.post("/auth/logout");
    return resp.data;
}

export async function getCurrentUser() {
    const resp = await apiClient.get("/auth/me");
    return resp.data.data;
}

export async function updateUser(data: { username?: string; password?: string }) {
    // Backend does not expose an /auth/update route currently.
    return Promise.reject(new Error('Not implemented on backend'))
}
