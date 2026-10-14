// Format réel renvoyé par GET client/dashboard/fiches (lignes Prisma « Fiche », enums en MAJUSCULES, dates ISO).
export type Secteur =
  | "RESTAURANT"
  | "IMMOBILIER"
  | "COMMERCE"
  | "HOTEL"
  | "INDEPENDANT"
  | "BEAUTE";
export type StatutFiche = "ACTIVE" | "SUSPENDUE";

export interface ApiFiche {
  id: number;
  slug: string;
  prenom: string;
  nom: string;
  fonction: string | null;
  entreprise: string | null;
  photo: string | null;
  logo: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  adresse: string | null;
  googlePlaceId: string | null;
  premierBouton: "WHATSAPP" | "APPEL" | "EMAIL";
  messageWhatsapp: string | null;
  statut: StatutFiche;
  enLigneSeule: boolean;
  scansTotal: number;
  userId: number | null;
  claimCode: string | null;
  secteur: Secteur | null;
  presentation: string | null;
  rdvLabel: string | null;
  rdvUrl: string | null;
  enteteDisposition: "PORTRAIT" | "LOGO" | "BANNIERE" | "DUO";
  enteteTaille: "S" | "M" | "L";
  enteteTheme: "OR" | "CLAIR" | "BLEU" | "NUIT" | null;
  enteteCouverture: string | null;
  createdAt: string;
  updatedAt: string;
  /** Format actuellement renvoyé par le serveur dans la relation subscriptions. */
  subscriptions?: {
    plan: { type: "ESSENTIELLE" | "PRO" | "SIGNATURE"; nom?: string };
  }[];
  /** Ancien format compatible avec les réponses déjà adaptées. */
  abonnementActif?: {
    endsAt: string | null;
    plan: { type: "ESSENTIELLE" | "PRO" | "SIGNATURE"; nom: string };
  } | null;
}
