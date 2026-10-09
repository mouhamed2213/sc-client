import { lazy, Suspense, useEffect } from "react";
import {
  Link,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { IconSprite } from "./components/Icons";
import { SECTORS } from "./data/secteurs";
// import LoginPage from "./features/auth/pages/LoginPage"; // Importez votre page de connexion
import RegisterPage from "./features/auth/pages/RegisterPage";
import AProposPage from "./pages/AProposPage";
import BrandingPage from "./pages/BrandingPage";
import CartesPage from "./pages/CartesPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import LegalPage, { LEGAL_PATHS } from "./pages/LegalPage";
import PanneauxPage from "./pages/PanneauxPage";
import QrSmartPage from "./pages/QrSmartPage";
import SecteursPage from "./pages/SecteursPage";
import LoginPage from "./features/auth/pages/LoginPage";

// Pages chargées à la demande
const ContenuPage = lazy(() => import("./pages/ContenuPage"));
const ImmobilierPage = lazy(() => import("./pages/ImmobilierPage"));

const SECTOR_IDS: string[] = SECTORS.map(x => x.id);

// Écran d'attente pendant le chargement d'une page lazy
const Wait = () => (
  <div style={{ minHeight: "100vh", background: "#08090A" }} aria-busy="true" />
);

// Remonte en haut de page à chaque changement de route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Layout pour les pages publiques :
 * Inclut le Header et le Footer autour du contenu rendu par <Outlet />.
 */
function PublicLayout() {
  return (
    <>
      <Header current="" />
      <Outlet />
      <Footer current="" />
    </>
  );
}

function NotFound() {
  return (
    <>
      <IconSprite />
      <Header current="" />
      <main className="notfound">
        <div>
          <p className="label light">Erreur 404</p>
          <h1>Cette page n’existe pas.</h1>
          <p>Elle a peut-être changé d’adresse.</p>
          <Link className="btn btn-red" to="/">
            Retour à l’accueil
          </Link>
        </div>
      </main>
      <Footer current="" />
    </>
  );
}

// /secteurs/:sector → page Secteurs défilée jusqu'au secteur, sinon 404
function SectorRoute() {
  const { sector } = useParams<{ sector: string }>();
  return sector && SECTOR_IDS.includes(sector) ? (
    <SecteursPage focus={sector} />
  ) : (
    <NotFound />
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Wait />}>
        <Routes>
          {/* Groupement des pages publiques dans le PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cartes-connectees" element={<CartesPage />} />
            <Route path="/qr-smart" element={<QrSmartPage />} />
            <Route path="/panneaux-baches" element={<PanneauxPage />} />
            <Route path="/branding-intelligent" element={<BrandingPage />} />
            <Route path="/secteurs" element={<SecteursPage />} />
            <Route path="/a-propos" element={<AProposPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/creation-contenu" element={<ContenuPage />} />
            <Route path="/promoteur-immobilier" element={<ImmobilierPage />} />

            {/* Pages légales */}
            {LEGAL_PATHS.map(p => (
              <Route key={p} path={p} element={<LegalPage path={p} />} />
            ))}

            {/* Routes secteurs */}
            <Route path="/secteurs/immobilier" element={<ImmobilierPage />} />
            <Route path="/secteurs/:sector" element={<SectorRoute />} />
          </Route>

          {/* Pages d'authentification (HORS du PublicLayout -> Sans Header/Footer) */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Page 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
