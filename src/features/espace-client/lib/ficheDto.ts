import type { FicheRecord, Formule } from "../../../types";

export type ApiFicheDetail = {
  id: number;
  slug: string;
  formule: string;
  planCapabilities?: FicheRecord["planCapabilities"];
  statut: string;
  expiree?: boolean;
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
  data: {
    [key: string]: unknown;
    galerie?: { type: string; url: string; alt?: string }[];
  };
};

export function toFicheRecord(dto: ApiFicheDetail): FicheRecord {
  const data = dto.data ?? {};
  const galerie = (data.galerie ?? [])
    .filter(media => media.type === "image" || media.type === "video")
    .map(media => ({ type: media.type as "image" | "video", url: media.url, alt: media.alt }));

  return {
    id: dto.id,
    slug: dto.slug,
    formule: dto.formule.toLowerCase() as Formule,
    planCapabilities: dto.planCapabilities ?? null,
    expiree: dto.expiree ?? false,
    statut: dto.statut.toLowerCase(),
    enLigneSeule: dto.enLigneSeule,
    prenom: dto.prenom ?? "",
    nom: dto.nom ?? "",
    fonction: dto.fonction ?? "",
    entreprise: dto.entreprise ?? "",
    photo: dto.photo ?? "",
    logo: dto.logo ?? "",
    telephone: dto.telephone ?? "",
    whatsapp: dto.whatsapp ?? "",
    email: dto.email ?? "",
    site: dto.site ?? "",
    adresse: dto.adresse ?? "",
    googlePlaceId: dto.googlePlaceId ?? "",
    dateEcheance: dto.dateEcheance,
    scansTotal: dto.scansTotal,
    data: {
      secteur: data.secteur as FicheRecord["data"]["secteur"],
      premierBouton: data.premierBouton as string | undefined,
      messageWhatsapp: data.messageWhatsapp as string | undefined,
      presentation: data.presentation as string | undefined,
      reseauxSociaux: data.reseauxSociaux as FicheRecord["data"]["reseauxSociaux"],
      liens: data.liens as FicheRecord["data"]["liens"],
      horaires: data.horaires as FicheRecord["data"]["horaires"],
      galerie,
      sections: data.sections as FicheRecord["data"]["sections"],
      menu: data.menu as FicheRecord["data"]["menu"],
      biens: data.biens as FicheRecord["data"]["biens"],
      rendezVous: data.rendezVous as FicheRecord["data"]["rendezVous"],
      onglets: data.onglets as FicheRecord["data"]["onglets"],
      entete: data.entete as FicheRecord["data"]["entete"],
    },
  };
}
