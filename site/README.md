# Site vitrine

Astro (pages statiques + quelques routes serveur), îlots Preact, GSAP, Three.js. Déployé sur Vercel.
Contexte et décisions : [`../CONTEXTE.md`](../CONTEXTE.md). Mise en ligne : [`../docs/mise-en-ligne.md`](../docs/mise-en-ligne.md).

## Démarrer

```bash
cd site
cp .env.example .env   # facultatif : sans valeurs, le site tourne en mode démo
npm install
npm run dev            # http://localhost:4321
```

| Commande         | Rôle                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `npm run dev`    | Serveur de développement                                          |
| `npm run build`  | Compilation pour Vercel (`.vercel/output`) + en-têtes de sécurité |
| `npm run check`  | Vérification des types (TypeScript strict)                        |
| `npm test`       | Tests (moteur de tournée, liens de parrainage)                    |
| `npm run format` | Mise en forme (Prettier)                                          |

Ajoute `?effets=low`, `?effets=mid` ou `?effets=high` à une adresse pour forcer un niveau d'effets.

## Organisation

```
src/
  config/site.ts            ← coordonnées, nom, photo, textes clés : tout ce qui se règle à la main
  pages/
    index.astro             ← accueil (statique)
    [slug].astro            ← lien de parrainage /prenom (calculé à la demande)
    og.png.ts, og/[slug].png.ts  ← images d'aperçu (générées avec satori + resvg)
    api/contact.ts, api/visit.ts ← demandes de contact, compteur de visites
    admin.astro             ← espace admin (Supabase)
  components/sections/      ← une section de la page par fichier
  islands/                  ← composants interactifs (atelier 3D, conversation, admin)
  scripts/                  ← fil conducteur, démo de tournée
  lib/                      ← calcul pur : géométrie, trait calligraphique, moteur de tournée…
supabase/migrations/        ← tables, sécurité (RLS), fonctions
```

## Comment ça marche

- **Niveaux d'effets** (`lib/tier.ts`) : un petit calcul chronométré, puis une mesure de la fluidité, classent l'appareil en `low`, `mid` ou `high`.
  - `high` : téléphone 3D (Three.js) et démo épinglée au défilement.
  - `mid` : démo épinglée, téléphone en 3D CSS.
  - `low` : animations jouées une fois, fil dessiné d'un coup.
  - « Réduire les animations » est toujours respecté.
- **Fil conducteur** (`scripts/fil.ts`) : il relie des points d'ancrage invisibles posés dans les sections (`data-fil="ordre"`).
  - Il fait le tour de certains éléments (`data-fil-ring`) et s'interrompt où il faut (`data-fil-break`).
  - Les classes `fil-m` / `fil-d` réservent un ancrage au téléphone ou au grand écran ; `fil-gut*` et `fil-seam*` placent le fil dans les marges.
- **Trait calligraphique** (`lib/calligraphy.ts`) : un contour plein dont l'épaisseur dépend de la direction, comme une plume à bec large.
- **Démo de tournée** (`lib/tour.ts`) : six rendez-vous fictifs, toutes les permutations testées, contraintes horaires respectées.
- **Atelier** (`islands/atelier/`) : l'écran est dessiné sur un canvas. Il sert de texture au téléphone Three.js ou d'écran au téléphone CSS.
- **Mode démo** : sans Supabase, `/sylvie` et `/marc` fonctionnent et les demandes sont simulées.
