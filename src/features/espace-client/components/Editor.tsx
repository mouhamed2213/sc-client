import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LAYOUTS,
  SIZES,
  TAB_TYPES,
  TEMPLATES,
  THEMES,
  applyTemplate,
  defaultTabs,
  newId,
  planOf,
} from "../../../lib/plans";
import type {
  BienData as Bien,
  Disposition,
  EnteteComplete,
  FicheData,
  FicheRecord,
  Onglet,
  Photo,
  Plan,
  Plat,
  Secteur,
  SectionCatalogue,
  SectionMenu,
  TabType,
  Taille,
  Theme,
} from "../../../types";
import { toFicheError } from "../lib/ficheSource";
import { uploadFicheMedia } from "../services/media.service";
import { optimizeImageFile } from "../services/mediaOptimizer";
import "./Editor.css";
import { I, QR } from "./Fiche";

/*
  Espace client (back-office membre).
  - « Mon activité » : modèle de page par métier (restaurant, immobilier, commerce, hôtel, indépendant, beauté).
  - Blocs : glisser-déposer au doigt ou à la souris (Pro et Signature), flèches du clavier sur la poignée.
  - Signature : palette de blocs à faire glisser dans la page (ou à toucher pour ajouter), renommer, supprimer,
    menu interactif (photo + vidéo courte par plat), biens immobiliers (photos + caractéristiques), entête modulable.
  - Tout ce qui dépasse la formule est verrouillé et renvoie vers l'offre supérieure.
  Les images et vidéos sont envoyées au stockage via l'API avant d'être référencées dans la fiche.
  Les URL locales ne sont utilisées que temporairement pour télécharger le QR ou lire les métadonnées vidéo.
*/
const UPGRADE_PATH = "/espace-client/abonnements";
const Lock = ({
  to = "Signature",
  children,
}: {
  to?: string;
  children: ReactNode;
}) => (
  <div className="ed-lock">
    <I n="star" s={14} />
    <span>{children}</span>
    <Link to={UPGRADE_PATH}>Passer en {to}</Link>
  </div>
);
const toURL = (f: Blob) => URL.createObjectURL(f);

/** Message lisible pour un échec d'upload : on garde le texte du serveur quel que soit le statut (403, 422, 503…). */
function uploadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : "Échec de l'envoi du média.";
  }
  if (!error.response) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.";
  }
  const { status, data } = error.response;
  const apiError = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
  // Route absente (API pas à jour) : ne pas la présenter comme « Fiche introuvable ».
  if (status === 404 && apiError?.code === "ROUTE_INTROUVABLE") {
    return "Le serveur ne propose pas l'envoi de médias : mettez l'API à jour.";
  }
  if (status === 401) return "Votre session a expiré. Reconnectez-vous pour continuer.";
  if (status === 413) return "Ce fichier est trop volumineux.";
  if (status === 429) return "Trop de requêtes. Patientez un instant puis réessayez.";
  return apiError?.message ?? toFicheError(error).message;
}

/** Upload helper shared by Editor and ContentEditor (separate component scope). */
async function uploadMedia(
  ficheId: number,
  file: File,
  purpose?: "menu"
) {
  try {
    const prepared = file.type.startsWith("image/")
      ? await optimizeImageFile(file)
      : file;
    return await uploadFicheMedia(ficheId, prepared, purpose);
  } catch (error) {
    // Les erreurs locales (format, compression) gardent leur texte ; celles du serveur gardent le leur.
    throw new Error(uploadErrorMessage(error));
  }
}

type DragPayload =
  | { kind: "move"; id: string; label: string }
  | { kind: "new"; type: TabType; label: string; id?: undefined };
type DragState = DragPayload & {
  x: number;
  y: number;
  over: number | null;
  moved: boolean;
};
type StartDrag = (
  e: ReactPointerEvent<HTMLButtonElement>,
  payload: DragPayload
) => void;

function useDnD(
  listRef: RefObject<HTMLUListElement>,
  onDrop: (d: DragState) => void
): [DragState | null, StartDrag] {
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
  const start: StartDrag = (e, payload) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX,
      sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const items = [
        ...(listRef.current?.querySelectorAll("[data-row]") || []),
      ];
      let over = items.length;
      for (let k = 0; k < items.length; k++) {
        const r = items[k].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          over = k;
          break;
        }
      }
      const lr = listRef.current!.getBoundingClientRect();
      const inside =
        ev.clientY > lr.top - 70 &&
        ev.clientY < lr.bottom + 70 &&
        ev.clientX > lr.left - 60 &&
        ev.clientX < lr.right + 60;
      ref.current = {
        ...ref.current!,
        x: ev.clientX,
        y: ev.clientY,
        over: inside ? over : null,
        moved:
          ref.current!.moved ||
          Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6,
      };
      setDrag(ref.current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = ref.current;
      ref.current = null;
      setDrag(null);
      if (d) onDrop(d);
    };
    ref.current = { ...payload, x: sx, y: sy, over: null, moved: false };
    setDrag(ref.current);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return [drag, start];
}

export default function Editor({
  fiche,
  onChange,
}: {
  fiche: FicheRecord;
  onChange: (f: FicheRecord) => void;
}) {
  const plan = planOf(fiche),
    sig = fiche.formule === "signature";
  const [sel, setSel] = useState<string | null>(null),
    [undo, setUndo] = useState<Partial<FicheData> | null>(null);
  const listRef = useRef<HTMLUListElement>(null),
    latest = useRef(fiche);
  latest.current = fiche;
  const up = (patch: Partial<FicheRecord>) =>
    onChange({ ...latest.current, ...patch });
  const upD = (patch: Partial<FicheData>) =>
    onChange({ ...latest.current, data: { ...latest.current.data, ...patch } });
  const tabsOf = (f: FicheRecord) =>
    (f.data.onglets?.length ? f.data.onglets : defaultTabs(f.formule)).filter(
      t => planOf(f).tabs.includes(t.type)
    );
  const tabs = tabsOf(fiche);
  const setTabs = (t: Onglet[]) => upD({ onglets: t });
  const e: EnteteComplete = {
    disposition: "portrait",
    taille: "m",
    theme: plan.theme,
    ...(fiche.data.entete || {}),
  };
  const setE = (patch: Partial<EnteteComplete>) =>
    upD({ entete: { ...e, ...patch } });
  const customCount = tabs.filter(t => t.type === "texte").length;
  const palette = (Object.keys(TAB_TYPES) as TabType[]).filter(
    k =>
      plan.tabs.includes(k) &&
      (k === "texte"
        ? customCount < (plan.maxCustomTabs || 0)
        : !tabs.some(t => t.type === k))
  );
  const mk = (type: TabType): Onglet => ({
    id: newId(type),
    type,
    visible: true,
    ...(type === "texte" ? { titre: "Nouvel onglet", contenu: "" } : {}),
  });

  const [drag, start] = useDnD(listRef, d => {
    const cur = tabsOf(latest.current);
    if (d.kind === "new") {
      if (!d.moved) {
        upD({ onglets: [...cur, mk(d.type)] });
        return;
      }
      if (d.over == null) return;
      const t = [...cur];
      t.splice(d.over, 0, mk(d.type));
      upD({ onglets: t });
    } else if (d.over != null && d.moved) {
      const from = cur.findIndex(x => x.id === d.id);
      let to = d.over;
      if (to > from) to -= 1;
      if (from < 0 || to === from) return;
      const t = [...cur];
      const [m] = t.splice(from, 1);
      t.splice(to, 0, m);
      upD({ onglets: t });
    }
  });
  const keyMove =
    (i: number) => (ev: ReactKeyboardEvent<HTMLButtonElement>) => {
      const j =
        ev.key === "ArrowUp" ? i - 1 : ev.key === "ArrowDown" ? i + 1 : null;
      if (j === null || j < 0 || j >= tabs.length) return;
      ev.preventDefault();
      const t = [...tabs];
      [t[i], t[j]] = [t[j], t[i]];
      setTabs(t);
    };
  const pickTemplate = (key: Secteur) => {
    setUndo({
      onglets: fiche.data.onglets,
      entete: fiche.data.entete,
      secteur: fiche.data.secteur,
    });
    const r = applyTemplate(fiche.formule, key, plan);
    upD({
      secteur: key,
      onglets: r.onglets,
      ...(sig ? { entete: { ...e, ...r.entete } } : {}),
    });
  };
  useEffect(() => {
    if (!undo) return undefined;
    const id = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(id);
  }, [undo]);
  const file =
    (cb: (url: string) => void) =>
    async (ev: ChangeEvent<HTMLInputElement>) => {
      const input = ev.currentTarget;
      const f = input.files?.[0];
      try {
        if (f && /^image\//.test(f.type)) {
          const media = await uploadMedia(fiche.id, f);
          cb(media.url);
        }
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Échec de l'envoi du média."
        );
      } finally {
        input.value = "";
      }
    };

  return (
    <div className="ed">
      <div className={`ed-plan p-${fiche.formule}`}>
        <div>
          <small>Votre formule</small>
          <b>
            {plan.label}
            {fiche.enLigneSeule ? " · en ligne" : ""}
          </b>
        </div>
        {!sig && (
          <Link to={UPGRADE_PATH} className="ed-up">
            Découvrir la Signature <I n="arrow" s={13} />
          </Link>
        )}
      </div>

      <details className="ed-box">
        <summary>
          Mon QR code <small>et sticker téléphone 30 mm</small>
        </summary>
        <div className="ed-qr">
          <div className="ed-qr-v" id="ed-qr-svg">
            <QR
              text={`https://supportconnecte.com/f/${fiche.slug}`}
              logo={fiche.logo}
              size={132}
            />
          </div>
          <div className="ed-qr-t">
            <p>
              Le QR code de votre fiche :{" "}
              <b>supportconnecte.com/f/{fiche.slug}</b>. C’est le même que celui
              de votre carte.
            </p>
            <button
              className="ed-add-b"
              onClick={() => {
                const svg = document.querySelector("#ed-qr-svg svg");
                if (!svg) return;
                const url = URL.createObjectURL(
                  new Blob([svg.outerHTML], { type: "image/svg+xml" })
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = `qr-${fiche.slug}.svg`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 2000);
              }}
            >
              Télécharger mon QR (vectoriel)
            </button>
            <a
              className="ed-up"
              href={`https://supportconnecte.com/contact?sujet=qr#formulaire`}
              target="_blank"
              rel="noreferrer"
            >
              Commander mon sticker 30 mm <I n="arrow" s={13} />
            </a>
          </div>
        </div>
      </details>

      <details open className="ed-box">
        <summary>
          Mon activité <small>modèle de page</small>
        </summary>
        <div className="ed-tpl">
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <button
              key={k}
              className={fiche.data.secteur === k ? "on" : ""}
              onClick={() => pickTemplate(k as Secteur)}
            >
              <I n={t.icon} s={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        {undo && (
          <p className="ed-undo">
            Modèle appliqué.{" "}
            <button
              onClick={() => {
                upD(undo);
                setUndo(null);
              }}
            >
              Annuler
            </button>
          </p>
        )}
        <p className="ed-hint">
          Le modèle place les bons blocs dans le bon ordre pour votre métier.
          Vous gardez la main ensuite.
        </p>
      </details>

      <details open className="ed-box">
        <summary>Blocs de ma page</summary>
        {!plan.canReorder && (
          <Lock to="Pro">
            L’Essentielle affiche Présentation, Réseaux et Localisation.
            Glisser-déposer, galerie, produits et avis : dès la Pro.
          </Lock>
        )}
        {plan.canReorder && (
          <p className="ed-hint">
            <I n="drag" s={14} /> Faites glisser la poignée pour changer l’ordre
            {sig ? ", ou glissez un bloc de la palette dans la page." : "."}
          </p>
        )}
        <ul className={`ed-tabs${drag ? " dragging" : ""}`} ref={listRef}>
          {tabs.map((t, i) => (
            <li
              key={t.id}
              data-row
              className={`${sel === t.id ? "sel " : ""}${drag?.over === i && drag.moved ? "drop-before " : ""}${drag?.id === t.id && drag.moved ? "ghosted" : ""}`}
            >
              <div className="ed-tab-h">
                {plan.canReorder && (
                  <button
                    className="ed-handle"
                    aria-label={`Déplacer ${t.titre || TAB_TYPES[t.type].label} (flèches haut et bas)`}
                    onPointerDown={ev =>
                      start(ev, {
                        kind: "move",
                        id: t.id,
                        label: t.titre || TAB_TYPES[t.type].label,
                      })
                    }
                    onKeyDown={keyMove(i)}
                  >
                    <I n="drag" s={16} />
                  </button>
                )}
                <span className="ed-ic">
                  <I n={TAB_TYPES[t.type].icon} s={14} />
                </span>
                {plan.canRename ? (
                  <input
                    className="ed-title"
                    value={t.titre ?? TAB_TYPES[t.type].label}
                    onChange={ev =>
                      setTabs(
                        tabs.map(x =>
                          x.id === t.id ? { ...x, titre: ev.target.value } : x
                        )
                      )
                    }
                    aria-label="Titre du bloc"
                  />
                ) : (
                  <b>{TAB_TYPES[t.type].label}</b>
                )}
                {plan.canHide && (
                  <label className="ed-tg" title="Afficher">
                    <input
                      type="checkbox"
                      checked={t.visible !== false}
                      onChange={ev =>
                        setTabs(
                          tabs.map(x =>
                            x.id === t.id
                              ? { ...x, visible: ev.target.checked }
                              : x
                          )
                        )
                      }
                    />
                    <span />
                  </label>
                )}
                {EDITABLE.includes(t.type) && (
                  <button
                    className="ed-edit"
                    onClick={() => setSel(sel === t.id ? null : t.id)}
                  >
                    {sel === t.id ? "Fermer" : "Modifier"}
                  </button>
                )}
                {plan.canAdd && (
                  <button
                    className="ed-del"
                    onClick={() => setTabs(tabs.filter(x => x.id !== t.id))}
                    aria-label="Retirer le bloc"
                  >
                    ×
                  </button>
                )}
              </div>
              {sel === t.id && (
                <ContentEditor
                  tab={t}
                  fiche={fiche}
                  plan={plan}
                  up={up}
                  upD={upD}
                  setTabs={setTabs}
                  tabs={tabs}
                />
              )}
            </li>
          ))}
          {drag?.moved && drag.over === tabs.length && (
            <li className="ed-drop-end" />
          )}
        </ul>
        {sig ? (
          <div className="ed-pal">
            <p className="ed-k">Palette : glissez un bloc dans la page</p>
            <div className="ed-pal-l">
              {palette.map(k => (
                <button
                  key={k}
                  className="ed-chip"
                  onPointerDown={ev =>
                    start(ev, {
                      kind: "new",
                      type: k,
                      label: TAB_TYPES[k].label,
                    })
                  }
                >
                  <I n={TAB_TYPES[k].icon} s={14} />
                  {TAB_TYPES[k].label}
                  <I n="plus" s={12} />
                </button>
              ))}
              {!palette.length && (
                <small>Tous les blocs sont déjà sur la page.</small>
              )}
            </div>
            <small>
              {customCount}/{plan.maxCustomTabs} onglets personnalisés
            </small>
          </div>
        ) : fiche.formule === "pro" ? (
          <Lock>
            Ajouter des blocs (menu vidéo, biens immobiliers, rendez-vous,
            formulaire, texte libre) : en Signature.
          </Lock>
        ) : null}
        {drag?.moved && (
          <div className="ed-ghost" style={{ left: drag.x, top: drag.y }}>
            <I n={drag.kind === "new" ? "plus" : "drag"} s={14} />
            {drag.label}
          </div>
        )}
      </details>

      <details className="ed-box">
        <summary>Identité</summary>
        <div className="ed-grid">
          {(
            [
              ["prenom", "Prénom / nom commercial"],
              ["nom", "Nom"],
              ["fonction", "Fonction"],
              ["entreprise", "Entreprise"],
              ["telephone", "Téléphone"],
              ["whatsapp", "WhatsApp"],
              ["email", "E-mail"],
              ["adresse", "Adresse"],
            ] as const
          ).map(([k, l]) => (
            <label key={k}>
              <span>{l}</span>
              <input
                value={fiche[k] || ""}
                onChange={ev => up({ [k]: ev.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="ed-files">
          <label className="ed-file">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={file(u => up({ photo: u }))}
            />
            {fiche.photo ? <img src={fiche.photo} alt="" /> : <I n="user" />}
            <span>Photo de profil</span>
          </label>
          <label className="ed-file">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={file(u => up({ logo: u }))}
            />
            {fiche.logo ? <img src={fiche.logo} alt="" /> : <I n="image" />}
            <span>Logo</span>
          </label>
        </div>
      </details>

      <details className="ed-box">
        <summary>Entête et apparence</summary>
        {sig ? (
          <>
            <p className="ed-k">Disposition de la photo et du logo</p>
            <div className="ed-layouts">
              {Object.entries(LAYOUTS).map(([k, v]) => (
                <button
                  key={k}
                  className={e.disposition === k ? "on" : ""}
                  onClick={() => setE({ disposition: k as Disposition })}
                >
                  <i className={`mini mi-${k}`}>
                    <b />
                    <u />
                  </i>
                  <strong>{v.label}</strong>
                  <small>{v.hint}</small>
                </button>
              ))}
            </div>
            <div className="ed-row">
              <div>
                <p className="ed-k">Taille</p>
                <div className="ed-seg">
                  {Object.entries(SIZES).map(([k, l]) => (
                    <button
                      key={k}
                      className={e.taille === k ? "on" : ""}
                      onClick={() => setE({ taille: k as Taille })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="ed-k">Thème</p>
                <div className="ed-themes">
                  {Object.entries(THEMES).map(([k, l]) => (
                    <button
                      key={k}
                      className={`tt-${k}${e.theme === k ? " on" : ""}`}
                      onClick={() => setE({ theme: k as Theme })}
                      title={l}
                      aria-label={l}
                    />
                  ))}
                </div>
              </div>
            </div>
            {(e.disposition === "logo" || e.disposition === "banniere") && (
              <label className="ed-file wide">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={file(u => setE({ couverture: u }))}
                />
                {e.couverture ? (
                  <img src={e.couverture} alt="" />
                ) : (
                  <I n="image" />
                )}
                <span>Photo de couverture</span>
              </label>
            )}
          </>
        ) : (
          <Lock>
            Entête modulable (logo, bannière, duo), tailles et thèmes :
            disponibles en Signature.
          </Lock>
        )}
      </details>
    </div>
  );
}

const EDITABLE: TabType[] = [
  "presentation",
  "texte",
  "horaires",
  "menu",
  "biens",
  "catalogue",
  "galerie",
  "videos",
  "liens",
  "rendezvous",
  "rappel",
  "avis",
  "reseaux",
  "localisation",
];

interface ContentEditorProps {
  tab: Onglet;
  fiche: FicheRecord;
  plan: Plan;
  up: (patch: Partial<FicheRecord>) => void;
  upD: (patch: Partial<FicheData>) => void;
  setTabs: (t: Onglet[]) => void;
  tabs: Onglet[];
}
function ContentEditor({
  tab,
  fiche,
  plan,
  up,
  upD,
  setTabs,
  tabs,
}: ContentEditorProps) {
  const d = fiche.data;
  const latest = useRef(fiche);
  latest.current = fiche;
  const [err, setErr] = useState("");
  switch (tab.type) {
    case "presentation":
      return (
        <label className="ed-area">
          <textarea
            rows={4}
            maxLength={plan.maxPresentation}
            value={d.presentation || ""}
            onChange={ev => upD({ presentation: ev.target.value })}
          />
          <small>
            {(d.presentation || "").length} / {plan.maxPresentation}
          </small>
        </label>
      );
    case "texte":
      return (
        <label className="ed-area">
          <textarea
            rows={3}
            value={tab.contenu || ""}
            onChange={ev =>
              setTabs(
                tabs.map(x =>
                  x.id === tab.id ? { ...x, contenu: ev.target.value } : x
                )
              )
            }
          />
        </label>
      );
    case "horaires": {
      // ADAPTATION (hors référence) : une fiche neuve de l'API n'a AUCUN horaire en base. On affiche donc
      // toujours les 7 jours ; un jour laissé vide n'est pas enregistré. Avec des données déjà complètes
      // (cas de la référence), le rendu et le comportement sont identiques.
      const JOURS = [
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
        "Dimanche",
      ];
      const H = d.horaires || [];
      const valeur = (j: string) => H.find(h => h.jour === j)?.horaire ?? "";
      return (
        <div className="ed-hours">
          {JOURS.map(jour => (
            <label key={jour}>
              <span>{jour}</span>
              <input
                value={valeur(jour)}
                onChange={ev =>
                  upD({
                    horaires: JOURS.map(x => ({
                      jour: x,
                      horaire: x === jour ? ev.target.value : valeur(x),
                    })).filter(h => h.horaire !== ""),
                  })
                }
              />
            </label>
          ))}
        </div>
      );
    }
    case "reseaux": {
      const R = d.reseauxSociaux || [];
      return (
        <div className="ed-items">
          {R.map((r, i) => (
            <div key={i} className="ed-it2">
              <input
                placeholder="Réseau (ex. Instagram)"
                aria-label={`Nom du réseau social ${i + 1}`}
                value={r.label}
                onChange={ev =>
                  upD({
                    reseauxSociaux: R.map((x, j) =>
                      j === i ? { ...x, label: ev.target.value } : x
                    ),
                  })
                }
              />
              <input
                placeholder="https://..."
                aria-label={`Adresse du réseau social ${i + 1}`}
                value={r.url}
                onChange={ev =>
                  upD({
                    reseauxSociaux: R.map((x, j) =>
                      j === i ? { ...x, url: ev.target.value } : x
                    ),
                  })
                }
              />
              <button
                className="ed-del"
                type="button"
                aria-label={`Retirer le réseau social ${i + 1}`}
                onClick={() =>
                  upD({ reseauxSociaux: R.filter((_, j) => j !== i) })
                }
              >
                ×
              </button>
            </div>
          ))}
          {R.length < plan.maxSocial && (
            <button
              className="ed-add-b"
              type="button"
              onClick={() =>
                upD({ reseauxSociaux: [...R, { label: "", url: "" }] })
              }
            >
              + Ajouter un réseau social
            </button>
          )}
          <small className="ed-cnt">
            {R.length}/{plan.maxSocial} réseaux sociaux
          </small>
        </div>
      );
    }
    case "rendezvous": {
      const rdv = d.rendezVous || { label: "", url: "" };
      return (
        <div className="ed-items">
          <label>
            <span>Libellé du bouton</span>
            <input
              value={rdv.label}
              maxLength={80}
              placeholder="Ex. Prendre rendez-vous"
              onChange={ev =>
                upD({ rendezVous: { ...rdv, label: ev.target.value } })
              }
            />
          </label>
          <label>
            <span>Lien de réservation</span>
            <input
              value={rdv.url}
              placeholder="https://..."
              onChange={ev =>
                upD({ rendezVous: { ...rdv, url: ev.target.value } })
              }
            />
          </label>
        </div>
      );
    }
    case "videos": {
      const G = d.galerie || [];
      const V = G.filter(media => media.type === "video");
      const setVideos = (next: Photo[]) =>
        upD({
          galerie: [...G.filter(media => media.type !== "video"), ...next],
        });
      return (
        <div className="ed-items">
          {V.map((video, i) => (
            <div key={i} className="ed-it2">
              <input
                value={video.url}
                placeholder="URL de la vidéo (https://...)"
                aria-label={`URL de la vidéo ${i + 1}`}
                onChange={ev =>
                  setVideos(
                    V.map((x, j) =>
                      j === i ? { ...x, url: ev.target.value } : x
                    )
                  )
                }
              />
              <button
                className="ed-del"
                type="button"
                aria-label={`Retirer la vidéo ${i + 1}`}
                onClick={() => setVideos(V.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          {V.length < plan.maxVideos && (
            <button
              className="ed-add-b"
              type="button"
              onClick={() =>
                setVideos([...V, { type: "video", url: "", alt: "" }])
              }
            >
              + Ajouter une vidéo par URL
            </button>
          )}
          <small className="ed-cnt">
            {V.length}/{plan.maxVideos} vidéos
          </small>
          <label className="ed-add-b">
            <input
              type="file"
              accept="video/mp4,video/webm"
              style={{ display: "none" }}
              disabled={V.length >= plan.maxVideos}
              onChange={async ev => {
                const input = ev.currentTarget;
                const selected = input.files?.[0];
                try {
                  if (!selected || !/^video\/(mp4|webm)$/.test(selected.type))
                    return;
                  const current = latest.current.data.galerie || [];
                  const videos = current.filter(
                    media => media.type === "video"
                  );
                  if (videos.length >= plan.maxVideos) return;
                  const uploaded = await uploadMedia(fiche.id, selected);
                  const latestGallery = latest.current.data.galerie || [];
                  upD({
                    galerie: [
                      ...latestGallery.filter(media => media.type !== "video"),
                      ...videos,
                      { type: "video", url: uploaded.url, alt: "" },
                    ],
                  });
                } catch (error) {
                  window.alert(
                    error instanceof Error
                      ? error.message
                      : "Échec de l'envoi de la vidéo."
                  );
                } finally {
                  input.value = "";
                }
              }}
            />
            + Importer une vidéo
          </label>
          <p className="ed-hint">
            Formats acceptés : MP4 et WebM, 30 Mo maximum par vidéo.
          </p>
        </div>
      );
    }
    case "rappel":
      return (
        <div className="ed-items">
          <label>
            <span>Téléphone pour être rappelé</span>
            <input
              value={fiche.telephone || ""}
              placeholder="+221..."
              onChange={ev => up({ telephone: ev.target.value })}
            />
          </label>
          <label>
            <span>WhatsApp</span>
            <input
              value={fiche.whatsapp || ""}
              placeholder="+221..."
              onChange={ev => up({ whatsapp: ev.target.value })}
            />
          </label>
        </div>
      );
    case "localisation":
      return (
        <div className="ed-items">
          <label>
            <span>Adresse</span>
            <input
              value={fiche.adresse || ""}
              placeholder="Adresse de l’activité"
              onChange={ev => up({ adresse: ev.target.value })}
            />
          </label>
          <label>
            <span>Lien ou identifiant Google Maps (facultatif)</span>
            <input
              value={fiche.googlePlaceId || ""}
              placeholder="Identifiant Google Place"
              onChange={ev => up({ googlePlaceId: ev.target.value })}
            />
          </label>
        </div>
      );
    case "avis":
      return (
        <div className="ed-items">
          <label>
            <span>Identifiant Google Place</span>
            <input
              value={fiche.googlePlaceId || ""}
              placeholder="Identifiant Google Place"
              onChange={ev => up({ googlePlaceId: ev.target.value })}
            />
          </label>
          <p className="ed-hint">
            Cet identifiant permet d’associer les avis Google à votre
            établissement.
          </p>
        </div>
      );
    case "liens": {
      const L = d.liens || [];
      return (
        <div className="ed-items">
          {L.map((l, k) => (
            <div key={k} className="ed-it2">
              <input
                placeholder="Libellé"
                value={l.label}
                onChange={ev =>
                  upD({
                    liens: L.map((x, j) =>
                      j === k ? { ...x, label: ev.target.value } : x
                    ),
                  })
                }
              />
              <input
                placeholder="https://"
                value={l.url}
                onChange={ev =>
                  upD({
                    liens: L.map((x, j) =>
                      j === k ? { ...x, url: ev.target.value } : x
                    ),
                  })
                }
              />
              <button
                className="ed-del"
                onClick={() => upD({ liens: L.filter((_, j) => j !== k) })}
              >
                ×
              </button>
            </div>
          ))}
          {L.length < plan.maxLinks && (
            <button
              className="ed-add-b"
              onClick={() => upD({ liens: [...L, { label: "", url: "" }] })}
            >
              + Ajouter un lien
            </button>
          )}
          <small className="ed-cnt">
            {L.length}/{plan.maxLinks}
          </small>
        </div>
      );
    }
    case "galerie": {
      const allMedia = d.galerie || [];
      const G = allMedia.filter(media => media.type !== "video");
      return (
        <div className="ed-gal">
          {G.map((g, k) => (
            <span key={g.url || k}>
              <img src={g.url} alt={g.alt || ""} />
              <button
                onClick={() =>
                  upD({
                    galerie: allMedia.filter(media => media.url !== g.url),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
          {G.length < plan.maxPhotos && (
            <label className="ed-gal-add">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={async ev => {
                  const input = ev.currentTarget;
                  const files = [...(input.files || [])]
                    .filter(f => /^image\/(jpeg|png|webp)$/.test(f.type))
                    .slice(0, Math.max(0, plan.maxPhotos - G.length));
                  const add: Photo[] = [];
                  try {
                    for (const f of files) {
                      const uploaded = await uploadMedia(fiche.id, f);
                      add.push({ type: "image", url: uploaded.url, alt: "" });
                    }
                    if (add.length) {
                      const current = latest.current.data.galerie || [];
                      upD({ galerie: [...current, ...add] });
                    }
                  } catch (error) {
                    window.alert(
                      error instanceof Error
                        ? error.message
                        : "Échec de l'envoi d'une image."
                    );
                    if (add.length) {
                      const current = latest.current.data.galerie || [];
                      upD({ galerie: [...current, ...add] });
                    }
                  } finally {
                    input.value = "";
                  }
                }}
              />
              <I n="plus" s={18} />
            </label>
          )}
          <small className="ed-cnt">
            {G.length}/{plan.maxPhotos} photos
          </small>
        </div>
      );
    }
    case "catalogue": {
      const S = d.sections || [];
      const setS = (v: SectionCatalogue[]) => upD({ sections: v });
      return (
        <div className="ed-items">
          {S.length > plan.maxCatalogSections! && (
            <p className="ed-err" role="alert">
              Votre formule autorise {plan.maxCatalogSections} section(s) :
              retirez-en {S.length - plan.maxCatalogSections!} pour pouvoir
              enregistrer.
            </p>
          )}
          {S.map((s, si) => (
            <div key={si} className="ed-sec">
              <input
                className="ed-sec-t"
                value={s.titre}
                onChange={ev =>
                  setS(
                    S.map((x, j) =>
                      j === si ? { ...x, titre: ev.target.value } : x
                    )
                  )
                }
              />
              {s.articles.map((a, ai) => (
                <div key={ai} className="ed-it">
                  <label className="ed-thumb">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async ev => {
                        const input = ev.currentTarget;
                        const f = input.files?.[0];
                        try {
                          if (!f) return;
                          const uploaded = await uploadMedia(fiche.id, f);
                          const currentSections =
                            latest.current.data.sections || [];
                          setS(
                            currentSections.map((x, j) =>
                              j === si
                                ? {
                                    ...x,
                                    articles: x.articles.map((y, k) =>
                                      k === ai
                                        ? { ...y, photo: uploaded.url }
                                        : y
                                    ),
                                  }
                                : x
                            )
                          );
                        } catch (error) {
                          window.alert(
                            error instanceof Error
                              ? error.message
                              : "Échec de l'envoi de l'image."
                          );
                        } finally {
                          input.value = "";
                        }
                      }}
                    />
                    {a.photo ? (
                      <img src={a.photo} alt="" />
                    ) : (
                      <I n="image" s={16} />
                    )}
                  </label>
                  <input
                    placeholder="Nom"
                    value={a.nom}
                    onChange={ev =>
                      setS(
                        S.map((x, j) =>
                          j === si
                            ? {
                                ...x,
                                articles: x.articles.map((y, k) =>
                                  k === ai ? { ...y, nom: ev.target.value } : y
                                ),
                              }
                            : x
                        )
                      )
                    }
                  />
                  {plan.catalogPrices && (
                    <input
                      className="ed-price"
                      placeholder="Prix"
                      inputMode="numeric"
                      value={a.prix || ""}
                      onChange={ev =>
                        setS(
                          S.map((x, j) =>
                            j === si
                              ? {
                                  ...x,
                                  articles: x.articles.map((y, k) =>
                                    k === ai
                                      ? {
                                          ...y,
                                          prix: ev.target.value.replace(
                                            /\D/g,
                                            ""
                                          ),
                                        }
                                      : y
                                  ),
                                }
                              : x
                          )
                        )
                      }
                    />
                  )}
                  <button
                    className="ed-del"
                    type="button"
                    aria-label={`Retirer l'article ${a.nom || ai + 1}`}
                    onClick={() =>
                      setS(
                        S.map((x, j) =>
                          j === si
                            ? {
                                ...x,
                                articles: x.articles.filter((_, k) => k !== ai),
                              }
                            : x
                        )
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              {s.articles.length > plan.maxCatalogArticlesPerSection! && (
                <p className="ed-err" role="alert">
                  {plan.maxCatalogArticlesPerSection} articles maximum par
                  section : retirez-en{" "}
                  {s.articles.length - plan.maxCatalogArticlesPerSection!}.
                </p>
              )}
              {s.articles.length < plan.maxCatalogArticlesPerSection! && (
                <button
                  className="ed-add-b"
                  onClick={() =>
                    setS(
                      S.map((x, j) =>
                        j === si
                          ? {
                              ...x,
                              articles: [
                                ...x.articles,
                                {
                                  nom: "",
                                  description: "",
                                  prix: "",
                                  devise: "XOF",
                                },
                              ],
                            }
                          : x
                      )
                    )
                  }
                >
                  + Article
                </button>
              )}
              <button
                className="ed-link"
                type="button"
                onClick={() => setS(S.filter((_, j) => j !== si))}
              >
                Retirer cette section
              </button>
            </div>
          ))}
          {S.length < plan.maxCatalogSections! && (
            <button
              className="ed-add-b"
              onClick={() =>
                setS([...S, { titre: "Nouvelle section", articles: [] }])
              }
            >
              + Section
            </button>
          )}
          {!plan.catalogPrices && (
            <Lock>
              Prix et bouton « Commander » sur chaque article : en Signature.
            </Lock>
          )}
        </div>
      );
    }
    case "menu": {
      const M = d.menu?.sections || [];
      const setM = (v: SectionMenu[]) => upD({ menu: { sections: v } });
      const setP = (si: number, pi: number, patch: Partial<Plat>) =>
        setM(
          M.map((x, j) =>
            j === si
              ? {
                  ...x,
                  plats: x.plats.map((y, k) =>
                    k === pi ? { ...y, ...patch } : y
                  ),
                }
              : x
          )
        );
      const vid =
        (si: number, pi: number) => (ev: ChangeEvent<HTMLInputElement>) => {
          const f = ev.target.files![0];
          ev.target.value = "";
          if (!f || !/^video\/(mp4|webm)$/.test(f.type)) {
            if (f)
              setErr("Format vidéo non pris en charge. Utilisez MP4 ou WebM.");
            return;
          }
          const localUrl = toURL(f);
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = async () => {
            if (v.duration > plan.maxMenuVideoSeconds! + 0.5) {
              setErr(
                `Vidéo trop longue : ${plan.maxMenuVideoSeconds} secondes maximum.`
              );
              URL.revokeObjectURL(localUrl);
              return;
            }
            try {
              setErr("");
              const uploaded = await uploadMedia(fiche.id, f, "menu");
              setP(si, pi, { video: uploaded.url });
            } catch (error) {
              setErr(
                error instanceof Error
                  ? error.message
                  : "Échec de l'envoi de la vidéo."
              );
            } finally {
              URL.revokeObjectURL(localUrl);
            }
          };
          v.onerror = () => {
            URL.revokeObjectURL(localUrl);
            setErr("Impossible de lire cette vidéo. Essayez un autre fichier MP4 ou WebM.");
          };
          v.src = localUrl;
        };
      return (
        <div className="ed-items">
          {M.map((s, si) => (
            <div key={si} className="ed-sec">
              <input
                className="ed-sec-t"
                value={s.titre}
                onChange={ev =>
                  setM(
                    M.map((x, j) =>
                      j === si ? { ...x, titre: ev.target.value } : x
                    )
                  )
                }
              />
              {s.plats.map((p, pi) => (
                <div key={pi} className="ed-dish">
                  <label className="ed-thumb">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async ev => {
                        const input = ev.currentTarget;
                        const f = input.files?.[0];
                        try {
                          if (!f) return;
                          const uploaded = await uploadMedia(fiche.id, f);
                          setP(si, pi, { image: uploaded.url });
                        } catch (error) {
                          window.alert(
                            error instanceof Error
                              ? error.message
                              : "Échec de l'envoi de l'image."
                          );
                        } finally {
                          input.value = "";
                        }
                      }}
                    />
                    {p.image ? (
                      <img src={p.image} alt="" />
                    ) : (
                      <I n="image" s={16} />
                    )}
                  </label>
                  <div className="ed-dish-f">
                    <div className="ed-it2">
                      <input
                        placeholder="Nom du plat"
                        value={p.nom}
                        onChange={ev => setP(si, pi, { nom: ev.target.value })}
                      />
                      <input
                        className="ed-price"
                        placeholder="Prix"
                        inputMode="numeric"
                        value={p.prix || ""}
                        onChange={ev =>
                          setP(si, pi, {
                            prix: ev.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Description"
                      value={p.description || ""}
                      onChange={ev =>
                        setP(si, pi, { description: ev.target.value })
                      }
                    />
                    <label className="ed-vid">
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={vid(si, pi)}
                      />
                      <I n="play" s={14} />
                      {p.video
                        ? "Vidéo ajoutée · remplacer"
                        : `Ajouter une vidéo courte (${plan.maxMenuVideoSeconds} s max, verticale)`}
                    </label>
                  </div>
                  <button
                    className="ed-del"
                    type="button"
                    aria-label={`Retirer le plat ${p.nom || pi + 1}`}
                    onClick={() =>
                      setM(
                        M.map((x, j) =>
                          j === si
                            ? { ...x, plats: x.plats.filter((_, k) => k !== pi) }
                            : x
                        )
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              {s.plats.length > plan.maxMenuItemsPerSection! && (
                <p className="ed-err" role="alert">
                  {plan.maxMenuItemsPerSection} plats maximum par section :
                  retirez-en {s.plats.length - plan.maxMenuItemsPerSection!}.
                </p>
              )}
              {s.plats.length < plan.maxMenuItemsPerSection! && (
                <button
                  className="ed-add-b"
                  onClick={() =>
                    setM(
                      M.map((x, j) =>
                        j === si
                          ? {
                              ...x,
                              plats: [
                                ...x.plats,
                                { nom: "", prix: "", description: "" },
                              ],
                            }
                          : x
                      )
                    )
                  }
                >
                  + Plat
                </button>
              )}
              <button
                className="ed-link"
                type="button"
                onClick={() => setM(M.filter((_, j) => j !== si))}
              >
                Retirer cette section
              </button>
            </div>
          ))}
          {err && (
            <p className="ed-err" role="alert">
              {err}
            </p>
          )}
          {M.length < plan.maxMenuSections! && (
            <button
              className="ed-add-b"
              onClick={() =>
                setM([...M, { titre: "Nouvelle section", plats: [] }])
              }
            >
              + Section du menu
            </button>
          )}
        </div>
      );
    }
    case "biens": {
      const Bs = d.biens || [];
      const setB = (i: number, patch: Partial<Bien>) => {
        const current = latest.current.data.biens || [];
        upD({
          biens: current.map((x, j) => (j === i ? { ...x, ...patch } : x)),
        });
      };
      return (
        <div className="ed-items">
          {Bs.map((b, i) => (
            <div key={i} className="ed-sec">
              <div className="ed-it2">
                <input
                  placeholder="Titre du bien"
                  value={b.titre}
                  onChange={ev => setB(i, { titre: ev.target.value })}
                />
                <select
                  value={b.type}
                  onChange={ev =>
                    setB(i, { type: ev.target.value as Bien["type"] })
                  }
                >
                  <option value="vente">À vendre</option>
                  <option value="location">À louer</option>
                </select>
              </div>
              <div className="ed-specs">
                {(
                  [
                    ["prix", "Prix (F)"],
                    ["ville", "Ville"],
                    ["surface", "Surface m²"],
                    ["terrain", "Terrain m²"],
                    ["chambres", "Chambres"],
                    ["sdb", "Salles de bain"],
                  ] as const
                ).map(([k, l]) => (
                  <label key={k}>
                    <span>{l}</span>
                    <input
                      value={b[k] ?? ""}
                      onChange={ev =>
                        setB(i, {
                          [k]:
                            k === "ville"
                              ? ev.target.value
                              : ev.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="Description"
                value={b.description || ""}
                onChange={ev => setB(i, { description: ev.target.value })}
              />
              <div className="ed-gal">
                {(b.photos || []).map((u, k) => (
                  <span key={k}>
                    <img src={u} alt="" />
                    <button
                      onClick={() =>
                        setB(i, { photos: b.photos!.filter((_, j) => j !== k) })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(b.photos || []).length < plan.maxPhotosPerBien! && (
                  <label className="ed-gal-add">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={async ev => {
                        const input = ev.currentTarget;
                        const files = [...(input.files || [])]
                          .filter(f => /^image\/(jpeg|png|webp)$/.test(f.type))
                          .slice(
                            0,
                            Math.max(
                              0,
                              plan.maxPhotosPerBien! - (b.photos || []).length
                            )
                          );
                        const added: string[] = [];
                        try {
                          for (const f of files) {
                            const uploaded = await uploadMedia(fiche.id, f);
                            added.push(uploaded.url);
                          }
                          if (added.length) {
                            const current = latest.current.data.biens?.[i];
                            if (current)
                              setB(i, {
                                photos: [...(current.photos || []), ...added],
                              });
                          }
                        } catch (error) {
                          if (added.length) {
                            const current = latest.current.data.biens?.[i];
                            if (current)
                              setB(i, {
                                photos: [...(current.photos || []), ...added],
                              });
                          }
                          window.alert(
                            error instanceof Error
                              ? error.message
                              : "Échec de l'envoi d'une photo du bien."
                          );
                        } finally {
                          input.value = "";
                        }
                      }}
                    />
                    <I n="plus" s={18} />
                  </label>
                )}
                <small className="ed-cnt">
                  {(b.photos || []).length}/{plan.maxPhotosPerBien} photos
                </small>
              </div>
              <button
                className="ed-link"
                onClick={() => upD({ biens: Bs.filter((_, j) => j !== i) })}
              >
                Retirer ce bien
              </button>
            </div>
          ))}
          {Bs.length < plan.maxBiens! ? (
            <button
              className="ed-add-b"
              onClick={() =>
                upD({
                  biens: [
                    ...Bs,
                    {
                      titre: "",
                      type: "vente",
                      prix: "",
                      ville: "",
                      photos: [],
                    },
                  ],
                })
              }
            >
              + Ajouter un bien
            </button>
          ) : (
            <p className="ed-limit">
              Limite de {plan.maxBiens} biens atteinte. Au-delà, nous créons ou
              refondons le site internet de votre agence avec l’ensemble de vos
              biens : parlez-en à votre conseiller.
            </p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
