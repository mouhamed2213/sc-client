import { useQuery } from "@tanstack/react-query";
import { getDashboardFiche } from "../espaceClient.service";
import { ApiError } from "../lib/api";

export const dashboardFichesKey = ["client", "dashboard", "fiches"] as const;

/** Fiches du client connecté. À invalider après une modification : queryClient.invalidateQueries({ queryKey: dashboardFichesKey }). */
export const useDashboardFiches = () =>
  useQuery({
    queryKey: dashboardFichesKey,
    queryFn: ({ signal }) => getDashboardFiche(signal),
    staleTime: 60_000,
    // Inutile de réessayer une session expirée ou un accès refusé
    retry: (n, e) =>
      !(e instanceof ApiError && (e.status === 401 || e.status === 403)) &&
      n < 2,
  });
