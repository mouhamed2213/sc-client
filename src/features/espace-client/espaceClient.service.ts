// create fiche
import axios from "axios";
import { api } from "../../lib/api";
import type { ApiFiche } from "./api-types";

export async function createFiche(data: any) {
  try {
    const result = await api.post("/fiches", data);
    return result.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log(
        e.response?.data?.error?.message ?? "Une erreur est survenue."
      );

      throw e.response?.data?.error?.message ?? "Une erreur est survenue.";
    }
    return;
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
