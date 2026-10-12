import { useOutletContext } from "react-router-dom";

export interface ClientUser {
  name: string;
  email: string;
}

const isClientUser = (value: unknown): value is ClientUser =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "email" in value &&
  typeof value.email === "string";

export const readClientUser = (): ClientUser | null => {
  const stored = localStorage.getItem("client_user");
  if (!stored) return null;

  try {
    const user: unknown = JSON.parse(stored);
    if (isClientUser(user)) return user;
  } catch {
    localStorage.removeItem("client_user");
    return null;
  }

  localStorage.removeItem("client_user");
  return null;
};

/** Utilisateur connecté, fourni par ClientLayout à toutes les pages de l'espace client. */
export const useClientUser = () =>
  useOutletContext<{ user: ClientUser }>().user;
