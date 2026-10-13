// create fiche
import { api } from "../../lib/api";
import type { ApiFiche } from "./api-types";

export async function createFiche(data: any) {
  const result = await api.post("/fiches", data);
  return result.data;
}

export async function getDashboardFiche(
  signal?: AbortSignal
): Promise<ApiFiche[]> {
  const response = await api.get<ApiFiche[]>("client/dashboard/fiches", {
    signal,
  });
  return response.data;
}
