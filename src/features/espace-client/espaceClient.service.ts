// create fiche
import axios, { AxiosError } from "axios";
import { api } from "../../lib/api";

export async function createFiche(data: any) {
  try {
    const result = await api.post("/fiches", data);
    return result.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log(e.response?.data?.error?.message ?? "Une erreur est survenue.",);
      
      throw e.response?.data?.error?.message ?? "Une erreur est survenue."
    }
    return;
  }
}
