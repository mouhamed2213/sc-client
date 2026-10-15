import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { FORMULES } from "../../../../types";
import type { PlanType } from "../../../../types";
import { ApiFiche } from "../../api-types";
import { formatPrice } from "../../lib/formatPrice";
import { upgradeFichePlan } from "../../espaceClient.service";
import { getPlan } from "./PlansPanel";

const PLAN_RANK: Record<string, number> = {
  ESSENTIELLE: 0,
  ESSENTIEL: 0,
  PRO: 1,
  SIGNATURE: 2,
};

export function PaymentModal({
  fiche,
  onClose,
  onSuccess,
}: {
  fiche: ApiFiche;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const currentPlan = (getPlan(fiche) ?? "ESSENTIELLE").toUpperCase();
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const availablePlans = FORMULES.filter(
    item => PLAN_RANK[item.id] > currentRank
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    currentPlan === "PRO" ? "SIGNATURE" : "PRO"
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const plan =
    availablePlans.find(item => item.id === selectedPlan) ??
    availablePlans[0] ??
    FORMULES[2];

  const upgradeMutation = useMutation({
    mutationFn: () => upgradeFichePlan(fiche.id, plan.id as Exclude<PlanType, "ESSENTIELLE">),
    onSuccess: () => {
      setNotice("Upgrade confirmé en mode simulation. La nouvelle formule est maintenant active.");
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error?.message ?? "Impossible de changer la formule. Réessayez."
        : "Une erreur inattendue est survenue.";
      setNotice(message);
    },
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#08090A]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between border-b border-[#eee9e1] px-6 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EF1733]">
              Abonnement
            </p>
            <h2
              id="payment-title"
              className="mt-1 text-xl font-semibold tracking-tight text-[#08090A]"
            >
              Choisir une formule
            </h2>
            <p className="mt-1 text-sm text-[#6d665d]">
              Fiche de {fiche.prenom} {fiche.nom}
            </p>
            <p className="mt-1 text-xs text-[#6d665d]">
              Formule actuelle : {currentPlan === "ESSENTIELLE" ? "Essentielle" : currentPlan === "PRO" ? "Pro" : "Signature"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#eee9e1] text-2xl text-[#6d665d] transition hover:bg-[#e3dfd8]"
          >
            ×
          </button>
        </div>
        <div className="space-y-6 px-6 py-6 sm:px-7">
          {availablePlans.length > 0 ? (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-[#111111]">
                Choisissez la formule supérieure
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePlans.map(item => (
                  <label
                    key={item.id}
                    className={`relative cursor-pointer rounded-2xl border p-3 transition ${selectedPlan === item.id ? "border-[#08090A] bg-[#f4f1eb] ring-1 ring-[#08090A]" : "border-[#e3dfd8] hover:border-[#08090A]"}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="subscription-plan"
                      value={item.id}
                      checked={selectedPlan === item.id}
                      onChange={() => {
                        setSelectedPlan(item.id);
                        setNotice("");
                      }}
                    />
                    <span className="block text-sm font-semibold text-[#111111]">
                      {item.label}
                    </span>
                    <span className="mt-2 block text-sm font-bold text-[#08090A]">
                      {formatPrice(item.price)}
                    </span>
                    <span className="mt-1 block text-xs text-[#6d665d]">
                      {item.period}
                    </span>
                    {selectedPlan === item.id && (
                      <span className="absolute right-2 top-2 text-sm text-[#EF1733]" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="rounded-xl bg-[#f4f1eb] px-4 py-3 text-sm leading-6 text-[#4a443c]">
              Votre fiche utilise déjà la formule la plus élevée, Signature.
            </p>
          )}

          {availablePlans.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <strong>Mode simulation :</strong> aucun paiement Wave ou Orange Money ne sera effectué. Le serveur enregistrera une tentative de paiement, la confirmera en mode simulation, puis activera la nouvelle formule. Aucun paiement réel n’est effectué.
            </div>
          )}

          {notice && (
            <p
              role="status"
              className="rounded-xl bg-[#eee9e1] px-4 py-3 text-sm text-[#4a443c]"
            >
              {notice}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setNotice("");
              upgradeMutation.mutate();
            }}
            disabled={availablePlans.length === 0 || upgradeMutation.isPending || upgradeMutation.isSuccess}
            className="w-full rounded-xl bg-[#08090A] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-[#c9142b] focus:outline-none focus:ring-2 focus:ring-[#EF1733] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {upgradeMutation.isPending
              ? "Activation en cours…"
              : upgradeMutation.isSuccess
                ? "Formule activée"
                : "Confirmer l’upgrade simulé"}
          </button>
          <p className="text-center text-xs leading-5 text-[#8d8a85]">
            La formule sélectionnée sera appliquée à cette fiche après confirmation du serveur.
          </p>
        </div>
      </section>
    </div>
  );
}
