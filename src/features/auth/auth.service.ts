import { api } from "../../lib/api";
import { toApiError } from "../../lib/apiError";
import { clearSession, saveSession } from "../../lib/session";
import { IRegister, Login } from "../../types";

/*
  Appels d'authentification. Toutes les erreurs remontent en `ApiError` (message lisible + code + statut).
  La session (jeton + utilisateur) n'est lue et écrite que par lib/session.ts.
*/

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    nom: string;
    role: "CLIENT" | "ADMIN";
    emailVerified: boolean;
  };
  token: string;
}

export async function register(registerData: IRegister) {
  try {
    const res = await api.post("/auth/register", {
      email: registerData.email,
      password: registerData.password,
      nom: registerData.name,
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function login(loginData: Login): Promise<LoginResponse> {
  try {
    const res = await api.post<LoginResponse>("/auth/login", loginData);
    const { token, user } = res.data;
    saveSession({
      token,
      user: { id: user.id, role: user.role, name: user.nom, email: user.email },
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Prévient le serveur (avec le jeton), puis supprime la session locale quoi qu'il arrive. */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    /* session déjà expirée ou serveur injoignable : on quitte quand même */
  } finally {
    clearSession();
  }
}

export async function verifyEmail(token: string): Promise<void> {
  try {
    await api.post("/auth/verify-email", { token });
  } catch (error) {
    throw toApiError(
      error,
      "La vérification a échoué. Le lien est peut-être expiré.",
    );
  }
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await api.post("/auth/forgot-password", { email });
  } catch (error) {
    throw toApiError(error);
  }
}

export async function resetPassword(payload: {
  token: string;
  password: string;
}): Promise<void> {
  try {
    await api.post("/auth/reset-password", payload);
  } catch (error) {
    throw toApiError(error);
  }
}
