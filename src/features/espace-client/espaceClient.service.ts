// create fiche
import axios from "axios";
import { api } from "../../lib/api";
import type { ApiFiche } from "./api-types";
import { ApiError } from "./lib/api";
import type { SubscriptionKpi } from "./pages/SubscriptionPage";
import type { PlanType } from "../../types";

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

// get subscripton kpi

export async function getKpi(): Promise<SubscriptionKpi> {
  try {
    const response = await api.get<SubscriptionKpi>("subscription/kpi");
    console.log(response.data);

    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw new ApiError(
        e.response?.data?.error?.message ?? "Une erreur est survenue.",
        e.response?.data?.error?.code
      );
    }
    throw e;
  }
}


export type UpgradePlanResponse = {
  succes: string;
  message?: string;
  data: {
    subscription: { id: number; ficheId: number; planId: number; status: string };
    fiche: { id: number; formule: string };
    payment: {
      id: number;
      reference: string | null;
      mode: "simulation";
      status: "confirmed";
    };
  };
};

export async function upgradeFichePlan(
  ficheId: number,
  plan: Exclude<PlanType, "ESSENTIELLE">
): Promise<UpgradePlanResponse> {
  // Étape 1 : demander l'upgrade. Le backend crée un paiement PENDING,
  // sans changer la formule active.
  const request = await api.post<{
    data: { payment: { id: number; reference: string | null; status: "pending" } };
  }>("/subscription/upgrade", {
    ficheId,
    plan: plan.toLowerCase(),
  });

  // Étape 2 : adaptateur de simulation (désactivé côté backend en production).
  // L'intégration Wave/Orange Money remplacera cet appel par le parcours fournisseur.
  const paymentId = request.data.data.payment.id;
  const confirmation = await api.post<UpgradePlanResponse>(
    `/subscription/payments/${paymentId}/simulate-confirmation`
  );
  return confirmation.data;
}
