const BASE = "https://gacha-server-yt5w.onrender.com/api";

export class ApiError extends Error {}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("identity_slot_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.error ?? `リクエストに失敗しました(${res.status})`
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: async <T>(path: string, data?: unknown) => {
    const result = await request<T & { token?: string }>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });

    // ログイン・登録時に返ってきたJWTを保存
    if (result.token) {
      localStorage.setItem("identity_slot_token", result.token);
    }

    return result as T;
  },
};