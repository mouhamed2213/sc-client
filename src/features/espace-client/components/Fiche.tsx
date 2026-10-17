import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { cssVars } from "../../../lib/css";
import { ENV } from "../../../lib/env";
import { TAB_TYPES, planOf, visibleTabs } from "../../../lib/plans";
import type {
  BienData as Bien,
  EnteteComplete,
  FicheRecord,
  Onglet,
  Plat,
} from "../../../types";
import { qrMatrix } from "../../../utils/qr";
import { downloadVCard } from "../lib/vcard";
import "./Fiche.css";

/*
  Fiche connectée V2 (page publique ouverte par la carte NFC / le QR).
  - Onglets pliables, dans l'ordre et selon les droits de la formule (lib/plans.ts).
  - Entête modulable en Signature : portrait, logo, bannière, duo · 3 tailles · 4 thèmes.
  - « Tirer pour le QR » : en haut de page, on tire vers le bas → la photo remonte et le QR code
    de la fiche apparaît (avec le logo) ; on relâche → tout reprend sa place.
    Aussi : molette vers le haut (ordinateur) et bouton « NFC · QR » (accessibilité).
*/
const PATHS: Record<string, string> = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  menu: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
  play: "M5 4h14v16H5zM10 9l5 3-5 3z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  chat: "M4 5h16v11H9l-5 4z",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  text: "M5 6h14M5 12h14M5 18h9",
  wa: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z",
  phone:
    "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z",
  mail: "M3 6h18v12H3zM3.5 6.5l8.5 6.5 8.5-6.5",
  home: "M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6",
  close: "M6 6l12 12M18 6L6 18",
  bed: "M3 19v-9h18v9M3 15h18M7 10V7h5v3",
  bath: "M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0",
  area: "M4 4h16v16H4zM9 4v5H4M20 15h-5v5",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  plus: "M12 5v14M5 12h14",
  down: "M12 4v11M7 10l5 5 5-5M5 20h14",
  chev: "M6 9l6 6 6-6",
  arrow: "M7 17L17 7M9 7h8v8",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
};
export const I = ({ n, s = 18 }: { n: string; s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[n]} />
  </svg>
);

export function QR({
  text,
  logo,
  size = 200,
}: {
  text: string;
  logo?: string;
  size?: number;
}) {
  const m = useMemo(() => qrMatrix(text), [text]);
  if (!m)
    return (
      <div className="qr-fallback" style={{ width: size, height: size }}>
        QR
      </div>
    );
  const q = 4,
    n = m.n + q * 2,
    rects: string[] = [];
  for (let r = 0; r < m.n; r++)
    for (let c = 0; c < m.n; c++)
      if (m.dark(r, c)) rects.push(`M${c + q} ${r + q}h1v1h-1z`);
  const hole = Math.round(m.n * 0.26),
    start = q + Math.floor((m.n - hole) / 2);
  return (
    <svg
      className="qr"
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label="QR code de la fiche"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={rects.join("")} fill="#0c0c0c" />
      {logo && (
        <>
          <rect
            x={start - 0.5}
            y={start - 0.5}
            width={hole + 1}
            height={hole + 1}
            rx="1.2"
            fill="#fff"
          />
          <image
            href={logo}
            x={start}
            y={start}
            width={hole}
            height={hole}
            preserveAspectRatio="xMidYMid meet"
          />
        </>
      )}
    </svg>
  );
}

const initials = (f: FicheRecord) =>
  `${(f.prenom || "")[0] || ""}${(f.nom || "")[0] || ""}`.toUpperCase() || "SC";
const today = () =>
  ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][
    new Date().getDay()
  ];
const wa = (num: string, msg?: string) =>
  `https://wa.me/${(num || "").replace(/\D/g, "")}${msg ? "?text=" + encodeURIComponent(msg) : ""}`;
const fcfa = (p?: string) =>
  p ? `${new Intl.NumberFormat("fr-FR").format(Number(p))} FCFA` : "";

function usePullQR(
  rootRef: RefObject<HTMLDivElement>,
  scrollerRef?: RefObject<HTMLDivElement>
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const root = rootRef.current!,
      sc = scrollerRef?.current || null;
    const top = () => (sc ? sc.scrollTop : window.scrollY) <= 0;
    let startY: number | null = null,
      pull = 0,
      timer = 0;
    const set = (v: number) => {
      pull = v;
      root.style.setProperty("--pull", v.toFixed(1));
      root.style.setProperty("--p01", Math.min(1, v / 150).toFixed(3));
      root.classList.toggle("pulling", v > 4);
    };
    const release = () => {
      startY = null;
      root.classList.add("rel");
      set(0);
      setTimeout(() => root.classList.remove("rel"), 480);
    };
    const onStart = (y: number) => {
      if (top()) {
        startY = y;
        root.classList.remove("rel");
      }
    };
    const onMove = (y: number, e?: Event) => {
      if (startY === null) return;
      const dy = y - startY;
      if (dy > 0 && top()) {
        if (e?.cancelable) e.preventDefault();
        set(Math.min(300, dy * 0.55));
      } else if (dy <= 0 && pull) set(0);
    };
    const ts = (e: TouchEvent) => onStart(e.touches[0].clientY),
      tm = (e: TouchEvent) => onMove(e.touches[0].clientY, e),
      te = () => startY !== null && release();
    const pd = (e: PointerEvent) => {
      if (
        e.pointerType === "mouse" &&
        e.button === 0 &&
        (e.target as Element).closest(".f-hero")
      )
        onStart(e.clientY);
    };
    const pm = (e: PointerEvent) => {
        if (e.pointerType === "mouse") onMove(e.clientY, e);
      },
      pu = (e: PointerEvent) => {
        if (e.pointerType === "mouse" && startY !== null) release();
      };
    const wh = (e: WheelEvent) => {
      if (e.deltaY < 0 && top()) {
        root.classList.remove("rel");
        set(Math.min(300, pull + -e.deltaY * 0.35));
        clearTimeout(timer);
        timer = setTimeout(release, 380);
      }
    };
    const el = sc || window;
    root.addEventListener("touchstart", ts, { passive: true });
    root.addEventListener("touchmove", tm, { passive: false });
    root.addEventListener("touchend", te);
    root.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    el.addEventListener("wheel", wh as EventListener, { passive: true });
    return () => {
      root.removeEventListener("touchstart", ts);
      root.removeEventListener("touchmove", tm);
      root.removeEventListener("touchend", te);
      root.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      el.removeEventListener("wheel", wh as EventListener);
      clearTimeout(timer);
    };
  }, [rootRef, scrollerRef]);
  return [held, setHeld];
}

interface SectionProps {
  tab: Onglet;
  fiche: FicheRecord;
  open: boolean;
  onToggle: () => void;
}
function Section({ tab, fiche, open, onToggle }: SectionProps) {
  const d = fiche.data,
    T = TAB_TYPES[tab.type];
  const title = tab.titre || T.label;
  const hToday = d.horaires?.find(h => h.jour === today());
  const summary =
    tab.type === "horaires" && hToday
      ? `Aujourd’hui : ${hToday.horaire}`
      : tab.type === "catalogue"
        ? `${(d.sections || []).reduce((a, s) => a + s.articles.filter(x => x.nom).length, 0)} articles`
        : "";
  return (
    <section className={`f-sec${open ? " open" : ""}`}>
      <button className="f-sec-h" onClick={onToggle} aria-expanded={open}>
        <span className="f-ic">
          <I n={T.icon} s={15} />
        </span>
        <b>{title}</b>
        <i className="f-line" />
        {summary && <small>{summary}</small>}
        <span className="f-chev">
          <I n="chev" s={14} />
        </span>
      </button>
      <div className="f-sec-b">
        <div>{open && <SectionBody tab={tab} fiche={fiche} />}</div>
      </div>
    </section>
  );
}

/* ───────── Vidéos de la fiche ───────── */
type VideoSource =
  | { kind: "embed"; src: string; vertical?: boolean }
  | { kind: "file"; src: string }
  | { kind: "link"; src: string };

/** Reconnaît YouTube / Vimeo / TikTok (lecteur intégré), les fichiers vidéo directs, sinon un simple lien. */
export function videoSourceOf(raw: string): VideoSource | null {
  const url = raw.trim();
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null; // jamais javascript: / data:
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const seg = u.pathname.split("/").filter(Boolean);

  let yt: string | null = null;
  if (host === "youtu.be") yt = seg[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") yt = u.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(seg[0])) yt = seg[1] ?? null;
  }
  if (yt && /^[\w-]{6,20}$/.test(yt))
    return {
      kind: "embed",
      src: `https://www.youtube-nocookie.com/embed/${yt}`,
      vertical: seg[0] === "shorts",
    };

  if (host === "vimeo.com") {
    const id = seg.find(x => /^\d+$/.test(x));
    if (id)
      return { kind: "embed", src: `https://player.vimeo.com/video/${id}` };
  }
  if (
    host === "player.vimeo.com" &&
    seg[0] === "video" &&
    /^\d+$/.test(seg[1] ?? "")
  )
    return { kind: "embed", src: url };

  if (host === "tiktok.com") {
    const i = seg.indexOf("video");
    if (i >= 0 && /^\d+$/.test(seg[i + 1] ?? ""))
      return {
        kind: "embed",
        src: `https://www.tiktok.com/embed/v2/${seg[i + 1]}`,
        vertical: true,
      };
  }

  if (
    /\.(mp4|webm|mov|m4v)$/i.test(u.pathname) ||
    u.pathname.includes("/api/media/")
  )
    return { kind: "file", src: url };
  return { kind: "link", src: url };
}

function VideoItem({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const v = videoSourceOf(url);
  if (!v) return null;
  if (v.kind === "embed")
    return (
      <div className={`f-vid${v.vertical ? " v" : ""}`}>
        <iframe
          src={v.src}
          title="Vidéo"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  if (v.kind === "file" && !failed)
    return (
      <div className="f-vid">
        <video
          src={v.src}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </div>
    );
  return (
    <a className="f-vid-link" href={v.src} target="_blank" rel="noreferrer">
      {failed
        ? "La vidéo ne peut pas être lue ici — l’ouvrir"
        : "Voir la vidéo"}
      <I n="arrow" s={14} />
    </a>
  );
}

function Carousel<T>({
  items,
  render,
  label,
}: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  label: string;
}) {
  const [i, setI] = useState(0);
  if (!items.length) return null;
  return (
    <div className="f-car">
      <div className="f-car-v">
        {render(items[i], i)}
        {items.length > 1 && (
          <>
            <button
              className="f-car-b l"
              onClick={() => setI((i - 1 + items.length) % items.length)}
              aria-label="Précédent"
            >
              <I n="left" s={16} />
            </button>
            <button
              className="f-car-b r"
              onClick={() => setI((i + 1) % items.length)}
              aria-label="Suivant"
            >
              <I n="right" s={16} />
            </button>
          </>
        )}
      </div>
      <div className="f-car-n">
        <small>
          {label} {i + 1} / {items.length}
        </small>
        <span>
          {items.map((_, k) => (
            <i key={k} className={k === i ? "on" : ""} />
          ))}
        </span>
      </div>
    </div>
  );
}

function SectionBody({ tab, fiche }: { tab: Onglet; fiche: FicheRecord }) {
  const d = fiche.data,
    plan = planOf(fiche);
  const [sent, setSent] = useState(false);
  const [rappelSubmitting, setRappelSubmitting] = useState(false);
  const [rappelError, setRappelError] = useState("");
  switch (tab.type) {
    case "presentation":
      return (
        <p className="f-txt">
          {(d.presentation || "").slice(0, plan.maxPresentation)}
        </p>
      );
    case "reseaux":
      return (
        <div className="f-soc">
          {(d.reseauxSociaux || []).slice(0, plan.maxSocial).map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
              <span>
                <I n="globe" s={15} />
              </span>
              {s.label}
              <I n="arrow" s={13} />
            </a>
          ))}
        </div>
      );
    case "horaires":
      return (
        <ul className="f-hours">
          {(d.horaires || []).map(h => (
            <li key={h.jour} className={h.jour === today() ? "now" : ""}>
              <span>
                {h.jour}
                {h.jour === today() && <em>Aujourd’hui</em>}
              </span>
              <b>{h.horaire}</b>
            </li>
          ))}
        </ul>
      );
    case "catalogue":
      return (
        <div className="f-cat">
          {(d.sections || [])
            .filter(s => s.articles.some(a => a.nom))
            .slice(0, plan.maxCatalogSections || 0)
            .map(s => (
              <div key={s.titre} className="f-cat-s">
                <p className="f-cat-t">{s.titre}</p>
                {s.articles
                  .filter(a => a.nom)
                  .slice(0, plan.maxCatalogArticlesPerSection)
                  .map(a => (
                    <div key={a.nom} className="f-art">
                      {a.photo && (
                        <img
                          className="f-art-img"
                          src={a.photo}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <div className="f-art-m">
                        <b>
                          {a.nom}
                          {a.badge && (
                            <em className={`bd-${a.badge}`}>{a.badge}</em>
                          )}
                        </b>
                        {a.description && <span>{a.description}</span>}
                      </div>
                      {plan.catalogPrices && (
                        <div className="f-art-r">
                          {a.prix && <strong>{fcfa(a.prix)}</strong>}
                          <a
                            href={wa(
                              fiche.whatsapp,
                              `Bonjour, je souhaite commander : ${a.nom}`
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Commander
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
        </div>
      );
    case "menu":
      return <MenuBlock fiche={fiche} />;
    case "biens":
      return <BiensBlock fiche={fiche} />;
    case "galerie":
      return (
        <Carousel
          label="Photo"
          items={(d.galerie || [])
            .filter(g => g.type !== "video" && g.url)
            .slice(0, plan.maxPhotos)}
          render={g => <img src={g.url} alt={g.alt || ""} loading="lazy" />}
        />
      );
    case "videos": {
      const vids = (d.galerie || [])
        .filter(g => g.type === "video" && g.url.trim())
        .slice(0, plan.maxVideos);
      return vids.length ? (
        <div className="f-vids">
          {vids.map((g, k) => (
            <VideoItem key={`${g.url}-${k}`} url={g.url} />
          ))}
        </div>
      ) : (
        <p className="f-txt muted">
          Ajoutez jusqu’à {plan.maxVideos} vidéos (YouTube, Vimeo, TikTok ou
          fichier MP4/WebM).
        </p>
      );
    }
    case "liens":
      return (
        <div className="f-links">
          {(d.liens || []).slice(0, plan.maxLinks).map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
              <I n="arrow" s={14} />
            </a>
          ))}
        </div>
      );
    case "rappel":
      return sent ? (
        <p className="f-ok" role="status">
          Merci ! Votre demande a bien été envoyée à l’établissement.
        </p>
      ) : (
        <form
          className="f-form"
          onSubmit={async e => {
            e.preventDefault();
            if (rappelSubmitting) return;
            const form = e.currentTarget;
            const formData = new FormData(form);
            setRappelSubmitting(true);
            setRappelError("");
            try {
              await api.post(
                `fiches/public/${encodeURIComponent(fiche.slug)}/rappels`,
                {
                  nom: String(formData.get("nom") || "").trim(),
                  telephone: String(formData.get("telephone") || "").trim(),
                }
              );
              setSent(true);
            } catch {
              setRappelError(
                "Impossible d’envoyer la demande. Vérifiez vos coordonnées puis réessayez."
              );
            } finally {
              setRappelSubmitting(false);
            }
          }}
        >
          <p className="f-txt">
            Laissez vos coordonnées, l’établissement vous rappelle rapidement.
          </p>
          <input
            name="nom"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Votre nom"
          />
          <input
            name="telephone"
            required
            type="tel"
            minLength={7}
            maxLength={25}
            autoComplete="tel"
            placeholder="Votre téléphone"
          />
          {rappelError && (
            <p className="f-error" role="alert">
              {rappelError}
            </p>
          )}
          <button
            className="f-btn gold"
            type="submit"
            disabled={rappelSubmitting}
          >
            {rappelSubmitting ? "Envoi en cours…" : "Demander un rappel"}{" "}
            <I n="arrow" s={14} />
          </button>
        </form>
      );
    case "rendezvous":
      return (
        <a
          className="f-btn gold"
          href={d.rendezVous?.url || wa(fiche.whatsapp, d.messageWhatsapp)}
          target="_blank"
          rel="noreferrer"
        >
          <I n="cal" s={16} />
          {d.rendezVous?.label || "Prendre rendez-vous"}
        </a>
      );
    case "localisation":
      return (
        <div>
          <p className="f-txt">{fiche.adresse}</p>
          <a
            className="f-btn gold"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fiche.adresse || "")}${fiche.googlePlaceId ? `&query_place_id=${fiche.googlePlaceId}` : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir Google Maps <I n="arrow" s={14} />
          </a>
        </div>
      );
    case "avis":
      return (
        <div className="f-review">
          <div>
            <b>Votre expérience compte</b>
            <span>Partagez votre avis sur Google en un clic.</span>
          </div>
          <a
            className="f-btn gold sm"
            href={
              fiche.googlePlaceId
                ? `https://search.google.com/local/writereview?placeid=${fiche.googlePlaceId}`
                : "#"
            }
            target="_blank"
            rel="noreferrer"
          >
            <I n="star" s={14} />
            Laisser un avis
          </a>
        </div>
      );
    case "texte":
      return <p className="f-txt">{tab.contenu}</p>;
    default:
      return null;
  }
}

interface FicheProps {
  fiche: FicheRecord;
  scrollerRef?: RefObject<HTMLDivElement>;
  baseUrl?: string;
}
interface Action {
  k: string;
  n: string;
  l: string;
  href: string;
}

export default function Fiche({
  fiche,
  scrollerRef,
  baseUrl = `${ENV.VITE_BASE_URL}/f/`,
}: FicheProps) {
  const publicAppUrl = (
    import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  ).replace(/\/+$/, "");
  const root = useRef<HTMLDivElement>(null);
  const [held, setHeld] = usePullQR(root, scrollerRef);
  const plan = planOf(fiche);
  const e: EnteteComplete = {
    disposition: "portrait",
    taille: "m",
    theme: plan.theme,
    ...(fiche.formule === "signature" ? fiche.data.entete : {}),
  };
  if (!plan.headerLayouts.includes(e.disposition)) e.disposition = "portrait";
  if (!plan.themes.includes(e.theme)) e.theme = plan.theme;
  const tabs = visibleTabs(fiche);
  const [open, setOpen] = useState(
    () => new Set(tabs.slice(0, 1).map(t => t.id))
  );
  const url = `${baseUrl ?? `${publicAppUrl}/f/`}${fiche.slug}?source=qr`;
  const name = `${fiche.prenom} ${fiche.nom}`.trim();
  const actions = [
    fiche.whatsapp && {
      k: "whatsapp",
      n: "wa",
      l: "WhatsApp",
      href: wa(fiche.whatsapp, fiche.data.messageWhatsapp),
    },
    fiche.telephone && {
      k: "appel",
      n: "phone",
      l: "Appeler",
      href: `tel:${fiche.telephone.replace(/\s/g, "")}`,
    },
    fiche.email && {
      k: "email",
      n: "mail",
      l: "E-mail",
      href: `mailto:${fiche.email}`,
    },
  ]
    .filter((a): a is Action => !!a)
    .sort(
      (a, b) =>
        Number(b.k === fiche.data.premierBouton) -
        Number(a.k === fiche.data.premierBouton)
    );
  const avatar = (cls = "") => (
    <span className={`f-av ${cls}`}>
      {fiche.photo ? <img src={fiche.photo} alt={name} /> : initials(fiche)}
    </span>
  );
  const logo = (cls = "") =>
    fiche.logo ? (
      <span className={`f-logo ${cls}`}>
        <img src={fiche.logo} alt={fiche.entreprise || name} />
      </span>
    ) : null;

  useEffect(() => {
    root.current!.style.setProperty("--pull", held ? "210" : "0");
    root.current!.style.setProperty("--p01", held ? "1" : "0");
    root.current!.classList.toggle("pulling", held);
    root.current!.classList.add("rel");
  }, [held]);

  return (
    <div
      className={`fiche th-${e.theme} ly-${e.disposition} sz-${e.taille} f-${fiche.formule}`}
      ref={root}
    >
      <header
        className="f-hero"
        style={
          e.couverture &&
          (e.disposition === "logo" || e.disposition === "banniere")
            ? cssVars({ "--cover": `url(${e.couverture})` })
            : undefined
        }
      >
        <div className="f-chips">
          <span>Fiche de contact</span>
          <button onClick={() => setHeld(h => !h)} aria-pressed={held}>
            <I n="qr" s={12} />
            NFC · QR
          </button>
        </div>
        <div className="f-qrp" aria-hidden={!held}>
          <QR text={url} logo={fiche.logo} size={176} />
          <p>Scannez pour ouvrir la fiche de {fiche.prenom}</p>
        </div>
        <div className="f-id">
          {e.disposition === "portrait" && (
            <>
              {avatar()}
              <div className="f-names">
                <h1>{name}</h1>
                <p>{fiche.fonction}</p>
                {fiche.entreprise && (
                  <span className="f-org">{fiche.entreprise}</span>
                )}
              </div>
            </>
          )}
          {e.disposition === "duo" && (
            <>
              <span className="f-duo">
                {avatar()}
                {logo("badge")}
              </span>
              <div className="f-names">
                <h1>{name}</h1>
                <p>{fiche.fonction}</p>
                {fiche.entreprise && (
                  <span className="f-org">{fiche.entreprise}</span>
                )}
              </div>
            </>
          )}
          {e.disposition === "logo" && (
            <div className="f-center">
              {logo("big") || avatar()}
              <h1>{name}</h1>
              <p>{fiche.fonction}</p>
            </div>
          )}
          {e.disposition === "banniere" && (
            <div className="f-ban">
              {logo("badge-lg")}
              <div>
                <h1>{name}</h1>
                <p>
                  {fiche.fonction}
                  {fiche.entreprise ? ` · ${fiche.entreprise}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="f-hint">
          <I n="down" s={12} />
          Tirez vers le bas pour afficher le QR code
        </p>
        <nav className="f-acts">
          {actions.map((a, i) => (
            <a
              key={a.k}
              href={a.href}
              className={i === 0 ? "main" : ""}
              target={a.k === "whatsapp" ? "_blank" : undefined}
              rel="noreferrer"
            >
              <I n={a.n} s={16} />
              {a.l}
            </a>
          ))}
        </nav>
      </header>
      <main className="f-body">
        {tabs.map(t => (
          <Section
            key={t.id}
            tab={t}
            fiche={fiche}
            open={open.has(t.id)}
            onToggle={() =>
              setOpen(s => {
                const n = new Set(s);
                n.has(t.id) ? n.delete(t.id) : n.add(t.id);
                return n;
              })
            }
          />
        ))}
        <footer className="f-foot">
          <div>
            <span>Mentions légales · Confidentialité</span>
            <a href={publicAppUrl} target="_blank" rel="noreferrer">
              Support Connecté <I n="arrow" s={11} />
            </a>
          </div>
          <p>
            Les informations envoyées via cette fiche servent uniquement à
            répondre à votre demande. Vous pouvez demander leur suppression en
            contactant l’établissement.
          </p>
          {fiche.enLigneSeule && (
            <a
              className="f-badge"
              href={publicAppUrl}
              target="_blank"
              rel="noreferrer"
            >
              Créée avec <b>Support Connecté</b>
            </a>
          )}
        </footer>
      </main>
      <button className="f-save" onClick={() => downloadVCard(fiche, url)}>
        <I n="down" s={15} />
        Enregistrer le contact
      </button>
    </div>
  );
}

/* ---------- Feuille modale (plat, bien) ---------- */
function Sheet({
  onClose,
  children,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div
      className="f-sheet-bg"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="f-sheet" onClick={e => e.stopPropagation()}>
        <button className="f-sheet-x" onClick={onClose} aria-label="Fermer">
          <I n="close" s={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Menu interactif : vignette → vidéo courte verticale + description ---------- */
function MenuBlock({ fiche }: { fiche: FicheRecord }) {
  const sections = (fiche.data.menu?.sections || []).filter(x =>
    x.plats?.some(p => p.nom)
  );
  const [sec, setSec] = useState(0),
    [open, setOpen] = useState<Plat | null>(null),
    [vidErr, setVidErr] = useState(false);
  if (!sections.length)
    return <p className="f-txt muted">Le menu arrive bientôt.</p>;
  const cur = sections[Math.min(sec, sections.length - 1)];
  return (
    <div className="f-menu">
      {sections.length > 1 && (
        <div className="f-chipsbar">
          {sections.map((x, i) => (
            <button
              key={x.titre}
              className={i === sec ? "on" : ""}
              onClick={() => setSec(i)}
            >
              {x.titre}
            </button>
          ))}
        </div>
      )}
      <div className="f-dishes">
        {cur.plats
          .filter(p => p.nom)
          .map(p => (
            <button
              key={p.nom}
              className="f-dish"
              onClick={() => {
                setVidErr(false);
                setOpen(p);
              }}
            >
              <span className="f-dish-img">
                {p.image ? <img src={p.image} alt="" loading="lazy" /> : <i />}
                {p.video && (
                  <span className="f-play">
                    <I n="play" s={14} />
                  </span>
                )}
                {p.badge && <em>{p.badge}</em>}
              </span>
              <b>{p.nom}</b>
              {p.prix && <span>{fcfa(p.prix)}</span>}
            </button>
          ))}
      </div>
      {open && (
        <Sheet onClose={() => setOpen(null)} label={open.nom}>
          <div className="f-short">
            {open.video && !vidErr ? (
              <video
                key={open.video}
                poster={open.image}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVidErr(true)}
              >
                {open.videoWebm && (
                  <source src={open.videoWebm} type="video/webm" />
                )}
                <source
                  src={open.video}
                  type="video/mp4"
                  onError={() => setVidErr(true)}
                />
              </video>
            ) : (
              <img className="kb" src={open.image} alt="" />
            )}
            <span className="f-short-bar">
              <i />
            </span>
          </div>
          <div className="f-sheet-b">
            <div className="f-sheet-h">
              <b>{open.nom}</b>
              {open.prix && <strong>{fcfa(open.prix)}</strong>}
            </div>
            {open.description && <p>{open.description}</p>}
            <a
              className="f-btn gold"
              href={wa(
                fiche.whatsapp,
                `Bonjour, je souhaite commander : ${open.nom}`
              )}
              target="_blank"
              rel="noreferrer"
            >
              <I n="wa" s={16} />
              Commander ce plat
            </a>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ---------- Biens immobiliers : photos à faire défiler, prix, caractéristiques ---------- */
const prixBien = (b: Bien) =>
  b.prix
    ? `${new Intl.NumberFormat("fr-FR").format(Number(b.prix))} FCFA${b.type === "location" ? ` / ${b.periode || "mois"}` : ""}`
    : "Prix sur demande";
function Photos({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="f-ph">
      <div
        className="f-ph-track"
        onScroll={e =>
          setI(
            Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
          )
        }
      >
        {photos.map((u, k) => (
          <img
            key={k}
            src={u}
            alt={k ? "" : alt}
            loading="lazy"
            draggable="false"
          />
        ))}
      </div>
      {photos.length > 1 && (
        <span className="f-ph-dots">
          {photos.map((_, k) => (
            <i key={k} className={k === i ? "on" : ""} />
          ))}
        </span>
      )}
      {photos.length > 1 && (
        <span className="f-ph-n">
          {i + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

function BiensBlock({ fiche }: { fiche: FicheRecord }) {
  const all = (fiche.data.biens || []).slice(0, planOf(fiche).maxBiens || 0);
  const [f, setF] = useState("tous"),
    [open, setOpen] = useState<Bien | null>(null);
  const list = all.filter(b => f === "tous" || b.type === f);
  if (!all.length)
    return <p className="f-txt muted">Aucun bien pour le moment.</p>;
  return (
    <div className="f-biens">
      <div className="f-chipsbar">
        {[
          ["tous", "Tous"],
          ["vente", "À vendre"],
          ["location", "À louer"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={f === k ? "on" : ""}
            onClick={() => setF(k)}
          >
            {l}{" "}
            <small>
              {k === "tous" ? all.length : all.filter(b => b.type === k).length}
            </small>
          </button>
        ))}
      </div>
      {list.map(b => (
        <article key={b.titre} className="f-bien">
          <div className="f-bien-media">
            <Photos photos={b.photos || []} alt={b.titre} />
            <em className={`f-tag t-${b.type}`}>
              {b.type === "location" ? "À louer" : "À vendre"}
            </em>
          </div>
          <button className="f-bien-b" onClick={() => setOpen(b)}>
            <strong>{prixBien(b)}</strong>
            <b>{b.titre}</b>
            <span className="f-bien-v">
              <I n="pin" s={12} />
              {b.ville}
            </span>
            <span className="f-specs">
              {b.surface && (
                <span>
                  <I n="area" s={13} />
                  {b.surface} m²
                </span>
              )}
              {b.chambres && (
                <span>
                  <I n="bed" s={13} />
                  {b.chambres} ch.
                </span>
              )}
              {b.sdb && (
                <span>
                  <I n="bath" s={13} />
                  {b.sdb} sdb
                </span>
              )}
            </span>
            <span className="f-more">
              Voir le bien <I n="arrow" s={12} />
            </span>
          </button>
        </article>
      ))}
      {open && (
        <Sheet onClose={() => setOpen(null)} label={open.titre}>
          <div className="f-sheet-media">
            <Photos photos={open.photos || []} alt={open.titre} />
          </div>
          <div className="f-sheet-b">
            <em className={`f-tag in t-${open.type}`}>
              {open.type === "location" ? "À louer" : "À vendre"}
            </em>
            <div className="f-sheet-h">
              <b>{open.titre}</b>
            </div>
            <strong className="f-price">{prixBien(open)}</strong>
            <ul className="f-grid-specs">
              {(
                [
                  ["area", "Surface", open.surface && `${open.surface} m²`],
                  ["home", "Terrain", open.terrain && `${open.terrain} m²`],
                  ["bed", "Chambres", open.chambres],
                  ["bath", "Salles de bain", open.sdb],
                  ["pin", "Ville", open.ville],
                ] as const
              )
                .filter(x => x[2])
                .map(([ic, l, v]) => (
                  <li key={l}>
                    <I n={ic} s={15} />
                    <span>{l}</span>
                    <b>{v}</b>
                  </li>
                ))}
            </ul>
            {!!open.atouts?.length && (
              <div className="f-atouts">
                {open.atouts.map(a => (
                  <span key={a}>{a}</span>
                ))}
              </div>
            )}
            {open.description && <p>{open.description}</p>}
            <a
              className="f-btn gold"
              href={wa(
                fiche.whatsapp,
                `Bonjour, je suis intéressé(e) par : ${open.titre}`
              )}
              target="_blank"
              rel="noreferrer"
            >
              <I n="wa" s={16} />
              Je suis intéressé(e)
            </a>
          </div>
        </Sheet>
      )}
    </div>
  );
}
