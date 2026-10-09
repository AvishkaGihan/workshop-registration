export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

export async function api<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: data.message ?? "Something went wrong. Please try again.",
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        "We couldn't reach the server. Please check your connection and try again.",
    };
  }
}
