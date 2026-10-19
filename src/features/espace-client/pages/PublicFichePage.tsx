import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api";
import Fiche from "../../espace-client/components/Fiche";
import { fetchFiche } from "../lib/ficheApi";
import "./FicheStats.css";

type PassageSource = "qr" | "nfc" | "direct";

export default function PublicFichePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const passageKey = useRef<{ slug: string; source: PassageSource; key: string } | null>(null);
  const requestedSource = searchParams.get("source");
  const source: PassageSource =
    requestedSource === "qr" || requestedSource === "nfc" ? requestedSource : "direct";

  const ficheQuery = useQuery({
    queryKey: ["public-fiche", slug],
    enabled: slug.length > 0,
    queryFn: ({ signal }) => fetchFiche(`fiches/public/${encodeURIComponent(slug)}`, signal),
    retry: false,
  });

  useEffect(() => {
    if (!ficheQuery.data || !slug) return;
    if (!passageKey.current || passageKey.current.slug !== slug || passageKey.current.source !== source) {
      passageKey.current = { slug, source, key: crypto.randomUUID() };
    }
    const idempotencyKey = passageKey.current.key;
    void api.post(
      `fiches/public/${encodeURIComponent(slug)}/passages`,
      { source, idempotencyKey },
    ).catch(() => {
      // L'affichage public reste disponible si le suivi statistique est temporairement indisponible.
    });

  }, [ficheQuery.data, slug, source]);

  if (ficheQuery.isPending) {
    return <main className="fiche-public-state" role="status">Chargement de la fiche…</main>;
  }

  if (ficheQuery.isError || !ficheQuery.data) {
    const status = isAxiosError(ficheQuery.error) ? ficheQuery.error.response?.status : undefined;
    const unavailable = status === 410;
    return (
      <main className="fiche-public-state" role="alert">
        <h1>{unavailable ? "Fiche indisponible" : "Fiche introuvable"}</h1>
        <p>
          {unavailable
            ? "Cette fiche est momentanément indisponible."
            : "Cette fiche n’existe pas ou ne peut pas être affichée."}
        </p>
        <Link to="/">Retour à l’accueil</Link>
      </main>
    );
  }

  return (
    <main className="fiche-public-page" ref={scrollerRef}>
      <Fiche key={ficheQuery.data.id} fiche={ficheQuery.data} scrollerRef={scrollerRef} />
    </main>
  );
}
