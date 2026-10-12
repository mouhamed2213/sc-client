// create fiche
import { api } from "../../lib/api";

export async function createFiche(data: any) {
  const result = api.post("/fiches", data);
}
