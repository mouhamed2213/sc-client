// create fiche
import axios from "axios";
import { api } from "../../lib/api";
import type { ApiFiche } from "./api-types";

export async function createFiche(data: any) {
  try {
    const result = await api.post("/fiches", data);
    return result.data;
  } catch (e) {
    // Conserver le statut et le corps Axios : le formulaire affiche le message
    // utile et peut rediriger vers la connexion sur une session expirée.
    if (axios.isAxiosError(e)) throw e;
    throw e;
  }
}

export async function getDashboardFiche(
  signal?: AbortSignal
): Promise<ApiFiche[]> {
  const response = await api.get<ApiFiche[]>("client/dashboard/fiches", {
    signal,
  });
  return response.data;
}
