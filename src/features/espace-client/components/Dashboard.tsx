import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import "../../../styles/dashboard.css";
import {
  dashboardFichesKey,
  useDashboardFiches,
} from "../hooks/useDashboardFiches";
import { isAuthFailure } from "../../../lib/apiError";
import { clearSession } from "../../../lib/session";
import type { Health } from "../lib/dashboard";
import {
  checks,
  completion,
  daysLeft,
  displayName,
  fmtDate,
  health,
  publicUrl,
  SECTEUR_LABEL,
} from "../lib/dashboard";
import CreateFicheForm from "../pages/CreateFicheForm";

/*
  Tableau de bord de l'espace client. Données : GET client/dashboard/fiches (TanStack Query, hook useDashboardFiches).
  ⚠️ Le serveur ne renvoie pas encore la formule, l'échéance ni le contenu des blocs : le tableau de bord n'affiche donc
  que ce qui existe (état, passages, complétude de la fiche). Dès que `abonnementActif` est ajouté à la réponse,
  la formule et les alertes d'échéance s'affichent d'elles-mêmes.
*/
interface Props {
  user: { name: string };
  onEdit: (ficheId: number) => void;
  onView: (slug: string) => void;
}

const PILL: Record<
  Health,
  { cls: string; text: (d: number | null) => string }
> = {
  ok: { cls: "ok", text: () => "En ligne" },
  soon: { cls: "warn", text: d => `Expire dans ${d} j` },
  expired: { cls: "bad", text: () => "Expirée" },
  suspended: { cls: "bad", text: () => "Suspendue" },
};

function Skeleton() {
  return (
    <div className="db" aria-busy="true" aria-label="Chargement">
      <div className="db-sk h" />
      <div className="db-kpis">
        <div className="db-sk k" />
        <div className="db-sk k" />
        <div className="db-sk k" />
      </div>
      <div className="db-sk l" />
      <div className="db-sk l" />
    </div>
  );
}

export default function Dashboard({ user, onEdit, onView }: Props) {
  const {
    data: fiches,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardFiches();
  const [sel, setSel] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleCreated = () => {
    setCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: dashboardFichesKey });
  };

  const createDialog = createOpen ? (
    <div
      className="db-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) setCreateOpen(false);
      }}
    >
      <section
        className="db-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="db-create-title"
      >
        <header className="db-create-modal-head">
          <div>
            <p className="db-k">Nouvelle fiche</p>
            <h2 id="db-create-title">Créer une fiche</h2>
          </div>
          <button
            type="button"
            className="db-create-close"
            onClick={() => setCreateOpen(false)}
            aria-label="Fermer la fenêtre de création"
          >
            ×
          </button>
        </header>
        <CreateFicheForm
          onCreated={handleCreated}
          onUnauthorized={() => {
            setCreateOpen(false);
            clearSession(); // <RequireAuth> renvoie vers /login
          }}
        />
      </section>
    </div>
  ) : null;

  if (isPending) return <Skeleton />;
  if (isError) {
    const expired = isAuthFailure(error);
    return (
      <div className="db">
        <div className="db-state" role="alert">
          <h2>
            {expired ? "Session expirée" : "Impossible de charger vos fiches"}
          </h2>
          <p>
            {expired
              ? "Reconnectez-vous pour retrouver votre espace."
              : "Vérifiez votre connexion puis réessayez."}
          </p>
          {expired ? (
            <a className="db-copy" href="/login">
              Se connecter
            </a>
          ) : (
            <button
              className="db-copy"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Chargement…" : "Réessayer"}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!fiches.length)
    return (
      <div className="db">
        <div className="db-state">
          <h2>Aucune fiche pour le moment</h2>
          <p>
            Créez votre première fiche connectée pour commencer à la
            personnaliser.
          </p>
          <button className="db-create-btn" onClick={() => setCreateOpen(true)}>
            + Créer ma fiche
          </button>
        </div>
        {createDialog}
      </div>
    );

  const cur = fiches.find(f => f.slug === sel) ?? fiches[0];
  const url = publicUrl(cur.slug),
    missing = checks(cur).filter(c => !c.ok),
    pc = completion(cur);
  const scans = fiches.reduce((s, f) => s + f.scansTotal, 0);
  const alerts = fiches.filter(f => health(f) !== "ok");
  const last = fiches.reduce(
    (a, f) => (f.updatedAt > a ? f.updatedAt : a),
    fiches[0].updatedAt
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* presse-papiers refusé : le lien reste affiché */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="db">
      <header className="db-head">
        <div className="db-head-row">
          <div>
            <p className="db-k">Espace client</p>
            <h1>Bonjour {user.name.split(" ")[0]}</h1>
            <p className="db-sub">Voici l’état de vos fiches connectées.</p>
          </div>
          <button className="db-create-btn" onClick={() => setCreateOpen(true)}>
            + Créer une fiche
          </button>
        </div>
      </header>

      {alerts.length > 0 && (
        <ul className="db-alerts" role="status">
          {alerts.map(f => (
            <li key={f.id} className={PILL[health(f)].cls}>
              <b>{displayName(f)}</b> —{" "}
              {PILL[health(f)].text(daysLeft(f.abonnementActif?.endsAt))}.{" "}
              <a href="#renouveler">Renouveler</a>
            </li>
          ))}
        </ul>
      )}

      <section className="db-kpis" aria-label="Chiffres clés">
        <div className="db-kpi">
          <span>Fiches</span>
          <b>{fiches.length}</b>
          <small>
            {fiches.filter(f => health(f) === "ok").length} en ligne
          </small>
        </div>
        <div className="db-kpi">
          <span>Passages NFC · QR</span>
          <b>{scans.toLocaleString("fr-FR")}</b>
          <small>
            {scans === 0
              ? "partagez votre QR pour commencer"
              : "toutes fiches confondues"}
          </small>
        </div>
        <div className="db-kpi">
          <span>Dernière modification</span>
          <b className="sm">{fmtDate(last)}</b>
          <small>sur l’ensemble de vos fiches</small>
        </div>
      </section>

      <div className="db-grid">
        <section aria-label="Mes fiches">
          <h2>Mes fiches</h2>
          <ul className="db-list">
            {fiches.map(f => {
              const h = health(f),
                c = completion(f);
              return (
                <li key={f.id} className={f.id === cur.id ? "on" : ""}>
                  <button
                    className="db-pick"
                    onClick={() => setSel(f.slug)}
                    aria-pressed={f.id === cur.id}
                  >
                    <span className="db-av">
                      {f.logo ? (
                        <img src={f.logo} alt="" />
                      ) : (
                        displayName(f).charAt(0)
                      )}
                    </span>
                    <span className="db-meta">
                      <b>{displayName(f)}</b>
                      <small>{f.fonction}</small>
                    </span>
                    {f.secteur && (
                      <em className="db-tag">{SECTEUR_LABEL[f.secteur]}</em>
                    )}
                  </button>
                  <div className="db-row">
                    <span className={`db-pill ${PILL[h].cls}`}>
                      {PILL[h].text(daysLeft(f.abonnementActif?.endsAt))}
                    </span>
                    {f.abonnementActif && (
                      <span className="db-plan">
                        {f.abonnementActif.plan.nom}
                      </span>
                    )}
                    {f.enLigneSeule && !f.abonnementActif && (
                      <span className="db-plan free">Créée gratuitement</span>
                    )}
                    <span className="db-scans">
                      <b>{f.scansTotal}</b> passage{f.scansTotal > 1 ? "s" : ""}
                    </span>
                    <span className="db-act">
                      <button onClick={() => onView(f.slug)}>Voir</button>
                      <a
                        className="db-public-link"
                        href={`/f/${encodeURIComponent(f.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Fiche publique
                      </a>
                      <button className="pri" onClick={() => onEdit(f.id)}>
                        Modifier
                      </button>
                    </span>
                  </div>
                  <div className="db-comp" title={`Fiche complète à ${c} %`}>
                    <i>
                      <u style={{ width: `${c}%` }} />
                    </i>
                    <span>{c} % complète</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {fiches.some(f => f.enLigneSeule && !f.abonnementActif) && (
            <aside className="db-up" id="upgrade">
              <div>
                <b>Allez plus loin avec une formule Pro ou Signature</b>
                <p>
                  Catalogue, galerie, avis Google, menu vidéo, biens immobiliers
                  et statistiques de scans.
                </p>
              </div>
              <a href="#upgrade">Découvrir</a>
            </aside>
          )}
        </section>

        <aside className="db-side" aria-label={`Détail de ${displayName(cur)}`}>
          <div className="db-card db-share">
            <h2>Partager</h2>
            {/* <QR text={url} logo={cur.logo ?? undefined} size={150} /> */}
            <code>{url.replace("https://", "")}</code>
            <button className="db-copy" onClick={copy} aria-live="polite">
              {copied ? "Lien copié ✓" : "Copier le lien"}
            </button>
          </div>
          <div className="db-card">
            <h2>Compléter « {displayName(cur)} »</h2>
            <p className="db-sub2">
              {pc === 100
                ? "Votre fiche est complète, bravo."
                : `${missing.length} élément${missing.length > 1 ? "s" : ""} à ajouter pour convaincre vos clients.`}
            </p>
            <ul className="db-todo">
              {checks(cur).map(c => (
                <li key={c.key} className={c.ok ? "ok" : ""}>
                  <span aria-hidden="true">{c.ok ? "✓" : ""}</span>
                  {c.label}
                </li>
              ))}
            </ul>
            {pc < 100 && (
              <button className="db-copy pri" onClick={() => onEdit(cur.id)}>
                Compléter ma fiche
              </button>
            )}
          </div>
        </aside>
      </div>
      {createDialog}
    </div>
  );
}
