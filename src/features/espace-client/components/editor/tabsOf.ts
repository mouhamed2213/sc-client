import { defaultTabs, planOf } from "../../../../lib/plans";
import type { FicheRecord, Onglet } from "../../../../types";

/** Onglets effectivement affichés : ceux de la fiche (ou ceux par défaut de la formule) autorisés par le plan. */
export const tabsOf = (f: FicheRecord): Onglet[] =>
  (f.data.onglets?.length ? f.data.onglets : defaultTabs(f.formule)).filter(t =>
    planOf(f).tabs.includes(t.type),
  );
