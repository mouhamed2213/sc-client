import { isAxiosError } from "axios";
import { api } from "../../../lib/api";
import type { FicheRecord } from "../../../types";
import { FICHES } from "../data/mockFiches";
import { toFicheRecord, type ApiFicheDetail } from "./ficheDto";
import { buildUpdatePayload, labelForChamp } from "./fichePayload";

/**
 * Source de données de l'éditeur de fiche.
 *
 *  - `apiSource`  (par défaut) : GET / PATCH /api/fiches/:id  (api-sc, fiches.routes.ts)
 *  - `mockSource` : données fictives en mémoire — VITE_USE_MOCK_FICHES=true (démos, travail hors ligne)
 *
 * La page et le hook ne connaissent que cette interface.
 */
export interface SaveResult {
  fiche: FicheRecord;
  /** Informations à montrer à l'utilisateur après l'enregistrement (ex. lignes incomplètes ignorées). */
  notes: string[];
}

export interface FicheSource {
  /** Identifiant de ce que l'on édite : id numérique de la fiche (API) ou slug d'une fiche de démo. */
  load(key: string): Promise<FicheRecord>;
  /** `previous` = dernière version enregistrée : sert à n'envoyer que ce qui a changé. */
  save(draft: FicheRecord, previous: FicheRecord): Promise<SaveResult>;
  /** Vrai tant que les données sont fictives : la page affiche alors le sélecteur de démonstration. */
  readonly isMock: boolean;
}

/* ───────────── Erreurs lisibles par l'interface ───────────── */

export interface FieldIssue {
  /** Chemin renvoyé par le serveur (ex. « data.liens.2.label »). */
  champ: string;
  /** Libellé lisible (ex. « Liens · ligne 3 · libellé »). */
  label: string;
  message: string;
}

export class FicheError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "auth" | "forbidden" | "notfound" | "invalid" | "limits" | "upload" | "rate" | "server",
    readonly code?: string,
    readonly issues: FieldIssue[] = []
  ) {
    super(message);
  }
}

/** Traduit une erreur axios (format serveur : { error: { code, message, details?: [{ champ, message }] } }). */
export function toFicheError(e: unknown): FicheError {
  if (e instanceof FicheError) return e;
  if (!isAxiosError(e)) return new FicheError("Une erreur inattendue est survenue.", "server");
  if (!e.response)
    return new FicheError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.", "network");

  const { status, data } = e.response;
  const err = (data as { error?: { code?: string; message?: string; details?: { champ: string; message: string }[] } })?.error;
  const issues: FieldIssue[] = (Array.isArray(err?.details) ? err!.details! : []).map(d => ({
    champ: d.champ,
    label: labelForChamp(d.champ),
    message: d.message,
  }));
  const msg = err?.message;

  if (status === 401) return new FicheError("Votre session a expiré. Reconnectez-vous pour continuer.", "auth", err?.code);
  if (status === 403) return new FicheError(msg ?? "Modification non autorisée.", "forbidden", err?.code);
  if (status === 404) return new FicheError("Fiche introuvable.", "notfound", err?.code);
  if (status === 429) return new FicheError("Trop de requêtes. Patientez un instant puis réessayez.", "rate", err?.code);
  if (status === 400) return new FicheError("Certaines informations sont invalides.", "invalid", err?.code, issues);
  if (status === 422) return new FicheError(msg ?? "Cette modification dépasse les droits de la formule.", "limits", err?.code, issues);
  return new FicheError("Le serveur a rencontré une erreur. Réessayez dans un instant.", "server", err?.code);
}

/* ───────────── Source API ───────────── */

export const apiSource: FicheSource = {
  isMock: false,

  async load(key) {
    const id = Number(key);
    if (!Number.isInteger(id) || id <= 0) throw new FicheError("Identifiant de fiche invalide.", "notfound");
    try {
      const res = await api.get<{ fiche: ApiFicheDetail }>(`fiches/${id}`);
      return toFicheRecord(res.data.fiche);
    } catch (e) {
      throw toFicheError(e);
    }
  },

  async save(draft, previous) {
    const { payload, skipped, pendingUploads } = buildUpdatePayload(previous, draft);

    // Pas d'envoi de fichiers côté serveur pour l'instant : on refuse plutôt que de perdre silencieusement une image.
    if (pendingUploads.length)
      throw new FicheError(
        `Des images importées depuis cet appareil ne peuvent pas encore être enregistrées : ${pendingUploads.join(", ")}. ` +
          "Retirez-les pour enregistrer le reste (l'envoi de fichiers n'est pas encore disponible).",
        "upload"
      );
    if (!payload) return { fiche: previous, notes: [] };

    try {
      const res = await api.patch<{ fiche: ApiFicheDetail }>(`fiches/${draft.id}`, payload);
      const notes = skipped.length ? [`Ignoré car incomplet : ${skipped.join(", ")}.`] : [];
      return { fiche: toFicheRecord(res.data.fiche), notes };
    } catch (e) {
      throw toFicheError(e);
    }
  },
};

/* ───────────── Données fictives ───────────── */

export const MOCK_FICHES: readonly FicheRecord[] = FICHES;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const store = new Map<string, FicheRecord>(MOCK_FICHES.map(f => [f.slug, clone(f)]));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const mockSource: FicheSource = {
  isMock: true,
  async load(slug) {
    await wait(120);
    // Slug inconnu : on affiche la 1re fiche de démo.
    return clone(store.get(slug) ?? store.get(MOCK_FICHES[0].slug)!);
  },
  async save(draft) {
    await wait(250);
    store.set(draft.slug, clone(draft));
    return { fiche: clone(draft), notes: [] };
  },
};

/** Source utilisée par la page : l'API, sauf si VITE_USE_MOCK_FICHES=true. */
export const ficheSource: FicheSource =
  import.meta.env.VITE_USE_MOCK_FICHES === "true" ? mockSource : apiSource;
