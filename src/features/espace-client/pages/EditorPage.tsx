import { useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { PLANS, TAB_TYPES, defaultTabs, newId } from "../../../lib/plans";
import type { Article, FicheRecord, Onglet, Photo, TabType } from "../../../types";
import Fiche from "../components/Fiche";
import { toFicheRecord, type ApiFicheDetail } from "../lib/ficheDto";
import "./editor-page.css";

type Panel = "identite" | "contenu" | "medias" | "apparence" | "blocs";
const PANEL_LABELS: Record<Panel, string> = { identite: "Identité", contenu: "Contenu", medias: "Photos & vidéos", apparence: "Apparence", blocs: "Blocs" };
const SECTEURS = [["restaurant","Restaurant, café"],["immobilier","Immobilier"],["commerce","Commerce, boutique"],["hotel","Hôtel"],["independant","Indépendant"],["beaute","Beauté, bien-être"]] as const;
const messageOf = (error: unknown) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (error.response?.status === 401) return "Votre session a expiré. Reconnectez-vous.";
    if (error.response?.status === 403) return "Cette modification n’est pas autorisée.";
  }
  return error instanceof Error ? error.message : "Une erreur est survenue.";
};

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const ficheId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const phoneScroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<FicheRecord | null>(null);
  const [panel, setPanel] = useState<Panel>("identite");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);

  const ficheQuery = useQuery({
    queryKey: ["editor-fiche", ficheId ?? "first"],
    enabled: !id || (Number.isInteger(ficheId) && (ficheId ?? 0) > 0),
    queryFn: async ({ signal }) => {
      if (ficheId) {
        const response = await api.get<{ fiche: ApiFicheDetail }>(`fiches/${ficheId}`, { signal });
        return toFicheRecord(response.data.fiche);
      }
      const response = await api.get<ApiFicheDetail[]>("client/dashboard/fiches", { signal });
      const first = response.data?.[0];
      if (!first) return null;
      navigate(`/espace-client/editeur/${first.id}`, { replace: true });
      return toFicheRecord(first);
    },
  });

  useEffect(() => { if (ficheQuery.data) setDraft(ficheQuery.data); }, [ficheQuery.data]);
  useEffect(() => {
    document.title = draft ? `Éditeur — ${draft.prenom} ${draft.nom} · Support Connecté` : "Éditeur de fiche — Support Connecté";
  }, [draft?.id, draft?.prenom, draft?.nom]);

  const caps = useMemo(() => draft?.planCapabilities ?? (draft ? PLANS[draft.formule] : PLANS.essentielle), [draft]);
  const locked = !draft || draft.statut === "suspendue" || draft.expiree === true;
  const tabs = draft ? (draft.data.onglets?.length ? draft.data.onglets : defaultTabs(draft.formule)) : [];
  const update = (patch: Partial<FicheRecord>) => { setDraft(current => current ? { ...current, ...patch } : current); setFeedback(""); };
  const updateData = (patch: Partial<FicheRecord["data"]>) => { setDraft(current => current ? { ...current, data: { ...current.data, ...patch } } : current); setFeedback(""); };
  const setTabs = (next: Onglet[]) => updateData({ onglets: next });

  const save = useMutation({
    mutationFn: async (fiche: FicheRecord) => {
      const payload = {
        prenom: fiche.prenom, nom: fiche.nom, fonction: fiche.fonction, entreprise: fiche.entreprise,
        photo: fiche.photo, logo: fiche.logo, telephone: fiche.telephone, whatsapp: fiche.whatsapp,
        email: fiche.email, site: fiche.site, adresse: fiche.adresse, googlePlaceId: fiche.googlePlaceId,
        data: {
          secteur: fiche.data.secteur, premierBouton: fiche.data.premierBouton,
          messageWhatsapp: fiche.data.messageWhatsapp, presentation: fiche.data.presentation,
          reseauxSociaux: fiche.data.reseauxSociaux, liens: fiche.data.liens, horaires: fiche.data.horaires,
          galerie: fiche.data.galerie, sections: fiche.data.sections, menu: fiche.data.menu, biens: fiche.data.biens,
          rendezVous: fiche.data.rendezVous, onglets: fiche.data.onglets, entete: fiche.data.entete,
        },
      };
      const response = await api.patch<{ fiche: ApiFicheDetail }>(`fiches/${fiche.id}`, payload);
      return toFicheRecord(response.data.fiche);
    },
    onSuccess: saved => {
      setDraft(saved); setFeedback("Modifications enregistrées.");
      queryClient.setQueryData(["editor-fiche", saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ["client", "dashboard", "fiches"] });
      void queryClient.invalidateQueries({ queryKey: ["fiche-preview", saved.id] });
    },
    onError: error => setFeedback(messageOf(error)),
  });

  const upload = async (file: File, target: "photo" | "logo" | "cover" | "gallery") => {
    if (!draft || locked) return;
    setUploading(true); setFeedback("");
    try {
      const response = await api.post<{ media: { url: string; type: "image" | "video" } }>(
        `media/fiches/${draft.id}/upload`, file, { headers: { "Content-Type": file.type } }
      );
      const media = response.data.media;
      if (target === "photo") update({ photo: media.url });
      else if (target === "logo") update({ logo: media.url });
      else if (target === "cover") updateData({ entete: { ...draft.data.entete, couverture: media.url } });
      else {
        const current = draft.data.galerie ?? [];
        const count = current.filter(item => item.type === media.type).length;
        const maximum = media.type === "video" ? caps.maxVideos : caps.maxPhotos;
        if (count >= maximum) { setFeedback(`Limite atteinte : ${maximum} ${media.type === "video" ? "vidéo(s)" : "photo(s)"}.`); return; }
        updateData({ galerie: [...current, { type: media.type, url: media.url } as Photo] });
      }
      setFeedback("Fichier téléversé. Enregistrez la fiche pour conserver la modification.");
    } catch (error) { setFeedback(messageOf(error)); }
    finally { setUploading(false); }
  };

  const updateLink = (kind: "liens" | "reseauxSociaux", index: number, key: "label" | "url", value: string) => {
    if (!draft) return;
    updateData({ [kind]: (draft.data[kind] ?? []).map((item, i) => i === index ? { ...item, [key]: value } : item) });
  };
  const addLink = (kind: "liens" | "reseauxSociaux") => {
    if (!draft) return;
    const current = draft.data[kind] ?? [];
    const max = kind === "liens" ? caps.maxLinks : caps.maxSocial;
    if (current.length >= max) { setFeedback(`Limite atteinte : ${max} élément(s).`); return; }
    updateData({ [kind]: [...current, { label: "", url: "" }] });
  };
  const updateArticle = (sectionIndex: number, articleIndex: number, patch: Partial<Article>) => {
    if (!draft) return;
    updateData({ sections: (draft.data.sections ?? []).map((section, i) => i === sectionIndex ? { ...section, articles: section.articles.map((article, j) => j === articleIndex ? { ...article, ...patch } : article) } : section) });
  };
  const addTab = (type: TabType) => {
    if (!draft || !caps.canAdd || !caps.tabs.includes(type)) return;
    const customCount = tabs.filter(tab => tab.type === "texte").length;
    if (type === "texte" && customCount >= (caps.maxCustomTabs ?? 0)) { setFeedback(`Maximum : ${caps.maxCustomTabs ?? 0} onglet(s) libre(s).`); return; }
    if (type !== "texte" && tabs.some(tab => tab.type === type)) { setFeedback("Ce bloc est déjà présent."); return; }
    setTabs([...tabs, { id: newId(type), type, visible: true }]);
  };

  if (id && (!Number.isInteger(ficheId) || (ficheId ?? 0) <= 0)) return <div className="ed-state" role="alert"><h1>Identifiant invalide</h1><p>L’identifiant de cette fiche n’est pas valide.</p><Link to="/espace-client">Retour au tableau de bord</Link></div>;
  if (!id && ficheQuery.data === null && !ficheQuery.isPending) return <div className="ed-state"><h1>Aucune fiche à modifier</h1><p>Créez d’abord une fiche depuis le tableau de bord.</p><Link to="/espace-client">Retour au tableau de bord</Link></div>;
  if (ficheQuery.isPending) return <div className="ed-state" role="status">Chargement de l’éditeur…</div>;
  if (ficheQuery.isError) {
    const status = isAxiosError(ficheQuery.error) ? ficheQuery.error.response?.status : undefined;
    return <div className="ed-state" role="alert"><h1>Éditeur indisponible</h1><p>{messageOf(ficheQuery.error)}</p>{status === 401 ? <Link to="/login">Se connecter</Link> : <button onClick={() => ficheQuery.refetch()}>Réessayer</button>}<Link to="/espace-client">Retour au tableau de bord</Link></div>;
  }
  if (!draft) return <div className="ed-state">Chargement de la fiche…</div>;

  const gallery = draft.data.galerie ?? [];
  const usedTypes = new Set(tabs.map(tab => tab.type));
  const saveButton = <button type="button" className="ed-save" disabled={locked || save.isPending || uploading} onClick={() => save.mutate(draft)}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</button>;

  return <div className="ed-page">
    <header className="ed-topbar"><div className="ed-top-title"><Link to="/espace-client" aria-label="Retour au tableau de bord">←</Link><div><span>Éditeur de fiche</span><h1>{draft.prenom} {draft.nom}</h1></div></div><div className="ed-top-actions"><a href={`/fiche/${draft.slug}`} target="_blank" rel="noreferrer" className="ed-secondary">Fiche publique ↗</a>{saveButton}</div></header>
    {(draft.statut === "suspendue" || draft.expiree) && <div className="ed-alert" role="alert">{draft.statut === "suspendue" ? "Cette fiche est suspendue : modification désactivée." : "L’abonnement a expiré : modification désactivée."}</div>}
    <div className="ed-workspace">
      <section className="ed-editor" aria-label="Outils de modification">
        <div className="ed-plan-line"><span>Formule effective</span><b>{caps.label}</b><small>Capacités fournies par le serveur</small></div>
        <nav className="ed-panels" aria-label="Sections de l’éditeur">{(Object.keys(PANEL_LABELS) as Panel[]).map(key => <button key={key} type="button" className={panel === key ? "active" : ""} onClick={() => setPanel(key)}>{PANEL_LABELS[key]}</button>)}</nav>
        {panel === "identite" && <div className="ed-panel-content"><h2>Identité et contact</h2><p className="ed-help">Les changements apparaissent immédiatement dans le téléphone.</p><div className="ed-fields">
          <label>Prénom<input value={draft.prenom} disabled={locked} onChange={e => update({ prenom: e.target.value })}/></label><label>Nom<input value={draft.nom} disabled={locked} onChange={e => update({ nom: e.target.value })}/></label>
          <label>Fonction<input value={draft.fonction} disabled={locked} onChange={e => update({ fonction: e.target.value })}/></label><label>Entreprise<input value={draft.entreprise} disabled={locked} onChange={e => update({ entreprise: e.target.value })}/></label>
          <label>Téléphone<input value={draft.telephone} disabled={locked} onChange={e => update({ telephone: e.target.value })}/></label><label>WhatsApp<input value={draft.whatsapp} disabled={locked} onChange={e => update({ whatsapp: e.target.value })}/></label>
          <label>E-mail<input type="email" value={draft.email} disabled={locked} onChange={e => update({ email: e.target.value })}/></label><label>Site web<input type="url" value={draft.site} disabled={locked} onChange={e => update({ site: e.target.value })}/></label>
          <label className="wide">Adresse<input value={draft.adresse} disabled={locked} onChange={e => update({ adresse: e.target.value })}/></label><label className="wide">Google Place ID<input value={draft.googlePlaceId} disabled={locked} onChange={e => update({ googlePlaceId: e.target.value })}/></label>
        </div></div>}
        {panel === "contenu" && <div className="ed-panel-content"><h2>Contenu public</h2>
          <label>Secteur<select value={draft.data.secteur ?? "independant"} disabled={locked} onChange={e => updateData({ secteur: e.target.value as FicheRecord["data"]["secteur"] })}>{SECTEURS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Présentation <small>{(draft.data.presentation ?? "").length}/{caps.maxPresentation}</small><textarea rows={5} maxLength={caps.maxPresentation} value={draft.data.presentation ?? ""} disabled={locked} onChange={e => updateData({ presentation: e.target.value })}/></label>
          <label>Action principale<select value={draft.data.premierBouton ?? "whatsapp"} disabled={locked} onChange={e => updateData({ premierBouton: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="appel">Appeler</option><option value="email">E-mail</option></select></label>
          <label>Message WhatsApp<textarea rows={2} maxLength={500} value={draft.data.messageWhatsapp ?? ""} disabled={locked} onChange={e => updateData({ messageWhatsapp: e.target.value })}/></label>
          <section className="ed-subsection"><div className="ed-section-heading"><h3>Réseaux sociaux</h3><span>{(draft.data.reseauxSociaux ?? []).length}/{caps.maxSocial}</span></div>{(draft.data.reseauxSociaux ?? []).map((item,i) => <div className="ed-repeat" key={i}><input aria-label="Nom du réseau" placeholder="Instagram" value={item.label} disabled={locked} onChange={e => updateLink("reseauxSociaux",i,"label",e.target.value)}/><input aria-label="URL du réseau" placeholder="https://" value={item.url} disabled={locked} onChange={e => updateLink("reseauxSociaux",i,"url",e.target.value)}/><button type="button" disabled={locked} onClick={() => updateData({ reseauxSociaux: (draft.data.reseauxSociaux ?? []).filter((_,j) => j !== i) })}>Retirer</button></div>)}<button type="button" className="ed-inline-add" disabled={locked || (draft.data.reseauxSociaux ?? []).length >= caps.maxSocial} onClick={() => addLink("reseauxSociaux")}>+ Ajouter un réseau</button></section>
          <section className="ed-subsection"><div className="ed-section-heading"><h3>Liens</h3><span>{(draft.data.liens ?? []).length}/{caps.maxLinks}</span></div>{(draft.data.liens ?? []).map((item,i) => <div className="ed-repeat" key={i}><input aria-label="Libellé du lien" placeholder="Mon site" value={item.label} disabled={locked} onChange={e => updateLink("liens",i,"label",e.target.value)}/><input aria-label="URL du lien" placeholder="https://" value={item.url} disabled={locked} onChange={e => updateLink("liens",i,"url",e.target.value)}/><button type="button" disabled={locked} onClick={() => updateData({ liens: (draft.data.liens ?? []).filter((_,j) => j !== i) })}>Retirer</button></div>)}<button type="button" className="ed-inline-add" disabled={locked || caps.maxLinks === 0 || (draft.data.liens ?? []).length >= caps.maxLinks} onClick={() => addLink("liens")}>+ Ajouter un lien</button></section>
          <section className="ed-subsection"><h3>Rendez-vous</h3><div className="ed-fields"><label>Libellé<input value={draft.data.rendezVous?.label ?? ""} disabled={locked || !caps.tabs.includes("rendezvous")} onChange={e => updateData({ rendezVous: { label: e.target.value, url: draft.data.rendezVous?.url ?? "" } })}/></label><label>URL<input value={draft.data.rendezVous?.url ?? ""} disabled={locked || !caps.tabs.includes("rendezvous")} onChange={e => updateData({ rendezVous: { label: draft.data.rendezVous?.label ?? "", url: e.target.value } })}/></label></div>{!caps.tabs.includes("rendezvous") && <p className="ed-lock-note">Fonctionnalité non incluse dans votre formule.</p>}</section>
          {caps.hasCatalog && <section className="ed-subsection"><div className="ed-section-heading"><h3>Catalogue</h3><span>{(draft.data.sections ?? []).length}/{caps.maxCatalogSections ?? 0}</span></div>{(draft.data.sections ?? []).map((section,si) => <div className="ed-catalog" key={si}><div className="ed-section-heading"><input aria-label="Titre de section" value={section.titre} disabled={locked} onChange={e => updateData({ sections: (draft.data.sections ?? []).map((s,i) => i === si ? { ...s,titre:e.target.value } : s) })}/><button type="button" disabled={locked} onClick={() => updateData({ sections: (draft.data.sections ?? []).filter((_,i) => i !== si) })}>Supprimer</button></div>{section.articles.map((article,ai) => <div className="ed-article" key={ai}><label>Nom<input value={article.nom} disabled={locked} onChange={e => updateArticle(si,ai,{nom:e.target.value})}/></label><label>Description<input value={article.description ?? ""} disabled={locked} onChange={e => updateArticle(si,ai,{description:e.target.value})}/></label>{caps.catalogPrices && <label>Prix FCFA<input value={article.prix ?? ""} disabled={locked} onChange={e => updateArticle(si,ai,{prix:e.target.value})}/></label>}<label>URL photo<input value={article.photo ?? ""} disabled={locked} onChange={e => updateArticle(si,ai,{photo:e.target.value})}/></label><button type="button" disabled={locked} onClick={() => updateData({ sections: (draft.data.sections ?? []).map((s,i) => i === si ? {...s,articles:s.articles.filter((_,j) => j !== ai)} : s) })}>Retirer l’article</button></div>)}<button type="button" disabled={locked || section.articles.length >= (caps.maxCatalogArticlesPerSection ?? 0)} onClick={() => updateData({ sections: (draft.data.sections ?? []).map((s,i) => i === si ? {...s,articles:[...s.articles,{nom:""}]} : s) })}>+ Article</button></div>)}<button type="button" className="ed-inline-add" disabled={locked || (draft.data.sections ?? []).length >= (caps.maxCatalogSections ?? 0)} onClick={() => updateData({ sections: [...(draft.data.sections ?? []),{titre:"Nouvelle section",articles:[]}] })}>+ Ajouter une section</button>{!caps.catalogPrices && <p className="ed-lock-note">L’affichage des prix est réservé à Signature.</p>}</section>}
          {caps.hasMenu && <section className="ed-subsection"><h3>Menu interactif</h3>{(draft.data.menu?.sections ?? []).map((section,si) => <div className="ed-catalog" key={si}><label>Titre<input value={section.titre} disabled={locked} onChange={e => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,titre:e.target.value} : s)}})}/></label>{section.plats.map((plat,pi) => <div className="ed-article" key={pi}><label>Plat<input value={plat.nom} disabled={locked} onChange={e => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,plats:s.plats.map((p,j) => j === pi ? {...p,nom:e.target.value} : p)} : s)}})}/></label><label>Description<input value={plat.description ?? ""} disabled={locked} onChange={e => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,plats:s.plats.map((p,j) => j === pi ? {...p,description:e.target.value} : p)} : s)}})}/></label><label>Prix<input value={plat.prix ?? ""} disabled={locked} onChange={e => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,plats:s.plats.map((p,j) => j === pi ? {...p,prix:e.target.value} : p)} : s)}})}/></label><button type="button" disabled={locked} onClick={() => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,plats:s.plats.filter((_,j) => j !== pi)} : s)}})}>Retirer</button></div>)}<button type="button" disabled={locked || section.plats.length >= (caps.maxMenuItemsPerSection ?? 0)} onClick={() => updateData({menu:{sections:(draft.data.menu?.sections ?? []).map((s,i) => i === si ? {...s,plats:[...s.plats,{nom:""}]} : s)}})}>+ Plat</button><button type="button" disabled={locked} onClick={() => updateData({menu:{sections:(draft.data.menu?.sections ?? []).filter((_,i) => i !== si)}})}>Supprimer section</button></div>)}<button type="button" className="ed-inline-add" disabled={locked || (draft.data.menu?.sections ?? []).length >= (caps.maxMenuSections ?? 0)} onClick={() => updateData({menu:{sections:[...(draft.data.menu?.sections ?? []),{titre:"Nouvelle section",plats:[]}]}})}>+ Section menu</button></section>}
          {caps.hasBiens && <section className="ed-subsection"><h3>Biens immobiliers</h3>{(draft.data.biens ?? []).map((bien,i) => <div className="ed-catalog" key={i}><label>Titre<input value={bien.titre} disabled={locked} onChange={e => updateData({biens:(draft.data.biens ?? []).map((b,j) => j === i ? {...b,titre:e.target.value} : b)})}/></label><label>Ville<input value={bien.ville ?? ""} disabled={locked} onChange={e => updateData({biens:(draft.data.biens ?? []).map((b,j) => j === i ? {...b,ville:e.target.value} : b)})}/></label><label>Description<textarea value={bien.description ?? ""} disabled={locked} onChange={e => updateData({biens:(draft.data.biens ?? []).map((b,j) => j === i ? {...b,description:e.target.value} : b)})}/></label><button type="button" disabled={locked} onClick={() => updateData({biens:(draft.data.biens ?? []).filter((_,j) => j !== i)})}>Retirer le bien</button></div>)}<button type="button" className="ed-inline-add" disabled={locked || (draft.data.biens ?? []).length >= (caps.maxBiens ?? 0)} onClick={() => updateData({biens:[...(draft.data.biens ?? []),{titre:"Nouveau bien",type:"vente",atouts:[],photos:[]}]})}>+ Ajouter un bien</button></section>}
        </div>}
        {panel === "medias" && <div className="ed-panel-content"><h2>Photos et vidéos</h2><p className="ed-help">Les fichiers sont envoyés au stockage configuré. Enregistrez ensuite la fiche pour garder les changements.</p><div className="ed-upload-grid">
          <UploadField title="Photo de profil" accept="image/jpeg,image/png,image/webp" disabled={locked || uploading} onFile={file => upload(file,"photo")}/><UploadField title="Logo" accept="image/jpeg,image/png,image/webp,image/gif" disabled={locked || uploading} onFile={file => upload(file,"logo")}/><UploadField title="Couverture" accept="image/jpeg,image/png,image/webp" disabled={locked || uploading} onFile={file => upload(file,"cover")}/><UploadField title="Galerie (image ou vidéo)" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" disabled={locked || uploading} onFile={file => upload(file,"gallery")}/></div>
          <p className="ed-counter">Photos {gallery.filter(m => m.type === "image").length}/{caps.maxPhotos} · Vidéos {gallery.filter(m => m.type === "video").length}/{caps.maxVideos}</p><div className="ed-media-list">{gallery.map((media,i) => <div className="ed-media-item" key={media.url}><span>{media.type === "video" ? "Vidéo" : "Photo"} {i+1}</span><a href={media.url} target="_blank" rel="noreferrer">Ouvrir</a><button type="button" disabled={locked} onClick={() => updateData({galerie:gallery.filter((_,j) => j !== i)})}>Retirer</button></div>)}</div>{uploading && <p role="status">Téléversement…</p>}</div>}
        {panel === "apparence" && <div className="ed-panel-content"><h2>Apparence</h2><label>Disposition<select disabled={locked} value={draft.data.entete?.disposition ?? "portrait"} onChange={e => updateData({entete:{...draft.data.entete,disposition:e.target.value as NonNullable<FicheRecord["data"]["entete"]>["disposition"]}})}>{caps.headerLayouts.map(layout => <option key={layout} value={layout}>{layout}</option>)}</select></label><label>Taille<select disabled={locked} value={draft.data.entete?.taille ?? "m"} onChange={e => updateData({entete:{...draft.data.entete,taille:e.target.value as NonNullable<FicheRecord["data"]["entete"]>["taille"]}})}><option value="s">Petite</option><option value="m">Moyenne</option><option value="l">Grande</option></select></label><label>Thème<select disabled={locked} value={draft.data.entete?.theme ?? caps.theme} onChange={e => updateData({entete:{...draft.data.entete,theme:e.target.value as NonNullable<FicheRecord["data"]["entete"]>["theme"]}})}>{caps.themes.map(theme => <option key={theme} value={theme}>{theme}</option>)}</select></label><p className="ed-help">Le téléphone reflète chaque changement immédiatement.</p></div>}
        {panel === "blocs" && <div className="ed-panel-content"><h2>Blocs de la fiche</h2><p className="ed-help">Les possibilités ci-dessous viennent des capacités renvoyées par le serveur.</p><div className="ed-tab-list">{tabs.map((tab,i) => <div className="ed-tab-row" key={tab.id}><span>{i+1}</span><div className="ed-tab-main"><b>{TAB_TYPES[tab.type]?.label ?? tab.type}</b>{caps.canRename && <input aria-label="Nom du bloc" placeholder={TAB_TYPES[tab.type]?.label} value={tab.titre ?? ""} disabled={locked} onChange={e => setTabs(tabs.map((t,j) => j === i ? {...t,titre:e.target.value} : t))}/>}</div>{caps.canReorder && <div className="ed-tab-move"><button type="button" aria-label="Monter" disabled={locked || i===0} onClick={() => {const next=[...tabs];[next[i-1],next[i]]=[next[i],next[i-1]];setTabs(next)}}>↑</button><button type="button" aria-label="Descendre" disabled={locked || i===tabs.length-1} onClick={() => {const next=[...tabs];[next[i+1],next[i]]=[next[i],next[i+1]];setTabs(next)}}>↓</button></div>}{caps.canHide && <label className="ed-visible"><input type="checkbox" checked={tab.visible!==false} disabled={locked} onChange={e => setTabs(tabs.map((t,j) => j===i ? {...t,visible:e.target.checked}:t))}/> Visible</label>}{caps.canAdd && <button type="button" disabled={locked} onClick={() => setTabs(tabs.filter((_,j)=>j!==i))}>Retirer</button>}{tab.type==="texte" && <textarea rows={3} value={tab.contenu ?? ""} disabled={locked} placeholder="Contenu du bloc" onChange={e=>setTabs(tabs.map((t,j)=>j===i?{...t,contenu:e.target.value}:t))}/>}</div>)}</div>
          {caps.canAdd && <div className="ed-add-tab"><select id="ed-add-tab" defaultValue="texte">{Object.entries(TAB_TYPES).filter(([type])=>caps.tabs.includes(type as TabType)&&(type==="texte"||!usedTypes.has(type as TabType))).map(([type,info])=><option key={type} value={type}>{info.label}</option>)}</select><button type="button" disabled={locked} onClick={()=>{const select=document.getElementById("ed-add-tab") as HTMLSelectElement|null;if(select)addTab(select.value as TabType)}}>Ajouter un bloc</button></div>}
          {!caps.canReorder && <p className="ed-lock-note">La réorganisation n’est pas incluse dans cette formule.</p>}{!caps.canHide && <p className="ed-lock-note">La visibilité des blocs est fixée par cette formule.</p>}
        </div>}
        {feedback && <p className={save.isError || feedback.includes("Limite") ? "ed-feedback error" : "ed-feedback"} role="status">{feedback}</p>}
        <footer className="ed-bottom-actions">{saveButton}<Link to="/espace-client">Quitter l’éditeur</Link></footer>
      </section>
      <aside className="ed-preview" aria-label="Prévisualisation en direct"><div className="ed-preview-heading"><div><span>APERÇU EN DIRECT</span><h2>Votre fiche</h2></div><span className="ed-live-dot">En direct</span></div><div className="ed-phone"><div className="ed-phone-speaker"/><div className="ed-phone-screen" ref={phoneScroller}><Fiche key={draft.id} fiche={draft} scrollerRef={phoneScroller}/></div></div><p className="ed-preview-note">Cet aperçu ne comptabilise aucun passage.</p></aside>
    </div>
  </div>;
}

function UploadField({title,accept,disabled,onFile}:{title:string;accept:string;disabled:boolean;onFile:(file:File)=>void}) {
  return <label className="ed-upload"><span>{title}</span><input type="file" accept={accept} disabled={disabled} onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onFile(file);event.currentTarget.value="";}}/><small>Choisir un fichier</small></label>;
}
