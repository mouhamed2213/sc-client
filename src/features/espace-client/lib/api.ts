// Appels vers l'API Node. VITE_API_URL = racine de l'API (ex. http://localhost:4000/api). Session = cookie httpOnly.
const BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status; }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path.replace(/^\/+/, '')}`, {
      method, credentials: 'include', signal,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (signal?.aborted) throw e; // requête annulée par TanStack Query : pas une erreur réseau
    throw new ApiError('network', 0);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data as { message?: string } | null)?.message ?? 'error', res.status);
  return data as T;
}

export const apiGet = <T,>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal);
export const apiPost = <T,>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
