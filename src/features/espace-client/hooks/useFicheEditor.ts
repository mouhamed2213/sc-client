import { useCallback, useEffect, useRef, useState } from "react";
import type { FicheRecord } from "../../../types";
import { ficheSource } from "../lib/ficheSource";

type Status = "loading" | "ready" | "error";

/**
 * Brouillon local d'une fiche en cours d'édition.
 * L'éditeur modifie `draft` à chaque frappe (aperçu téléphone en direct) ; rien n'est envoyé tant
 * que `save()` n'est pas appelé — indispensable avec l'API (limite de débit, validation serveur).
 */
export function useFicheEditor(key: string) {
  const [draft, setDraft] = useState<FicheRecord | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saved = useRef<string>("");

  useEffect(() => {
    let live = true;
    setStatus("loading");
    setDraft(null);
    setSaveError(null);
    ficheSource
      .load(key)
      .then(f => {
        if (!live) return;
        saved.current = JSON.stringify(f);
        setDraft(f);
        setStatus("ready");
      })
      .catch(() => live && setStatus("error"));
    return () => {
      live = false;
    };
  }, [key]);

  const dirty = draft !== null && JSON.stringify(draft) !== saved.current;

  const save = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const f = await ficheSource.save(draft);
      saved.current = JSON.stringify(f);
      setDraft(f);
    } catch (e) {
      // À l'API : lire e.response.data.error.details ([{ champ, message }]) pour afficher l'erreur sous le champ.
      setSaveError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }, [draft, saving]);

  const reset = useCallback(() => {
    if (saved.current) setDraft(JSON.parse(saved.current) as FicheRecord);
  }, []);

  return { draft, setDraft, status, dirty, saving, saveError, save, reset, isMock: ficheSource.isMock };
}
