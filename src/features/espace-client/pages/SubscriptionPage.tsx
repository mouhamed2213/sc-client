import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getDashboardFiche } from "../espaceClient.service";
import type { ApiFiche } from "../api-types";

type PlanType = "ESSENTIELLE" | "PRO" | "SIGNATURE";
type PaymentMethod = "WAVE" | "ORANGE_MONEY";

const PLANS: {
  id: PlanType;
  label: string;
  price: number;
  period: string;
  description: string;
  accent: string;
}[] = [
  { id: "ESSENTIELLE", label: "Essentiel", price: 0, period: "pour toujours", description: "L'essentiel pour commencer à partager vos coordonnées.", accent: "border-slate-200" },
  { id: "PRO", label: "Pro", price: 5000, period: "par mois", description: "Pour donner plus de visibilité à votre activité.", accent: "border-rose-200" },
  { id: "SIGNATURE", label: "Signature", price: 10000, period: "par mois", description: "Une expérience complète pour votre présence digitale.", accent: "border-amber-300" },
];

const formatPrice = (price: number) =>
  price === 0 ? "Gratuit" : `${new Intl.NumberFormat("fr-FR").format(price)} FCFA`;

const planLabel = (type?: string | null) => {
  const normalized = type?.toUpperCase();
  if (normalized === "PRO") return "Pro";
  if (normalized === "SIGNATURE") return "Signature";
  if (normalized === "ESSENTIELLE" || normalized === "ESSENTIEL") return "Essentiel";
  return "Non renseignée";
};

const initials = (prenom?: string | null, nom?: string | null) =>
  `${prenom?.trim().charAt(0) ?? ""}${nom?.trim().charAt(0) ?? ""}`.toUpperCase() || "?";

function getPlan(fiche: ApiFiche): string | undefined {
  return fiche.subscriptions?.[0]?.plan?.type ?? fiche.abonnementActif?.plan?.type;
}

function PlanPill({ plan }: { plan?: string | null }) {
  const value = planLabel(plan);
  const style =
    value === "Signature" ? "bg-amber-50 text-amber-800 ring-amber-200"
      : value === "Pro" ? "bg-rose-50 text-rose-700 ring-rose-200"
      : value === "Essentiel" ? "bg-slate-100 text-slate-700 ring-slate-200"
      : "bg-gray-50 text-gray-500 ring-gray-200";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}>{value}</span>;
}

function StatCard({ label, caption, icon }: { label: string; caption: string; icon: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.02]">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">0</p><p className="mt-1 text-xs text-slate-400">{caption}</p></div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-xl text-slate-700" aria-hidden="true">{icon}</span>
      </div>
    </article>
  );
}

function PlansPanel({ onClose }: { onClose: () => void }) {
  const [activePlan, setActivePlan] = useState<PlanType>("ESSENTIELLE");
  const current = PLANS.find(plan => plan.id === activePlan) ?? PLANS[0];
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Présentation des formules">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Nos formules</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Choisissez votre niveau</h2><p className="mt-1 text-sm text-slate-500">Une formule adaptée à votre activité.</p></div>
        <button type="button" onClick={onClose} aria-label="Masquer les formules" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">×</button>
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-50/80 p-2" role="tablist" aria-label="Formules disponibles">
        {PLANS.map(plan => <button key={plan.id} type="button" role="tab" id={`plan-tab-${plan.id}`} aria-selected={activePlan === plan.id} aria-controls="plan-panel" onClick={() => setActivePlan(plan.id)} className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${activePlan === plan.id ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"}`}>{plan.label}</button>)}
      </div>
      <div id="plan-panel" role="tabpanel" aria-labelledby={`plan-tab-${activePlan}`} className="p-5">
        <div className={`rounded-2xl border ${current.accent} bg-gradient-to-br from-white to-slate-50/80 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-slate-950">{current.label}</h3><p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">{current.description}</p></div><div className="text-right"><p className="text-xl font-semibold tracking-tight text-slate-950">{formatPrice(current.price)}</p><p className="mt-1 text-xs text-slate-500">{current.period}</p></div></div>
          <div className="mt-5 rounded-xl bg-white/80 p-3 text-sm text-slate-500 ring-1 ring-slate-100">Les détails et avantages de cette formule seront présentés ici.</div>
        </div>
      </div>
    </section>
  );
}

function PaymentModal({ fiche, onClose }: { fiche: ApiFiche; onClose: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("PRO");
  const [method, setMethod] = useState<PaymentMethod>("WAVE");
  const [phone, setPhone] = useState(fiche.telephone ?? "");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const plan = PLANS.find(item => item.id === selectedPlan) ?? PLANS[1];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="payment-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Abonnement</p><h2 id="payment-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Choisir une formule</h2><p className="mt-1 text-sm text-slate-500">Fiche de {fiche.prenom} {fiche.nom}</p></div>
          <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-2xl text-slate-600 transition hover:bg-slate-200">×</button>
        </div>
        <div className="space-y-6 px-6 py-6 sm:px-7">
          <fieldset><legend className="mb-3 text-sm font-semibold text-slate-900">1. Choisissez votre formule</legend><div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map(item => <label key={item.id} className={`relative cursor-pointer rounded-2xl border p-3 transition ${selectedPlan === item.id ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-400"}`}><input className="sr-only" type="radio" name="subscription-plan" value={item.id} checked={selectedPlan === item.id} onChange={() => { setSelectedPlan(item.id); setNotice(""); }} /><span className="block text-sm font-semibold text-slate-900">{item.label}</span><span className="mt-2 block text-sm font-bold text-slate-950">{formatPrice(item.price)}</span><span className="mt-1 block text-xs text-slate-500">{item.period}</span>{selectedPlan === item.id && <span className="absolute right-2 top-2 text-sm text-rose-600" aria-hidden="true">✓</span>}</label>)}
          </div></fieldset>
          {plan.price > 0 && <>
            <fieldset><legend className="mb-3 text-sm font-semibold text-slate-900">2. Moyen de paiement</legend><div className="grid grid-cols-2 gap-3">
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${method === "WAVE" ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-400"}`}><input className="accent-blue-600" type="radio" name="payment-method" checked={method === "WAVE"} onChange={() => setMethod("WAVE")} /><span><span className="block text-sm font-semibold text-slate-900">Wave</span><span className="block text-xs text-slate-500">Paiement mobile</span></span></label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${method === "ORANGE_MONEY" ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500" : "border-slate-200 hover:border-slate-400"}`}><input className="accent-orange-500" type="radio" name="payment-method" checked={method === "ORANGE_MONEY"} onChange={() => setMethod("ORANGE_MONEY")} /><span><span className="block text-sm font-semibold text-slate-900">Orange Money</span><span className="block text-xs text-slate-500">Paiement mobile</span></span></label>
            </div></fieldset>
            <div><label htmlFor="payment-phone" className="mb-2 block text-sm font-semibold text-slate-900">3. Numéro de téléphone</label><input id="payment-phone" type="tel" autoComplete="tel" value={phone} onChange={event => { setPhone(event.target.value); setNotice(""); }} placeholder="+221 77 000 00 00" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" /><p className="mt-2 text-xs leading-5 text-slate-500">Utilisez le numéro associé à votre compte {method === "WAVE" ? "Wave" : "Orange Money"}.</p></div>
          </>}
          {plan.price === 0 && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">La formule Essentiel est gratuite. Aucun paiement n'est nécessaire.</p>}
          {notice && <p role="status" className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p>}
          <button type="button" onClick={() => setNotice(plan.price === 0 ? "Formule Essentiel sélectionnée. La demande de changement de formule n'est pas connectée au serveur." : phone.trim() ? "Votre sélection est prête. Le paiement n'est pas encore connecté." : "Veuillez saisir le numéro de téléphone à utiliser pour le paiement.")} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">{plan.price === 0 ? "Sélectionner Essentiel" : "Préparer le paiement"}</button>
          <p className="text-center text-xs leading-5 text-slate-400">Aucun paiement ne sera effectué depuis cette interface pour le moment.</p>
        </div>
      </section>
    </div>
  );
}

export default function SubscriptionPage() {
  const [paymentFiche, setPaymentFiche] = useState<ApiFiche | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const { data: fiches, isPending, isError, error, refetch, isFetching } = useQuery<ApiFiche[]>({
    queryKey: ["fiche_subscription_page"],
    queryFn: ({ signal }) => getDashboardFiche(signal),
  });
  const ficheCount = fiches?.length ?? 0;

  return (
    <div className="min-h-full bg-slate-50/70 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600"><span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> Espace client</div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Abonnements & formules</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Retrouvez vos fiches et découvrez la formule qui correspond à vos besoins.</p></div>
          <button type="button" onClick={() => setShowPlans(value => !value)} aria-expanded={showPlans} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 md:self-auto"><span aria-hidden="true">✦</span>{showPlans ? "Masquer nos formules" : "Voir nos formules"}<span className={`transition-transform ${showPlans ? "rotate-180" : ""}`} aria-hidden="true">⌄</span></button>
        </header>
        <section aria-label="Statistiques" className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Toutes mes fiches" caption="Fiches enregistrées" icon="▤" /><StatCard label="Fiches actives" caption="Prêtes à être consultées" icon="↗" /><StatCard label="Abonnements payants" caption="Formules Pro et Signature" icon="✧" />
        </section>
        <div className={`grid items-start gap-6 ${showPlans ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]" : "grid-cols-1"}`}>
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]" aria-labelledby="subscription-fiches-title">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 id="subscription-fiches-title" className="text-lg font-semibold tracking-tight text-slate-950">Mes fiches</h2><p className="mt-1 text-sm text-slate-500">{ficheCount} fiche{ficheCount > 1 ? "s" : ""} au total</p></div><span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">Données de votre espace client</span></div>
            {isPending ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-rose-600" />Chargement des fiches…</div>
              : isError ? <div className="px-6 py-12 text-center" role="alert"><p className="font-semibold text-slate-900">Impossible de charger vos fiches</p><p className="mt-2 text-sm text-slate-500">{isAxiosError(error) && error.response?.status === 401 ? "Votre session a expiré. Reconnectez-vous pour continuer." : "Vérifiez votre connexion puis réessayez."}</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isFetching ? "Chargement…" : "Réessayer"}</button></div>
              : !fiches?.length ? <div className="px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-500" aria-hidden="true">▤</div><h3 className="mt-4 font-semibold text-slate-900">Aucune fiche pour le moment</h3><p className="mt-1 text-sm text-slate-500">Vos fiches apparaîtront ici dès qu'elles seront disponibles.</p></div>
              : <>
                <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[780px] border-collapse text-left"><thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-3.5">Fiche</th><th className="px-4 py-3.5">Formule</th><th className="px-4 py-3.5">Secteur</th><th className="px-4 py-3.5">Téléphone</th><th className="px-4 py-3.5">WhatsApp</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
                  {fiches.map(fiche => <tr key={fiche.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex min-w-0 items-center gap-3">{fiche.logo ? <img src={fiche.logo} alt={`Logo de ${fiche.prenom} ${fiche.nom}`} className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-bold tracking-wide text-white">{initials(fiche.prenom, fiche.nom)}</span>}<div className="min-w-0"><p className="max-w-[200px] truncate text-sm font-semibold text-slate-900">{fiche.prenom} {fiche.nom}</p><p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-400">{fiche.entreprise || fiche.fonction || "Fiche professionnelle"}</p></div></div></td><td className="px-4 py-4"><PlanPill plan={getPlan(fiche)} /></td><td className="px-4 py-4 text-sm text-slate-600">{fiche.secteur ? fiche.secteur.charAt(0) + fiche.secteur.slice(1).toLowerCase() : "—"}</td><td className="px-4 py-4 text-sm text-slate-600">{fiche.telephone || "—"}</td><td className="px-4 py-4 text-sm text-slate-600">{fiche.whatsapp || "—"}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setPaymentFiche(fiche)} className="whitespace-nowrap rounded-lg bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">Voir formule <span aria-hidden="true">↗</span></button></td></tr>)}
                </tbody></table></div>
                <div className="divide-y divide-slate-100 md:hidden">{fiches.map(fiche => <article key={fiche.id} className="p-4"><div className="flex items-start gap-3">{fiche.logo ? <img src={fiche.logo} alt={`Logo de ${fiche.prenom} ${fiche.nom}`} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-white">{initials(fiche.prenom, fiche.nom)}</span>}<div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-slate-900">{fiche.prenom} {fiche.nom}</h3><p className="mt-1 text-xs text-slate-500">{fiche.secteur ? fiche.secteur.charAt(0) + fiche.secteur.slice(1).toLowerCase() : "Secteur non renseigné"}</p><div className="mt-2"><PlanPill plan={getPlan(fiche)} /></div></div></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Téléphone</p><p className="mt-1 break-words text-sm text-slate-700">{fiche.telephone || "—"}</p></div><div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">WhatsApp</p><p className="mt-1 break-words text-sm text-slate-700">{fiche.whatsapp || "—"}</p></div></div><button type="button" onClick={() => setPaymentFiche(fiche)} className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">Voir formule <span aria-hidden="true">↗</span></button></article>)}</div>
              </>}
          </section>
          {showPlans && <PlansPanel onClose={() => setShowPlans(false)} />}
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-400">Les prix affichés sont provisoires et pourront être ajustés dans la configuration de cette page.</p>
      </div>
      {paymentFiche && <PaymentModal fiche={paymentFiche} onClose={() => setPaymentFiche(null)} />}
    </div>
  );
}
