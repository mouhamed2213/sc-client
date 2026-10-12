import { useOutletContext } from "react-router-dom";

export interface ClientUser {
  name: string;
  email: string;
}
/** Utilisateur connecté, fourni par ClientLayout à toutes les pages de l'espace client. */
export const useClientUser = () =>
  useOutletContext<{ user: ClientUser }>().user;
