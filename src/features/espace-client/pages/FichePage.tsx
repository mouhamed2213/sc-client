import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

export function FichePage() {
  const ficheId = 1;
  const [slug, setSlug] = useState("restaurant-teranga");

  const {
    data: fiche,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["fiche_public", ficheId],
    queryFn: async () => {
      const result = await api.get(`fiches/${ficheId}`);
      return result.data.fiche;
    },
  });

  if (isLoading) {
    return <p>Chargement de la fiche...</p>;
  }

  if (isError) {
    return <p>Erreur : {error.message}</p>;
  }

  if (!fiche) {
    return <p>Aucune fiche trouvée.</p>;
  }

  return (
    <div>
      <h1>Test de récupération de la fiche</h1>

      <div className="demo-seg">
        <button
          className={fiche.slug === slug ? "on" : ""}
          onClick={() => setSlug(fiche.slug)}
        >
          {`${fiche.prenom} ${fiche.nom}`.trim()}
          <em className={`pl-${fiche.formule}`}>
            {fiche.formule}
          </em>
        </button>
      </div>

      <pre>{JSON.stringify(fiche, null, 2)}</pre>
    </div>
  );
}