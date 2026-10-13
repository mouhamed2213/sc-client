/**
 * Types partagés Support Connecté (côté React).
 *
 * Dérivés du schema.prisma. Règles :
 *  - Les enums sont des unions de chaînes (+ tableau const pour les listes/selects),
 *    sans `enum` TS : compatible avec `erasableSyntaxOnly` et `verbatimModuleSyntax`.
 *  - Les `DateTime` Prisma deviennent des `ISODateString` : en JSON, une date est une chaîne.
 *  - Jamais exposés au front : User.passwordHash, AuthToken (tokenHash), Fiche.claimCode (hors admin).
 */

export type ISODateString = string;

/* ───────────────────────── Enums ───────────────────────── */

export const PLAN_TYPES = ["ESSENTIELLE", "PRO", "SIGNATURE"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const ROLES = ["CLIENT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const SUBSCRIPTION_STATUSES = [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "CANCELED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const STATUTS_FICHE = ["ACTIVE", "SUSPENDUE"] as const;
export type StatutFiche = (typeof STATUTS_FICHE)[number];

export const SECTEURS = [
  "restaurant",
  "immobilier",
  "commerce",
  "hotel",
  "independant",
  "beaute",
] as const;
export type Secteur = (typeof SECTEURS)[number];

export const PREMIERS_BOUTONS = ["WHATSAPP", "APPEL", "EMAIL"] as const;
export type PremierBouton = (typeof PREMIERS_BOUTONS)[number];

export const DISPOSITIONS = ["portrait", "logo", "banniere", "duo"] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

export const TAILLES = ["s", "m", "l"] as const;
export type Taille = (typeof TAILLES)[number];

export const THEMES = ["or", "clair", "bleu", "nuit"] as const;
export type Theme = (typeof THEMES)[number];

export const TAB_TYPES = [
  "presentation",
  "catalogue",
  "galerie",
  "videos",
  "liens",
  "horaires",
  "avis",
  "reseaux",
  "localisation",
] as const;

export const MEDIA_TYPES = ["IMAGE", "VIDEO"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const BIEN_TYPES = ["vente", "location"] as const;
export type BienType = (typeof BIEN_TYPES)[number];

/* ───────────────────────── Contenu de la fiche ───────────────────────── */

export type IRegister = {
  email: string;
  password: string;
  name: string;
};

export type Login = {
  email: string;
  password: string;
};

export interface FicheOnglet {
  id: string; // cuid
  ficheId: number;
  type: TabType;
  titre: string | null;
  contenu: string | null; // uniquement pour TEXTE
  visible: boolean;
  position: number;
}

export interface FicheReseau {
  id: number;
  ficheId: number;
  label: string;
  url: string;
  position: number;
}

export interface FicheLien {
  id: number;
  ficheId: number;
  label: string;
  url: string;
  position: number;
}

export interface FicheHoraire {
  id: number;
  ficheId: number;
  jour: number; // 0 = Lundi … 6 = Dimanche
  horaire: string;
}

export interface FicheMedia {
  id: number;
  ficheId: number;
  type: MediaType;
  url: string;
  alt: string | null;
  position: number;
}

export interface CatalogueArticle {
  id: number;
  sectionId: number;
  nom: string;
  description: string | null;
  photo: string | null;
  prix: number | null; // FCFA
  badge: string | null;
  position: number;
}

export interface CatalogueSection {
  id: number;
  ficheId: number;
  titre: string;
  position: number;
  articles: CatalogueArticle[];
}

export interface MenuPlat {
  id: number;
  sectionId: number;
  nom: string;
  prix: number | null; // FCFA
  description: string | null;
  image: string | null;
  video: string | null;
  videoWebm: string | null;
  badge: string | null;
  position: number;
}

export interface MenuSection {
  id: number;
  ficheId: number;
  titre: string;
  position: number;
  plats: MenuPlat[];
}

export interface BienPhoto {
  id: number;
  bienId: number;
  url: string;
  position: number;
}

export interface Bien {
  id: number;
  ficheId: number;
  titre: string;
  type: BienType;
  prix: number | null; // FCFA
  periode: string | null; // "mois" pour une location
  ville: string | null;
  surface: number | null;
  terrain: number | null;
  chambres: number | null;
  sdb: number | null;
  atouts: string[];
  description: string | null;
  position: number;
  photos: BienPhoto[];
}

/* ───────────────────────── Formules et abonnements ───────────────────────── */

export interface PlanLimit {
  planId: number;

  // Blocs et mise en page
  tabsAutorises: TabType[];
  headerLayouts: Disposition[];
  themes: Theme[];
  canReorder: boolean;
  canHide: boolean;
  canAdd: boolean;
  canRename: boolean;
  maxCustomTabs: number;

  // Quotas
  maxPresentation: number;
  maxSocial: number;
  maxLinks: number;
  maxPhotos: number;
  maxVideos: number;
  maxCatalogSections: number;
  maxCatalogArticlesPerSection: number;
  catalogPrices: boolean;
  maxMenuSections: number;
  maxMenuItemsPerSection: number;
  menuVideoPerItem: boolean;
  maxMenuVideoSeconds: number;
  maxBiens: number;
  maxPhotosPerBien: number;

  // Fonctions
  hasCatalog: boolean;
  hasMenu: boolean;
  hasBiens: boolean;
  hasGoogleReview: boolean;
  hasStats: boolean;
  hasForm: boolean;
  hasDashboard: boolean;
}

export interface Plan {
  id?: number;
  type?: PlanType;
  nom?: string;
  themeDefaut?: Theme;
  prixFcfa?: number | null;
  dureeMois?: number | null; // null = sans échéance
  actif?: boolean;
  limits?: PlanLimit | null;
}

export interface Subscription {
  id: number;
  ficheId: number;
  planId: number;
  status: SubscriptionStatus;
  startsAt: ISODateString;
  endsAt: ISODateString | null; // null = sans échéance
  canceledAt: ISODateString | null;
  amountFcfa: number | null;
  paymentRef: string | null;
  createdAt: ISODateString;
  plan?: Plan;
}

/* ───────────────────────── Fiche ───────────────────────── */

/** Champs scalaires d'une fiche (sans claimCode, jamais exposé publiquement). */
export interface FicheBase {
  id: number;
  slug: string;

  // Identité
  prenom: string;
  nom: string;
  fonction: string | null;
  entreprise: string | null;
  photo: string | null;
  logo: string | null;

  // Contact
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  adresse: string | null;
  googlePlaceId: string | null;
  premierBouton: PremierBouton;
  messageWhatsapp: string | null;

  // État
  statut: StatutFiche;
  enLigneSeule: boolean;
  scansTotal: number;

  // Contenu
  secteur: Secteur | null;
  presentation: string | null;
  rdvLabel: string | null;
  rdvUrl: string | null;

  // Entête
  enteteDisposition: Disposition;
  enteteTaille: Taille;
  enteteTheme: Theme | null; // null = thème par défaut de la formule
  enteteCouverture: string | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Fiche complète telle que renvoyée par l'API publique (page /f/<slug>). */
export interface Fiche extends FicheBase {
  onglets: FicheOnglet[];
  reseaux: FicheReseau[];
  liens: FicheLien[];
  horaires: FicheHoraire[];
  medias: FicheMedia[];
  catalogueSections: CatalogueSection[];
  menuSections: MenuSection[];
  biens: Bien[];
  /** Abonnement ACTIVE non expiré : détermine la formule effective. */
  abonnementActif?: Subscription | null;
}

/** Fiche vue par son propriétaire ou un admin : ajoute les champs privés. */
export interface FicheOwner extends Fiche {
  userId: number | null;
  claimCode: string | null; // null une fois la carte rattachée
  subscriptions?: Subscription[];
}

/* ───────────────────────── Comptes ───────────────────────── */

/** User sans passwordHash. */
export interface User {
  id: number;
  email: string;
  role: Role;
  nom: string | null;
  emailVerifiedAt: ISODateString | null;
  createdAt: ISODateString;
}

/* ───────────────────────── Payloads d'écriture ───────────────────────── */

/** Élément enfant à créer : sans id ni clé étrangère (fournis par le serveur). */
type NewChild<T, FK extends keyof T> = Omit<T, "id" | FK>;

export type NewFicheReseau = NewChild<FicheReseau, "ficheId">;
export type NewFicheLien = NewChild<FicheLien, "ficheId">;
export type NewFicheHoraire = NewChild<FicheHoraire, "ficheId">;
export type NewFicheMedia = NewChild<FicheMedia, "ficheId">;
export type NewFicheOnglet = NewChild<FicheOnglet, "ficheId">;

/** Champs modifiables d'une fiche (le serveur valide selon PlanLimit). */
export type FicheUpdateInput = Partial<
  Omit<FicheBase, "id" | "slug" | "scansTotal" | "createdAt" | "updatedAt">
> & {
  onglets?: NewFicheOnglet[];
  reseaux?: NewFicheReseau[];
  liens?: NewFicheLien[];
  horaires?: NewFicheHoraire[];
  medias?: NewFicheMedia[];
};

/** Prolongation d'abonnement (admin) : nouvelle date de fin, postérieure à l'actuelle. */
export interface ExtendSubscriptionInput {
  extendedTo: ISODateString;
}

/* ───────────────────────── Utilitaires ───────────────────────── */

export interface ApiErrorBody {
  message: string;
  statusCode?: number;
  data?: unknown;
}

/*---------------------------------- FICHE*/
// Modèle de données des fiches connectées (même structure que l'API fiches.getBySlug + champs V2).
export type Formule = "essentielle" | "pro" | "signature";
export type TabType =
  | "presentation"
  | "menu"
  | "biens"
  | "catalogue"
  | "galerie"
  | "videos"
  | "liens"
  | "rendezvous"
  | "rappel"
  | "horaires"
  | "avis"
  | "reseaux"
  | "localisation"
  | "texte";

export interface Onglet {
  id: string;
  type: TabType;
  titre?: string;
  contenu?: string;
  visible?: boolean;
}
export interface Entete {
  disposition?: Disposition;
  taille?: Taille;
  theme?: Theme;
  couverture?: string;
}
/** Entête après application des valeurs par défaut de la formule. */
export interface EnteteComplete {
  disposition: Disposition;
  taille: Taille;
  theme: Theme;
  couverture?: string;
}
export interface Lien {
  label: string;
  url: string;
}
export interface Horaire {
  jour: string;
  horaire: string;
}
export interface Photo {
  type: "image";
  url: string;
  alt?: string;
}
export interface Article {
  nom: string;
  description?: string;
  photo?: string;
  prix?: string;
  devise?: string;
  badge?: string;
}
export interface SectionCatalogue {
  titre: string;
  articles: Article[];
}
export interface Plat {
  nom: string;
  prix?: string;
  description?: string;
  image?: string;
  video?: string;
  videoWebm?: string;
  badge?: string;
}
export interface SectionMenu {
  titre: string;
  plats: Plat[];
}

export interface FicheData {
  secteur?: Secteur;
  premierBouton?: string;
  messageWhatsapp?: string;
  presentation?: string;
  reseauxSociaux?: Lien[];
  liens?: Lien[];
  horaires?: Horaire[];
  galerie?: Photo[];
  sections?: SectionCatalogue[];
  menu?: { sections: SectionMenu[] };
  biens?: Bien[];
  rendezVous?: { label: string; url: string };
  onglets?: Onglet[];
  entete?: Entete;
}
export interface FicheRecord {
  id: number;
  slug: string;
  formule: Formule;
  statut: string;
  enLigneSeule: boolean;
  prenom: string;
  nom: string;
  fonction: string;
  entreprise: string;
  photo: string;
  logo: string;
  telephone: string;
  whatsapp: string;
  email: string;
  site: string;
  adresse: string;
  googlePlaceId: string;
  dateEcheance: string | null;
  scansTotal: number;
  data: FicheData;
}

/** Droits d'une formule (à dupliquer côté serveur). Les limites absentes = fonction non incluse. */
export interface Plan {
  label: string;
  theme: Theme;
  tabs: TabType[];
  canReorder: boolean;
  canHide: boolean;
  canAdd: boolean;
  canRename: boolean;
  maxPresentation: number;
  maxSocial: number;
  maxLinks: number;
  maxPhotos: number;
  maxVideos: number;
  maxCustomTabs?: number;
  hasGoogleReview: boolean;
  hasCatalog: boolean;
  maxCatalogSections?: number;
  maxCatalogArticlesPerSection?: number;
  catalogPrices: boolean;
  hasMenu?: boolean;
  maxMenuSections?: number;
  maxMenuItemsPerSection?: number;
  menuVideoPerItem?: boolean;
  maxMenuVideoSeconds?: number;
  hasBiens?: boolean;
  maxBiens?: number;
  maxPhotosPerBien?: number;
  hasForm?: boolean;
  hasStats: boolean;
  hasDashboard?: boolean;
  headerLayouts: Disposition[];
  themes: Theme[];
}
export interface TabTypeInfo {
  label: string;
  icon: string;
  hint?: string;
}
export interface Template {
  label: string;
  icon: string;
  tabs: TabType[];
  titles: Partial<Record<TabType, string>>;
  entete: { disposition: Disposition; taille: Taille };
}
