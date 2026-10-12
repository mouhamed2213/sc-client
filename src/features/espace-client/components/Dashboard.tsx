import { useState } from "react";
import "../../espace-client/styles/dashboard.css";
import { useDashboardFiches } from "../hooks/useDashboardFiches";
import { ApiError } from "../lib/api";
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

/*
  Tableau de bord de l'espace client. Données : GET client/dashboard/fiches (TanStack Query, hook useDashboardFiches).
  ⚠️ Le serveur ne renvoie pas encore la formule, l'échéance ni le contenu des blocs : le tableau de bord n'affiche donc
  que ce qui existe (état, passages, complétude de la fiche). Dès que `abonnementActif` est ajouté à la réponse,
  la formule et les alertes d'échéance s'affichent d'elles-mêmes.
*/
interface Props {
  user: { name: string };
  onEdit: (slug: string) => void;
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

  if (isPending) return <Skeleton />;
  if (isError) {
    const expired =
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403);
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
            <a className="db-copy" href="/connexion">
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
            Aucune fiche n’est rattachée à votre compte. Contactez Support
            Connecté avec le code de votre carte.
          </p>
        </div>
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
        <p className="db-k">Espace client</p>
        <h1>Bonjour {user.name.split(" ")[0]}</h1>
        <p className="db-sub">Voici l’état de vos fiches connectées.</p>
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
                      <button className="pri" onClick={() => onEdit(f.slug)}>
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
            <button className="db-copy" onClick={copy}>
              {/* <I n="link" s={15} /> {copied ? "Lien copié ✓" : "Copier le lien"} */}
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
              <button className="db-copy pri" onClick={() => onEdit(cur.slug)}>
                Compléter ma fiche
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
