import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { apiPost } from "../lib/api";
import "../styles/layout.css";
import { readClientUser } from "./useClientUser";

/*
  Cadre de l'espace client : menu latéral (Tableau de bord, Paramètres) + zone de contenu (<Outlet />).
  Mobile : le menu devient un tiroir ouvert par le bouton ☰ (Échap, clic à côté ou changement de page = fermeture).
  Routes enfants : index (tableau de bord), fiches/:slug (éditeur), parametres.
*/
const BASE = "/espace-client";
const P: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
  out: "M10 4H5v16h5M15 8l4 4-4 4M9 12h10",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
};
const Ico = ({ n }: { n: string }) => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={P[n]} />
  </svg>
);

const NAV: {
  to: string;
  label: string;
  icon: string;
  match: (p: string) => boolean;
}[] = [
  {
    to: BASE,
    label: "Tableau de bord",
    icon: "grid",
    match: p =>
      p === BASE || p === `${BASE}/` || p.startsWith(`${BASE}/fiches`),
  },
  {
    to: `${BASE}/editeur`,
    label: "Éditeur de fiches",
    icon: "edit",
    match: p => p.startsWith(`${BASE}/editeur`),
  },
  {
    to: `${BASE}/parametres`,
    label: "Paramètres",
    icon: "sliders",
    match: p => p.startsWith(`${BASE}/parametres`),
  },
];

export default function ClientLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const user = readClientUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const logout = async () => {
    try {
      await apiPost("auth/logout");
    } catch {
      /* session déjà expirée : on quitte quand même */
    }
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    window.location.assign("/login");
  };

  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />;

  return (
    <div className={`cl${open ? " open" : ""}`}>
      <a className="cl-skip" href="#cl-main">
        Aller au contenu
      </a>

      <header className="cl-bar">
        <button
          className="cl-burger"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          aria-controls="cl-nav"
        >
          <Ico n="menu" />
        </button>
        <span className="cl-brand sm">
          <img src="/images/symbole-s.webp" alt="" width="28" height="28" />{" "}
          Support Connecté
        </span>
      </header>

      <aside
        className="cl-side"
        id="cl-nav"
        aria-label="Navigation de l’espace client"
      >
        <div className="cl-top">
          <span className="cl-brand">
            <img src="/images/symbole-s.webp" alt="" width="34" height="34" />
            <span>
              Support Connecté<small>Espace client</small>
            </span>
          </span>
          <button
            className="cl-close"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
          >
            <Ico n="x" />
          </button>
        </div>
        <nav aria-label="Principal">
          <ul className="cl-nav">
            {NAV.map(n => {
              const on = n.match(pathname);
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={on ? "on" : undefined}
                    aria-current={on ? "page" : undefined}
                  >
                    <Ico n={n.icon} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="cl-user">
          <span className="cl-av" aria-hidden="true">
            {user.name.charAt(0)}
          </span>
          <span className="cl-who">
            <b>{user.name}</b>
            <small>{user.email}</small>
          </span>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <Ico n="out" />
          </button>
        </div>
      </aside>
      <div
        className="cl-scrim"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <main id="cl-main" className="cl-main" tabIndex={-1}>
        {children ?? <Outlet context={{ user }} />}
      </main>
    </div>
  );
}
