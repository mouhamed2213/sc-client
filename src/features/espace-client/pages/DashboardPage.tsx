import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FICHES } from "../../../data/fiches";
import Dashboard from "../components/Dashboard";
import { useClientUser } from "../layout/useClientUser";

export default function DashboardPage() {
  const user = useClientUser();
  const navigate = useNavigate();


  


  useEffect(() => {
    document.title = "Tableau de bord — Support Connecté";
  }, []);
  return (
    <Dashboard
      user={user}
      onView={s =>
        window.open(`https://supportconnecte.com/f/${s}`, "_blank", "noopener")
      }
      // Démo : l'éditeur ne connaît que les fiches d'exemple. TODO : charger la fiche via l'API (GET client/fiches/:slug).
      onEdit={s => {
        if (FICHES.some(x => x.slug === s))
          navigate(`/espace-client/fiches/${s}`);
      }}
    />
  );
}
