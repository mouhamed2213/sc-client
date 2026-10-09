import { API_URL } from '../data/auth';

/*
  Appels d'authentification vers l'API Node.
  - POST /api/auth/login    { email, password }                               → { user }
  - POST /api/auth/register { name, email, password, confirmPassword, website } → { user }
  La session vit dans un cookie httpOnly posé par le serveur (credentials: 'include') :
  aucun jeton n'est stocké dans le navigateur (ni localStorage, ni sessionStorage).
  En cas d'échec, le serveur répond { message } avec un code HTTP (401, 409, 422, 429…).
*/
export interface AuthUser { id: number; email: string; name: string | null; role: 'CLIENT' | 'ADMIN' }

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = 'AuthError'; this.status = status; }
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('network', 0); // réseau coupé, serveur injoignable ou CORS
  }
  const data = (await res.json().catch(() => ({}))) as { message?: string } & T;
  if (!res.ok) throw new AuthError(data.message || 'error', res.status);
  return data;
}

export const login = (p: { email: string; password: string }) => post<{ user: AuthUser }>('/api/auth/login', p);
export const register = (p: { name: string; email: string; password: string; confirmPassword: string; website: string }) =>
  post<{ user: AuthUser }>('/api/auth/register', p);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordRules = (pw: string) => ({ length: pw.length >= 8, letter: /[A-Za-z]/.test(pw), digit: /\d/.test(pw) });
export const passwordOk = (pw: string) => Object.values(passwordRules(pw)).every(Boolean);

/** Redirection interne uniquement (évite les « open redirect » via ?from=https://…). */
export const safePath = (p: unknown, fallback: string): string =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : fallback;
