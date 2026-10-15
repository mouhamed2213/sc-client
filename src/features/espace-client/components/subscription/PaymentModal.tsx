import { useEffect, useState } from "react";
import { FORMULES, PaymentMethod, PlanType } from "../../../../types";
import { ApiFiche } from "../../api-types";
import { formatPrice } from "../../lib/formatPrice";



export function PaymentModal({
  fiche,
  onClose,
}: {
  fiche: ApiFiche;
  onClose: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("PRO");
  const [method, setMethod] = useState<PaymentMethod>("WAVE");
  const [phone, setPhone] = useState(fiche.telephone ?? "");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const plan = FORMULES.find(item => item.id === selectedPlan) ?? FORMULES[1];

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
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-[#111111]">
              1. Choisissez votre formule
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {FORMULES.map(item => (
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
                    <span
                      className="absolute right-2 top-2 text-sm text-[#EF1733]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          {plan.price > 0 && (
            <>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-[#111111]">
                  2. Moyen de paiement
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${method === "WAVE" ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500" : "border-[#e3dfd8] hover:border-[#08090A]"}`}
                  >
                    <input
                      className="accent-blue-600"
                      type="radio"
                      name="payment-method"
                      checked={method === "WAVE"}
                      onChange={() => setMethod("WAVE")}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#111111]">
                        Wave
                      </span>
                      <span className="block text-xs text-[#6d665d]">
                        Paiement mobile
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${method === "ORANGE_MONEY" ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500" : "border-[#e3dfd8] hover:border-[#08090A]"}`}
                  >
                    <input
                      className="accent-orange-500"
                      type="radio"
                      name="payment-method"
                      checked={method === "ORANGE_MONEY"}
                      onChange={() => setMethod("ORANGE_MONEY")}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#111111]">
                        Orange Money
                      </span>
                      <span className="block text-xs text-[#6d665d]">
                        Paiement mobile
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="payment-phone"
                  className="mb-2 block text-sm font-semibold text-[#111111]"
                >
                  3. Numéro de téléphone
                </label>
                <input
                  id="payment-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value);
                    setNotice("");
                  }}
                  placeholder="+221 77 000 00 00"
                  className="w-full rounded-xl border border-[#d4cec4] px-4 py-3 text-sm outline-none transition placeholder:text-[#8d8a85] focus:border-[#08090A] focus:ring-2 focus:ring-[#08090A]/10"
                />
                <p className="mt-2 text-xs leading-5 text-[#6d665d]">
                  Utilisez le numéro associé à votre compte{" "}
                  {method === "WAVE" ? "Wave" : "Orange Money"}.
                </p>
              </div>
            </>
          )}
          {plan.price === 0 && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              La formule Essentiel est gratuite. Aucun paiement n'est
              nécessaire.
            </p>
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
            onClick={() =>
              setNotice(
                plan.price === 0
                  ? "Formule Essentiel sélectionnée. La demande de changement de formule n'est pas connectée au serveur."
                  : phone.trim()
                    ? "Votre sélection est prête. Le paiement n'est pas encore connecté."
                    : "Veuillez saisir le numéro de téléphone à utiliser pour le paiement."
              )
            }
            className="w-full rounded-xl bg-[#08090A] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-[#c9142b] focus:outline-none focus:ring-2 focus:ring-[#EF1733] focus:ring-offset-2"
          >
            {plan.price === 0
              ? "Sélectionner Essentiel"
              : "Préparer le paiement"}
          </button>
          <p className="text-center text-xs leading-5 text-[#8d8a85]">
            Aucun paiement ne sera effectué depuis cette interface pour le
            moment.
          </p>
        </div>
      </section>
    </div>
  );
}
