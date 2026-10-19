# Espace client : éditeur et fiche

Ce dossier contient le back-office des membres et la fiche publique ouverte par la carte NFC / le QR.

## Organisation

```
components/
├── Editor.tsx            Assemble les sections du panneau d'édition (≈ 60 lignes)
├── editor/
│   ├── sections/         Un bloc du panneau : PlanBanner, QrBox, TemplateBox, BlocksBox, IdentityBox, AppearanceBox
│   ├── tabs/             UN ÉDITEUR PAR TYPE D'ONGLET (MenuEditor, GalerieEditor, …)
│   ├── ContentEditor.tsx Registre type d'onglet → éditeur (Record<TabType, …>, exhaustif)
│   ├── shared.tsx        Lock (verrou d'offre), envoi de média, imageInput
│   ├── useDnD.ts         Glisser-déposer au pointeur
│   ├── tabsOf.ts         Onglets effectivement affichés (fiche + droits de la formule)
│   └── types.ts          TabEditorProps
├── Fiche.tsx             Page publique : entête, onglets, actions (≈ 250 lignes)
└── fiche/
    ├── views/            UNE VUE PAR TYPE D'ONGLET (MenuView, GalerieView, …)
    ├── SectionBody.tsx   Registre type d'onglet → vue (Record<TabType, …>, exhaustif)
    ├── Section.tsx, Carousel.tsx, Sheet.tsx, Photos.tsx, video.tsx, QR.tsx, Icon.tsx, usePullQR.ts, format.ts, types.ts
hooks/useFicheEditor.ts   Brouillon local, état « non enregistré », sauvegarde
lib/fichePayload.ts       Brouillon → corps du PATCH (n'envoie que les différences)
lib/ficheSource.ts        Source de données : API ou mock (VITE_USE_MOCK_FICHES)
```

## Modèles : où est la référence ?

```
src/types/
├── fiche.ts   FicheRecord = LA RÉFÉRENCE côté front (éditeur, fiche publique, tests), FicheData, Onglet, FICHE_DATA_KEYS
├── plan.ts    Plan (droits d'une formule), FORMULES, PlanType
├── api.ts     Formes BRUTES du serveur : ApiFicheDetail (GET/PATCH fiches/:id), ApiFicheSummary (dashboard)
├── auth.ts    IRegister, Login
└── index.ts   barrel : `import type { FicheRecord } from "../../types"` fonctionne toujours
```

- Les composants ne manipulent **jamais** un DTO : `lib/ficheApi.ts` (`fetchFiche`, `patchFiche`, `toFicheRecord`) est la
  seule frontière serveur → front.
- Les enums « serveur » en MAJUSCULES sont **dérivés** du domaine (`Uppercase<Secteur>`, `Lowercase<PlanType>` pour
  `Formule`) : ils ne peuvent plus diverger.
- `FICHE_DATA_KEYS` (types/fiche.ts) liste les clés de `FicheData` **une seule fois** ; elle sert à la lecture
  (`ficheApi.ts`) et au PATCH (`fichePayload.ts`). Oublier une clé après en avoir ajouté une à `FicheData` fait échouer
  `pnpm typecheck`. Seule la synchronisation avec le schéma Zod du serveur reste manuelle
  (`api-sc/src/modules/fiches/fiches.schemas.ts`).

## Ajouter un type d'onglet

1. Ajouter la valeur à `TabType` (`src/types/index.ts`) et la déclarer dans `TAB_TYPES` / les plans (`src/lib/plans.ts`).
2. Créer `components/editor/tabs/XxxEditor.tsx` (props : `TabEditorProps`) et l'inscrire dans `editor/ContentEditor.tsx`.
3. Créer `components/fiche/views/XxxView.tsx` (props : `ViewProps`) et l'inscrire dans `fiche/SectionBody.tsx`.
4. Si l'onglet stocke une nouvelle clé dans `fiche.data` : l'ajouter à `FicheData` et à `FICHE_DATA_KEYS`
   (`types/fiche.ts`), prévoir son nettoyage dans `lib/fichePayload.ts`, et l'ajouter au schéma serveur (`updateFicheSchema`).

Les deux registres sont typés `Record<TabType, …>` : **oublier l'étape 2 ou 3 fait échouer `pnpm typecheck`**.

## Tests

```bash
pnpm test          # Vitest : fichePayload + rendu de chaque onglet (éditeur et fiche) sur les fiches de démo
pnpm typecheck
```

`components/tabs.test.tsx` rend chaque type d'onglet pour chaque fiche de démonstration : il protège ce découpage.
