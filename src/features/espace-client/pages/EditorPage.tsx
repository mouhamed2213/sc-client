// Éditeur de fiche (démo) : formulaire à gauche, aperçu téléphone à droite. Route : /espace-client/fiches/:slug
export default function EditorPage() {
  return <></>;
  // const { slug } = useParams<{ slug: string }>();
  // const [fiches, setFiches] = useState(FICHES);
  // const scroller = useRef<HTMLDivElement>(null);
  // const f = fiches.find((x) => x.slug === slug);
  // useEffect(() => { document.title = 'Modifier ma fiche — Support Connecté'; scroller.current?.scrollTo(0, 0); }, [slug]);
  // const update = (nf: FicheRecord) => setFiches((all) => all.map((x) => (x.slug === nf.slug ? nf : x)));

  // if (!f) return <div className="db"><div className="db-state"><h2>Fiche introuvable</h2><Link className="db-copy" to="/espace-client">Retour au tableau de bord</Link></div></div>;
  // return (
  //   <div className="demo-body m-editeur">
  //     <aside className="demo-ed"><p><Link to="/espace-client" className="db-k">← Tableau de bord</Link></p><Editor fiche={f} onChange={update} /></aside>
  //     <div className="demo-stage"><div className="device"><div className="device-in" ref={scroller}><Fiche key={f.slug} fiche={f} scrollerRef={scroller} /></div></div></div>
  //   </div>
  // );
}
