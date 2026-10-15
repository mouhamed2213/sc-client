import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PLANS } from "../../../lib/plans";
import type { FicheRecord } from "../../../types";
import Editor from "../components/Editor";
import Fiche from "../components/Fiche";
import { useFicheEditor } from "../hooks/useFicheEditor";
import { MOCK_FICHES } from "../lib/ficheSource";

/*
  Éditeur de fiche : formulaire à gauche (même logique que la référence : droits par formule, blocs,
  identité, entête), aperçu téléphone en direct à droite.  Routes : /espace-client/editeur et /espace-client/editeur/:id

  Données : voir lib/ficheSource.ts (fictives pour l'instant, API ensuite — cette page ne change pas).
*/

// Fiche suspendue ou abonnement échu : le serveur refuse déjà toute modification (FICHE_SUSPENDUE / ABONNEMENT_EXPIRE).
const lockReason = (f: FicheRecord): string | null => {
  if (f.statut === "suspendue")
    return "Cette fiche est suspendue : la modification est impossible.";
  if (
    f.dateEcheance &&
    new Date(f.dateEcheance) < new Date(new Date().toDateString())
  )
    return "L'abonnement de cette fiche a expiré : la modification est bloquée.";
  return null;
};

export default function EditorPage() {
  const { id: slug = "" } = useParams<{ id: string }>(); // en démo : slug d'une fiche fictive ; avec l'API : id de la fiche
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const {
    draft,
    setDraft,
    status,
    dirty,
    saving,
    saveError,
    save,
    reset,
    isMock,
  } = useFicheEditor(slug);

  useEffect(() => {
    document.title = "Modifier ma fiche — Support Connecté";
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [slug]);

  // Quitter la page avec des modifications non enregistrées
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (status === "loading")
    return (
      <p className="fiche-preview-state" role="status">
        Chargement de la fiche…
      </p>
    );
  if (status === "error" || !draft)
    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Fiche introuvable</h1>
        <p>Impossible de charger cette fiche.</p>
        <Link to="/espace-client">Retour au tableau de bord</Link>
      </div>
    );

  const locked = lockReason(draft);
  const demoUnknown = isMock && !MOCK_FICHES.some(f => f.slug === slug);

  return (
    <div className="edp-page">
      {isMock && (
        <div
          className="edp-mock"
          role="group"
          aria-label="Fiche de démonstration"
        >
          <span className="edp-mock-t">
            Données fictives <small>aperçu de chaque formule</small>
          </span>
          <div className="edp-seg">
            {MOCK_FICHES.map(f => (
              <button
                key={f.slug}
                className={f.slug === draft.slug ? "on" : ""}
                onClick={() => navigate(`/espace-client/editeur/${f.slug}`)}
              >
                {`${f.prenom} ${f.nom}`.trim()}
                <em className={`pl-${f.formule}`}>{PLANS[f.formule].label}</em>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="demo-body m-editeur">
        <aside className="demo-ed">
          <div className="edp-bar">
            <Link to="/espace-client" className="edp-back">
              ← Tableau de bord
            </Link>
            <span className="edp-state" role="status" aria-live="polite">
              {saving
                ? "Enregistrement…"
                : saveError
                  ? saveError
                  : dirty
                    ? "Modifications non enregistrées"
                    : "Tout est enregistré"}
            </span>
            {dirty && (
              <>
                <button
                  className="edp-ghost"
                  onClick={reset}
                  disabled={saving || !!locked}
                >
                  Annuler
                </button>
                <button
                  className="edp-save"
                  onClick={save}
                  disabled={saving || !!locked}
                >
                  Enregistrer
                </button>
              </>
            )}
          </div>

          {demoUnknown && (
            <p className="edp-note">
              Mode démonstration : la fiche « {slug} » n'est pas encore chargée
              depuis l'API, une fiche fictive est affichée.
            </p>
          )}
          {locked && (
            <p className="edp-note edp-warn" role="alert">
              {locked}
            </p>
          )}

          {/* fieldset disabled : désactive d'un coup tous les champs et boutons de l'éditeur quand la fiche est verrouillée */}
          <fieldset className="edp-lock" disabled={!!locked}>
            <Editor fiche={draft} onChange={setDraft} />
          </fieldset>
        </aside>

        <div className="demo-stage">
          <div className="device">
            <div className="device-in" ref={scroller}>
              <Fiche key={draft.slug} fiche={draft} scrollerRef={scroller} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
