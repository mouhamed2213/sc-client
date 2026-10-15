import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import Fiche from "../components/Fiche";
import { toFicheRecord, type ApiFicheDetail } from "../lib/ficheDto";

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
    return (
      <p className="fiche-preview-state" role="status">
        Chargement de la prévisualisation…
      </p>
    );
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
        <p>
          <Link to="/espace-client">Retour au tableau de bord</Link>
        </p>
      </div>
    );
  }

  if (!fiche) {
    return <p className="fiche-preview-state">Aucune fiche trouvée.</p>;
  }

  return (
    <section
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
