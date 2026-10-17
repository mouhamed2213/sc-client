import { useEffect, useRef } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import Fiche from "../components/Fiche";
import { useDashboardFiches } from "../hooks/useDashboardFiches";
import { useFicheEditor } from "../hooks/useFicheEditor";
import { useUnsavedGuard } from "../hooks/useUnsavedGuard";
import { MOCK_FICHES, ficheSource } from "../lib/ficheSource";
import { PLANS } from "../../../lib/plans";
import type { FicheRecord } from "../../../types";

/*
  Éditeur de fiche : formulaire à gauche (droits par formule, blocs, identité, entête), aperçu téléphone en
  direct à droite.
  Routes : /espace-client/editeur  et  /espace-client/editeur/:id   (id numérique de la fiche)

  Données : lib/ficheSource.ts — GET / PATCH /api/fiches/:id (ou données fictives si VITE_USE_MOCK_FICHES=true).
*/

// Le serveur refuse déjà toute modification d'une fiche suspendue (FICHE_SUSPENDUE) ou dont l'abonnement est échu
// (ABONNEMENT_EXPIRE) ; on le dit avant et on verrouille l'éditeur.
const lockReason = (f: FicheRecord): string | null => {
  if (f.statut === "suspendue") return "Cette fiche est suspendue : la modification est impossible.";
  if (f.expiree) return "L'abonnement de cette fiche a expiré : la modification est bloquée tant qu'il n'est pas renouvelé.";
  return null;
};

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return ficheSource.isMock ? <MockIndex /> : <ApiIndex />;
  return <FicheEditor key={id} id={id} />;
}

/* /editeur sans identifiant (menu latéral) : on ouvre la première fiche du client */
function MockIndex() {
  return <Navigate to={`/espace-client/editeur/${MOCK_FICHES[0].slug}`} replace />;
}

function ApiIndex() {
  const { data, isPending, isError, refetch } = useDashboardFiches();
  if (isPending)
    return (
      <p className="fiche-preview-state" role="status">
        Chargement de vos fiches…
      </p>
    );
  if (isError)
    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Impossible de charger vos fiches</h1>
        <button onClick={() => void refetch()}>Réessayer</button>
      </div>
    );
  const first = data?.[0];
  if (!first)
    return (
      <div className="fiche-preview-state">
        <h1>Aucune fiche à modifier</h1>
        <p>Créez d'abord une fiche depuis votre tableau de bord.</p>
        <Link to="/espace-client">Retour au tableau de bord</Link>
      </div>
    );
  return <Navigate to={`/espace-client/editeur/${first.id}`} replace />;
}

function FicheEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const { draft, setDraft, status, loadError, dirty, saving, saveError, notes, save, reset, retry, isMock } =
    useFicheEditor(id);

  useEffect(() => {
    document.title = "Modifier ma fiche — Support Connecté";
  }, []);

  // Quitter la page (fermeture ou lien interne) avec des modifications non enregistrées
  useUnsavedGuard(dirty);

  if (status === "loading")
    return (
      <p className="fiche-preview-state" role="status">
        Chargement de la fiche…
      </p>
    );
  if (status === "error" || !draft)
    return (
      <div className="fiche-preview-state" role="alert">
        <h1>{loadError?.kind === "notfound" ? "Fiche introuvable" : "Impossible de charger la fiche"}</h1>
        <p>{loadError?.message ?? "Une erreur est survenue."}</p>
        {loadError?.kind !== "notfound" && loadError?.kind !== "auth" && <button onClick={retry}>Réessayer</button>}{" "}
        <Link to="/espace-client">Retour au tableau de bord</Link>
      </div>
    );

  const locked = lockReason(draft);
  const demoUnknown = isMock && !MOCK_FICHES.some(f => f.slug === id);

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
                : dirty
                  ? "Modifications non enregistrées"
                  : "Tout est enregistré"}
            </span>

            <button
              className="edp-ghost"
              onClick={reset}
              disabled={!dirty || saving || !!locked}
            >
              Annuler
            </button>
            <button
              className="edp-save"
              onClick={save}
              disabled={!dirty || saving || !!locked}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>

          </div>

          {demoUnknown && (
            <p className="edp-note">
              Mode démonstration : la fiche « {id} » n'existe pas dans les données fictives, une fiche de démo est
              affichée.
            </p>
          )}
          {locked && (
            <p className="edp-note edp-warn" role="alert">
              {locked}
            </p>
          )}
          {saveError && (
            <div className="edp-note edp-warn" role="alert">
              <strong>{saveError.message}</strong>
              {saveError.issues.length > 0 && (
                <ul className="edp-errors">
                  {saveError.issues.slice(0, 8).map((i, n) => (
                    <li key={n}>
                      <b>{i.label}</b> — {i.message}
                    </li>
                  ))}
                  {saveError.issues.length > 8 && <li>… et {saveError.issues.length - 8} autre(s)</li>}
                </ul>
              )}
            </div>
          )}
          {!saveError &&
            notes.map(n => (
              <p key={n} className="edp-note" role="status">
                {n}
              </p>
            ))}

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
