import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { useRef } from "react";
import { api } from "../../../lib/api";
import Fiche from "../components/Fiche";
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
    biens?: {
      [key: string]: unknown;
      photos?: string[];
    }[];
  };
};

export function toFicheRecord(dto: ApiFicheDetail): FicheRecord {
  const data = dto.data ?? {};
  const galerie = (data.galerie ?? [])
    .filter(media => media.type === "image" || media.type === "video")
    .map(media => ({ type: media.type as "image" | "video", url: media.url, alt: media.alt }));

  // L'API renvoie les photos d'un bien sous forme d'URLs ; le composant de fiche
  // utilise des objets BienPhoto. On adapte la forme sans modifier le DTO serveur.
  const biens = (data.biens ?? []).map((bien, index) => ({
    ...bien,
    id: typeof bien.id === "number" ? bien.id : index,
    ficheId: dto.id,
    photos: (bien.photos ?? []).map((url, position) => ({
      id: position,
      bienId: typeof bien.id === "number" ? bien.id : index,
      url,
      position,
    })),
  }));

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
      biens: biens as unknown as FicheRecord["data"]["biens"],
      rendezVous: data.rendezVous as FicheRecord["data"]["rendezVous"],
      onglets: data.onglets as FicheRecord["data"]["onglets"],
      entete: data.entete as FicheRecord["data"]["entete"],
    },
  };
}

export function FichePage() {
  const { id } = useParams<{ id: string }>();
  const ficheId = Number(id);
  const phoneScroller = useRef<HTMLDivElement>(null);

  const {
    data: fiche,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["fiche-preview", ficheId],
    enabled: Number.isInteger(ficheId) && ficheId > 0,
    queryFn: async ({ signal }) => {
      const response = await api.get<{ fiche: ApiFicheDetail }>(
        `fiches/${ficheId}`,
        { signal }
      );
      return toFicheRecord(response.data.fiche);
    },
  });

  if (!Number.isInteger(ficheId) || ficheId <= 0) {
    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Fiche invalide</h1>
        <p>L’identifiant de la fiche est invalide.</p>
        <Link to="/espace-client">Retour au tableau de bord</Link>
      </div>
    );
  }

  if (isPending) {
    return <p className="fiche-preview-state" role="status">Chargement de la prévisualisation…</p>;
  }

  if (isError) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const message =
      status === 401
        ? "Votre session a expiré. Reconnectez-vous pour accéder à cette fiche."
        : status === 403 || status === 404
          ? "Cette fiche est introuvable ou vous n’avez pas le droit d’y accéder."
          : "Impossible de charger cette fiche. Vérifiez votre connexion puis réessayez.";

    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Prévisualisation indisponible</h1>
        <p>{message}</p>
        {status === 401 ? (
          <Link to="/login">Se connecter</Link>
        ) : (
          <button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Chargement…" : "Réessayer"}
          </button>
        )}
        <p><Link to="/espace-client">Retour au tableau de bord</Link></p>
      </div>
    );
  }

  if (!fiche) {
    return <p className="fiche-preview-state">Aucune fiche trouvée.</p>;
  }

  return (
    <section
      className="fiche-preview-page"
      aria-label={`Prévisualisation de la fiche de ${fiche.prenom} ${fiche.nom}`}
    >
      <div className="fiche-preview-toolbar">
        <Link to="/espace-client">← Retour au tableau de bord</Link>
        <span>Prévisualisation privée · aucun passage comptabilisé</span>
      </div>
      <div className="fiche-preview-stage">
        <div className="fiche-preview-device">
          <div className="fiche-preview-device-in" ref={phoneScroller}>
            <Fiche key={fiche.id} fiche={fiche} scrollerRef={phoneScroller} />
          </div>
        </div>
      </div>
    </section>
  );
}
