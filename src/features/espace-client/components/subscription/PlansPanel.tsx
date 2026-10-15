import { useState } from "react";
import { FORMULES, PlanType } from "../../../../types";
import { formatPrice } from "../../lib/formatPrice";
import { ApiFiche } from "../../api-types";

export function PlansPanel({ onClose }: { onClose: () => void }) {
  const [activePlan, setActivePlan] = useState<PlanType>("ESSENTIELLE");
  const current = FORMULES.find(plan => plan.id === activePlan) ?? FORMULES[0];
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-[#e3dfd8] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)]"
      aria-label="Présentation des formules"
    >
      <div className="flex items-start justify-between border-b border-[#eee9e1] px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EF1733]">
            Nos formules
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#08090A]">
            Choisissez votre niveau
          </h2>
          <p className="mt-1 text-sm text-[#6d665d]">
            Une formule adaptée à votre activité.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Masquer les formules"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl text-[#6d665d] transition hover:bg-[#eee9e1] hover:text-[#111111]"
        >
          ×
        </button>
      </div>
      <div
        className="grid grid-cols-3 gap-1 border-b border-[#eee9e1] bg-[#f7f5f1] p-2"
        role="tablist"
        aria-label="Formules disponibles"
      >
        {FORMULES.map(plan => (
          <button
            key={plan.id}
            type="button"
            role="tab"
            id={`plan-tab-${plan.id}`}
            aria-selected={activePlan === plan.id}
            aria-controls="plan-panel"
            onClick={() => setActivePlan(plan.id)}
            className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${activePlan === plan.id ? "bg-white text-[#08090A] shadow-[0_6px_20px_rgba(0,0,0,0.05)] ring-1 ring-[#e3dfd8]" : "text-[#6d665d] hover:text-[#111111]"}`}
          >
            {plan.label}
          </button>
        ))}
      </div>
      <div
        id="plan-panel"
        role="tabpanel"
        aria-labelledby={`plan-tab-${activePlan}`}
        className="p-5"
      >
        <div
          className={`rounded-2xl border ${current.accent} bg-gradient-to-br from-white to-slate-50/80 p-5`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#08090A]">
                {current.label}
              </h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-[#6d665d]">
                {current.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold tracking-tight text-[#08090A]">
                {formatPrice(current.price)}
              </p>
              <p className="mt-1 text-xs text-[#6d665d]">{current.period}</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-white/80 p-3 text-sm text-[#6d665d] ring-1 ring-[#eee9e1]">
            Les détails et avantages de cette formule seront présentés ici.
          </div>
        </div>
      </div>
    </section>
  );
}

export const planLabel = (type?: string | null) => {
  const normalized = type?.toUpperCase();
  if (normalized === "PRO") return "Pro";
  if (normalized === "SIGNATURE") return "Signature";
  if (normalized === "ESSENTIELLE" || normalized === "ESSENTIEL")
    return "Essentiel";
  return "Non renseignée";
};

export const initials = (prenom?: string | null, nom?: string | null) =>
  `${prenom?.trim().charAt(0) ?? ""}${nom?.trim().charAt(0) ?? ""}`.toUpperCase() ||
  "?";

export function getPlan(fiche: ApiFiche): string | undefined {
  return (
    fiche.subscriptions?.[0]?.plan?.type ?? fiche.abonnementActif?.plan?.type
  );
}

export function PlanPill({ plan }: { plan?: string | null }) {
  const value = planLabel(plan);
  const style =
    value === "Signature"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : value === "Pro"
        ? "bg-[#fde8eb] text-[#a30f23] ring-[#f6c3cb]"
        : value === "Essentiel"
          ? "bg-[#eee9e1] text-[#4a443c] ring-[#e3dfd8]"
          : "bg-[#f7f5f1] text-[#8d8a85] ring-[#e3dfd8]";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {value}
    </span>
  );
}
