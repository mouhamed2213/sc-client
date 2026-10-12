/*
  Appels d'authentification vers l'API Node.
  - POST /api/auth/login    { email, password }                               → { user }
  - POST /api/auth/register { name, email, password, confirmPassword, website } → { user }
  La session vit dans un cookie httpOnly posé par le serveur (credentials: 'include') :
  aucun jeton n'est stocké dans le navigateur (ni localStorage, ni sessionStorage).
  En cas d'échec, le serveur répond { message } avec un code HTTP (401, 409, 422, 429…).
*/
export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: "CLIENT" | "ADMIN";
}

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordRules = (pw: string) => ({
  length: pw.length >= 8,
  letter: /[A-Za-z]/.test(pw),
  digit: /\d/.test(pw),
});
export const passwordOk = (pw: string) =>
  Object.values(passwordRules(pw)).every(Boolean);

/** Redirection interne uniquement (évite les « open redirect » via ?from=https://…). */
export const safePath = (p: unknown, fallback: string): string =>
  typeof p === "string" && p.startsWith("/") && !p.startsWith("//")
    ? p
    : fallback;
