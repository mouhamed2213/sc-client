import type { FicheRecord } from "../../../types";
import { FICHES } from "../data/mockFiches";

/**
 * Source de données de l'éditeur de fiche.
 *
 * Aujourd'hui : `mockSource` (données fictives en mémoire, copiées de la référence).
 * Demain : `apiSource` — même interface, l'éditeur et la page ne changent pas.
 *
 *   load(key)  → GET   /api/fiches/:id        (puis toFicheRecord() de lib/ficheDto.ts)
 *   save(f)    → PATCH /api/fiches/:id        (identité + `data` ; le serveur renvoie la fiche à jour)
 *
 * À prévoir au branchement (cf. api-sc) : les URLs `blob:` sont refusées par le serveur (upload à créer),
 * les lignes incomplètes (nom / titre / libellé vide) font échouer toute la requête (400), et les erreurs
 * 400 / 422 arrivent sous la forme { error: { code, message, details: [{ champ, message }] } }.
 */
export interface FicheSource {
  /** Identifiant de ce que l'on édite : slug (démo) ou id (API). */
  load(key: string): Promise<FicheRecord>;
  save(fiche: FicheRecord): Promise<FicheRecord>;
  /** Vrai tant que les données sont fictives : la page affiche alors le sélecteur de démonstration. */
  readonly isMock: boolean;
}

/* ───────────── Données fictives ───────────── */

export const MOCK_FICHES: readonly FicheRecord[] = FICHES;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const store = new Map<string, FicheRecord>(MOCK_FICHES.map(f => [f.slug, clone(f)]));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const mockSource: FicheSource = {
  isMock: true,
  async load(slug) {
    await wait(120);
    // Slug inconnu (ex. une vraie fiche ouverte depuis le tableau de bord) : on affiche la 1re fiche de démo.
    return clone(store.get(slug) ?? store.get(MOCK_FICHES[0].slug)!);
  },
  async save(fiche) {
    await wait(250);
    store.set(fiche.slug, clone(fiche));
    return clone(fiche);
  },
};

/** Source utilisée par la page. Remplacer par `apiSource` au moment de la liaison avec le backend. */
export const ficheSource: FicheSource = mockSource;
