// Calculs du tableau de bord à partir des fiches renvoyées par l'API.
import { ENV } from "../../../lib/env";
import type { ApiFiche, Secteur } from "../api-types";

export const publicUrl = (slug: string) =>
  `${ENV.VITE_BASE_URL}/f/${slug}`;
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
/** Nom affiché : l'entreprise en priorité, sinon prénom + nom. */
export const displayName = (f: ApiFiche) =>
  f.entreprise?.trim() || `${f.prenom} ${f.nom}`.trim();

export const SECTEUR_LABEL: Record<Secteur, string> = {
  RESTAURANT: "Restaurant",
  IMMOBILIER: "Immobilier",
  COMMERCE: "Commerce",
  HOTEL: "Hôtel",
  INDEPENDANT: "Indépendant",
  BEAUTE: "Beauté",
};

export const daysLeft = (
  iso: string | null | undefined,
  now = Date.now()
): number | null =>
  iso ? Math.ceil((new Date(iso).getTime() - now) / 86_400_000) : null

export type Health = "ok" | "soon" | "expired" | "suspended";
/** L'échéance ne compte que si le serveur renvoie abonnementActif ; sinon la fiche est simplement « en ligne ». */
export function health(f: ApiFiche, now = Date.now()): Health {
  if (f.statut !== "ACTIVE") return "suspended";
  const d = daysLeft(f.abonnementActif?.endsAt, now);
  return d === null ? "ok" : d < 0 ? "expired" : d <= 30 ? "soon" : "ok";
}

export interface Check {
  key: string;
  label: string;
  ok: boolean;
}
/** Éléments qui rendent une fiche convaincante : ce qui manque est proposé au client. */
export const checks = (f: ApiFiche): Check[] => [
  { key: "visuel", label: "Photo ou logo", ok: !!(f.photo || f.logo) },
  {
    key: "presentation",
    label: "Présentation de l’activité",
    ok: !!f.presentation?.trim(),
  },
  { key: "adresse", label: "Adresse", ok: !!f.adresse?.trim() },
  { key: "email", label: "Adresse e-mail", ok: !!f.email?.trim() },
  { key: "site", label: "Site web", ok: !!f.site?.trim() },
  { key: "avis", label: "Avis Google", ok: !!f.googlePlaceId },
];
export const completion = (f: ApiFiche) => {
  const c = checks(f);
  return Math.round((c.filter(x => x.ok).length / c.length) * 100);
};
