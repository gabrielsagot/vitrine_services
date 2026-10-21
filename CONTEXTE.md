# Contexte du projet : micro-entreprise de création d'interfaces sur mesure

> Ce fichier rassemble les informations de départ sur le porteur de projet et l'activité envisagée.
> Il sert de référence pour la suite (site vitrine, offre de services, démarchage, etc.).

---

## 1. Le porteur de projet

| Élément | Détail |
|---|---|
| Âge | 19 ans |
| Situation | Étudiant en alternance |
| Projet | Créer sa propre **micro-entreprise** |
| Maturité du projet | Envie d'entreprendre depuis environ **un an et demi** |
| Statut actuel | Activité **pas encore lancée** (aucune prestation facturée pour l'instant) |

---

## 2. L'activité envisagée

### Cœur de métier
- **Concevoir et développer des interfaces / applications sur mesure** pour des particuliers et des professionnels.
- L'objectif est de les aider dans leur **travail de tous les jours** avec des outils adaptés à leur métier.

### Cible
- **Particuliers**.
- **Professionnels**, souvent eux aussi en **micro-entreprise** (indépendants, artisans, prestataires de services, etc.).
- Démarchage direct envisagé.

### Positionnement : question encore ouverte
Deux pistes sont envisagées, aucune n'est encore tranchée :
1. **Se spécialiser dans un domaine très précis** (une niche métier).
2. **Garder une offre plus générale**, ouverte à différents métiers.

---

## 3. Référence existante : l'application pour une praticienne en soins équins

C'est le premier projet concret, qui sert de preuve de savoir-faire.

### La cliente
- Belle-mère du porteur de projet.
- Métier : **soins des chevaux à domicile**. Elle se déplace chez les propriétaires pour s'occuper de leurs chevaux, notamment en pratiquant le **shiatsu équin**.
- Projet réalisé **gratuitement** (ce n'est donc pas encore une activité rémunérée).

### L'application
- Type : **PWA** (Progressive Web App), pensée pour le **téléphone**.
- Taille : **plus de 55 000 lignes de code** au total.
- Statut : **en cours de développement**, toujours activement améliorée.
- Niveau de finition : application **très complète et très poussée**.

### Fonctionnalités principales
- **Planification mensuelle** : saisie de chaque rendez-vous de chaque client sur le mois.
- **Optimisation des trajets** : calcul automatique des tournées les plus intéressantes en termes de **consommation de carburant**.
- **Gestion comptable très poussée**.
- Et de nombreuses autres fonctionnalités.

---

## 4. Objectif

- **Reproduire ce type de projet pour d'autres personnes** et **être rémunéré** pour ces prestations.
- Faire de la création d'outils métier sur mesure l'activité principale de la micro-entreprise.

---

## 5. Stratégie commerciale : le parrainage

### Le principe
- L'application de la belle-mère n'a **pas été facturée**, mais une **contrepartie non monétaire** a été demandée : qu'elle **recommande les services et les compétences** du porteur de projet auprès de son réseau (des personnes susceptibles d'être intéressées).
- Le même système sera proposé aux clients suivants :
  - une application développée pour un **prix très faible** ;
  - **en échange**, le client s'engage à **recommander** le porteur de projet à son tour.

### Objectif en deux phases
1. **Phase de lancement** : se constituer un **portefeuille clients** rapidement grâce au parrainage et à des prix très bas.
2. **Phase de croisière** : une fois assez de clients obtenus, **augmenter les prix** et revenir à des **tarifs normaux**, avec peu ou plus du tout de parrainage.

### Le rôle du site dans ce système
- Pour recommander le porteur de projet, on ne partage **pas son numéro de téléphone** mais le **lien de son site vitrine**.
- Ce lien sera surtout partagé **par message, sur téléphone** (SMS, WhatsApp, etc.). La personne recommandée l'ouvrira donc en général **depuis son mobile**, en touchant le lien.
- L'aperçu du lien dans la conversation doit donner envie de cliquer : **belle image (visuel d'application), titre et description** soignés.

---

## 6. Le site vitrine / portfolio

### Objectif
- Un site vitrine de type **portfolio**, qui **démontre les compétences** du porteur de projet.
- **Mot d'ordre : impressionner le visiteur**, c'est-à-dire le client potentiel.

### Contraintes et exigences
| Exigence | Détail |
|---|---|
| **Mobile-first** | Pensé d'abord pour le téléphone, puisque la majorité des visites viendra d'un lien partagé par message. |
| **Beau aussi sur ordinateur** | Entièrement responsive : la version PC doit être tout aussi soignée. |
| **Aperçu de lien soigné** | Quand on partage le lien, l'aperçu doit être réussi (image d'application, titre, description). |
| **Performant sur les vieux téléphones** | Les visiteurs peuvent avoir un téléphone **ancien et peu puissant**. C'est un point **important**. |
| **Juste milieu impressionnant / léger** | Le site doit impressionner **sans** devenir lent ni saccadé sur un appareil modeste. |

### Conséquences techniques à prévoir (notes de travail)
- **Aperçu de lien** : balises Open Graph et Twitter Card (`og:image`, `og:title`, `og:description`…), avec une image dédiée de bonne qualité mais légère.
- **Légèreté** : peu ou pas de framework lourd, peu de JavaScript, images optimisées (WebP/AVIF, tailles adaptées, chargement différé).
- **Animations qui coûtent peu** : surtout via CSS (`transform`, `opacity`), avec des effets plus riches activés seulement si l'appareil le permet (amélioration progressive).
- **Expérience à deux niveaux** (piste) : une version riche (3D, animations avancées) chargée **uniquement** sur les appareils capables, et une version soignée mais allégée sur les appareils modestes. Le contenu essentiel s'affiche tout de suite, et les effets lourds se chargent ensuite.
- **Accessibilité et confort** : respecter `prefers-reduced-motion` et garder des textes lisibles sur petit écran.
- **Tester sur un mobile modeste**, ou en simulant un téléphone lent, en plus des appareils récents.

### Contenu du site (souhaits du porteur de projet)

**Impression recherchée : beauté, simplicité, originalité.**

#### Message central : le sur-mesure
- C'est **LA** caractéristique de l'activité, et il faut jouer dessus **au maximum**.
- Il faut le **dire** et surtout le **montrer** :
  - chaque application est **entièrement développée pour un client, et uniquement pour lui** ;
  - l'adaptation au **métier** et à la **demande** est **totale (100 %)**.

#### Un résumé des compétences
- Un **beau résumé** de ce que le porteur de projet sait faire et peut faire.
- Présenté de manière **originale**, mais **sans perdre le visiteur** : il peut être **âgé** ou **peu à l'aise avec la technologie**.

#### Léger en contenu
- **Pas de blabla interminable.**
- **Aucun prix affiché.**

#### Devis gratuit, à mettre en avant
- Pour connaître le prix, le visiteur **contacte** le porteur de projet.
- Le **devis est 100 % gratuit et sans condition** : si la proposition ne convient pas, le client n'a **aucune obligation** de commander, et le devis ne lui est **pas facturé**.
- Cet argument doit être **mis en avant** sur le site.

#### Contact « sur mesure » lui aussi
- Les services sont sur mesure, donc **la façon de le joindre doit l'être aussi**.
- Le **CTA de contact est l'élément le plus important** du site.

### Décisions prises
| Sujet | Décision |
|---|---|
| **Lien de parrainage personnalisé** | ✅ **Validé.** Un lien propre à chaque parrain affiche par exemple « *Prénom* vous recommande », et permet de savoir qui a recommandé qui. Les prénoms viennent d'une liste gérée par le porteur de projet, jamais du texte libre du lien (sécurité). |
| **Nom, marque, univers visuel** | ⏳ **Rien n'existe encore** (ni nom, ni logo, ni univers). C'est un **chantier à part entière** : le porteur de projet veut quelque chose de **très travaillé et réfléchi**. |
| **Zone géographique** | Aucune limite : les applications (PWA) se font à distance, partout. |
| **Témoignage de la belle-mère** | **Pas sur le site**, ou alors **100 % anonymisé**. Son témoignage passe d'abord **de vive voix**, quand elle parle de lui à son réseau. |
| **Photo et âge** | ✅ La photo **et** l'âge du porteur de projet seront affichés. |
| **Moyens de contact** | Remplacé par les lignes « Contact » ci-dessous (conversation + SMS, WhatsApp, e-mail). |
| **Style visuel** | Un **mélange de clair et premium et de chaleureux, façon atelier**. Inspiration : les **belles applications mobiles modernes**, parfois de niche (références : **refero.design**, **Duolingo**). Il faut des **éléments qui sortent du lot** (3D, micro-animations…) et une vraie **identité**, quelque chose de **personnel**. |
| **Domaine de la démo** | La **planification de journées** et la **gestion centralisée des clients**. |
| **Démos retenues** | ✅ **Deux démos, adaptées à la puissance de l'appareil.** **A, « La tournée qui se démêle »** : un trajet emmêlé entre des rendez-vous se démêle en une boucle optimisée, et les rendez-vous se rangent dans un planning (km économisés). **B, « L'atelier »** : le visiteur assemble son application en quelques étapes (activité, besoins, couleurs), en 3D sur les appareils puissants, et ses choix pré-remplissent le contact. |
| **Mascotte** | ✅ **Oui**, mais **ni ringarde ni étrange**. |
| **Contact conversationnel** | Piste retenue avec les démos : un formulaire en forme de conversation, une question par écran, pré-rempli par la démo B et par le lien de parrainage. |
| **Ordre de travail** | 1. Identité (nom, univers, mascotte) → 2. Concept et maquette, avec un prototype de la démo → 3. Développement du site. |
| **Cible** | **Un peu tout le monde** (pros, indépendants, particuliers). |
| **Hébergement / nom de domaine** | ⏳ À décider, selon la qualité du résultat. |
| **Micro-entreprise** | **Pas encore créée** : le porteur de projet attend d'avoir des **promesses de clients** avant de la lancer. |

### Pistes en discussion
- **Étude de cas « soins équins »** : seulement sous forme **anonymisée** (captures avec des données fictives, bénéfices concrets).
- **Parcours en 3 ou 4 étapes**, avec le devis gratuit mis en avant : on discute, devis gratuit, création, accompagnement.
- **Contact accessible** : bouton fixe « Devis gratuit » sur mobile.
- **Ton** : vouvoiement, aucun jargon technique, textes grands et lisibles.

---

## 7. Identité de marque (en construction)

| Élément | Choix |
|---|---|
| **Émotions recherchées** | **Confiance et sérénité** + **proximité et chaleur** |
| **Personnalité** | **L'expert élégant** : sobre, raffiné, précis. Peu de mots, beaucoup de classe. Équilibre visé : élégance experte **et** chaleur rassurante, une marque « haut de gamme accessible ». |
| **Palette** | Blanc cassé `#F7F6F2` (fond) · Bleu nuit `#16213E` (principal) · Bleu ardoise `#5B6B8C` (secondaire) · Ambre `#E0A54A` (accent) |
| **Typographie** | ✅ **Instrument Serif pour les titres** (fine, élégante, trait net ; Fraunces écartée car « trop tremblante ») + **sans-serif simple et lisible pour le texte** |
| **Valeurs** (en plus du sur-mesure) | **Écoute** · **Simplicité** · **Accompagnement durable** |
| **Nom** | ⏸️ **Mis de côté volontairement.** Le porteur de projet veut prendre le temps de la réflexion, car le nom est très important. Il n'est plus sûr de vouloir un nom inventé. |
| **Accroche principale** | ✅ « **Votre quotidien, sur mesure.** » |
| **Voix** | ✅ À la **première personne (« je »)**, avec le **vouvoiement** pour le visiteur. |
| **Métaphore de la couture** | ✅ **Clins d'œil discrets** seulement (« cousue main », « sur mesure »…). Le reste est en langage simple. |
| **Sous-titre** | ✅ « *Une application pensée pour votre métier, conçue pour vous seul.* » |
| **Accueil via parrainage** | ✅ « ***Prénom* pense que je peux vous aider.** » |
| **Compétences** | ✅ Présentées **par verbes d'action** (ex. Organiser · Suivre · Facturer · Se déplacer), avec une ligne d'explication chacun. |
| **Âge** | ✅ **Mentionné simplement** dans la présentation, sans insister. |
| **Bouton principal** | ✅ « **Parlons de votre projet** », avec en dessous « *Le devis est offert, sans aucune obligation.* » |
| **Structure du site** | ✅ **Une seule page** qu'on fait défiler, dans cet ordre : 0. bandeau de parrainage (si lien) → 1. **Accueil** → 2. **Démo A (la tournée)** → 3. **Ce que je peux faire** (verbes) → 3 bis. **Réalisation** (courte, anonymisée) → 4. **Comment ça se passe** (4 étapes) → 5. **Qui je suis** → 6. **Démo B (l'atelier)** → 7. **Contact en conversation** → 8. Pied de page (mentions légales). Le bouton « Parlons de votre projet » reste fixé en bas sur mobile. |
| **Section Réalisation** | ✅ **Oui, courte et 100 % anonymisée** : « Pour une praticienne en soins équins », 2 ou 3 écrans avec des données fictives, 3 bénéfices concrets. Emplacement proposé : juste après les verbes (la preuve après la promesse). |
| **Démo A : déclenchement** | ✅ **Au défilement** : le trajet se démêle tout seul pendant qu'on fait défiler, dans la continuité du fil conducteur. |
| **Démo A : résultat** | ✅ **Le planning rangé** : une fois le trajet démêlé, les rendez-vous viennent se ranger dans une journée heure par heure (avec des contraintes réalistes : pré sans lumière, temps de route…). |
| **Démo B : étapes** | ✅ **Besoins → couleur** (pas d'étape « métier ») : le visiteur coche ce qui lui prend du temps, puis choisit sa couleur, et l'app se coud pièce par pièce. |
| **Démo B : nom de l'app** | ✅ **Facultatif** : un nom par défaut est proposé, que le visiteur peut remplacer. Ce nom s'affiche alors dans le téléphone (écran d'accueil, icône). |
| **Contact : questions** | ✅ Prénom + **moyen et moment préférés** pour être recontacté (SMS, WhatsApp, e-mail… ; matin, midi, soir) + **message libre** facultatif. Les choix de la démo B et le prénom du parrain sont **joints automatiquement** à la demande, sans question supplémentaire (proposition). |
| **Contact : canaux directs** | ✅ **SMS**, **WhatsApp** et **e-mail** (pas de bouton d'appel). |
| **Liens de parrainage : gestion** | ✅ **Un petit espace admin privé** : créer un lien en quelques secondes depuis le téléphone et voir qui a recommandé qui. Il faut une base de données (Supabase, déjà maîtrisé). |
| **Liens de parrainage : format** | ✅ **`tonsite.fr/prenom`** (ex. `tonsite.fr/sylvie`). À prévoir : réserver les noms de pages du site (ex. `mentions-legales`, `admin`) et gérer les homonymes (ex. `sylvie-m`). |
| **Mascotte** | ✅ **Le fil** : un fil vivant avec une perle en tête, qui coud, trace et démêle (le sur-mesure en mouvement). **Sans effet de lueur appuyé** : le rendu doit rester sobre et net. Les croquis d'exploration sont dans `explorations/mascotte.html`. Détails retenus : **yeux à certains moments seulement** (le fil reste abstrait, puis la perle « ouvre les yeux » aux moments clés : accueil, démo réussie, contact) · **trait calligraphique** (épaisseur variable, façon plume) · **couleur selon le fond** (bleu nuit sur fond clair, ambre sur fond sombre) · rôle de **fil conducteur** (il traverse la page au défilement, relie les sections, démêle la tournée, coud l'app et mène au contact, avec un dosage selon la puissance de l'appareil). |

---

## 8. Référence : l'application de soins équins (synthèse pour le site)

> Étudiée en lecture seule depuis le dépôt privé de l'application. **Tout ce qui apparaîtra sur le site sera anonymisé** : ni nom, ni client, ni donnée réelle.

### Le problème de départ
- Les demandes arrivaient **en vrac** (WhatsApp, Messenger, SMS).
- Les tournées étaient construites **à la main, sur papier**, par secteur, ce qui prenait **des heures chaque mois**.
- Les relances (« à revoir dans 3 mois ») **s'oubliaient**.
- Le terrain est contraignant : prés en **zone blanche** (pas de réseau), usage **à une main**, **en plein soleil**.

### Ce que fait l'application, rangé par verbes (matière pour la section « Ce que je peux faire »)
| Verbe | Ce que l'app fait concrètement |
|---|---|
| **Organiser** | Propose automatiquement les tournées du mois, avec 3 priorités au choix (moins de journées, équilibré, moins de route). Tout se modifie au glisser-déposer. L'agenda pro et perso remplace l'agenda papier. Résumé du jour. Les horaires se recalculent en cascade en cas de retard. « Trouver un créneau » propose les 3 meilleures options pour une nouvelle demande. |
| **Suivre** | Fiches clients et animaux avec photos et historique. Comptes rendus de séance. Relances « à revoir dans X mois ». Messages clients prêts à copier (fourchette d'arrivée, modèles modifiables). Tableau de bord mensuel. |
| **Facturer** | Factures conformes (numérotation légale, mentions obligatoires), paiements (dont virement par QR code), avoirs, cartes de séances, dépenses, bénéfices, aide aux déclarations URSSAF et impôts, relance des impayés, exports. |
| **Se déplacer** | Tournées optimisées sur le **coût réel du trajet** (consommation × distance × prix du carburant + péages). **Prix du carburant récupéré automatiquement** aux stations proches. Carte de la clientèle et itinéraire du jour. Respect des règles métier : 1h30 de route au plus entre deux étapes, rendez-vous avant le coucher du soleil pour les prés sans lumière. **Fonctionne sans réseau**, puis se synchronise. |

### Le savoir-faire qu'elle prouve (arguments pour le site, en langage simple)
- **L'écoute** : un vrai recueil de besoin formalisé avant de coder, puis des améliorations guidées par la façon dont la cliente réorganise elle-même ses tournées.
- **Le sur-mesure poussé** : des règles propres à son métier (prés sans lumière, clients bavards, chevaux, chiens et humains, durées de séance, jours de repos), toutes réglables.
- **La fiabilité sur le terrain** : l'app marche sans réseau, avec de grandes zones tactiles, et reste lisible en plein soleil.
- **L'accompagnement durable** : des dizaines de versions livrées au fil des retours, avec un historique des nouveautés visible dans l'app.
- **Le soin du détail** : une identité propre (le fer à cheval comme signature, un sceau qui se dessine à la fin d'une séance), des transitions d'écran douces et le respect du réglage « réduire les animations ».

### Matière pour les démos
- **Démo A (la tournée)** : on peut s'appuyer sur des contraintes réalistes pour la crédibilité, par exemple :
  - 5 rendez-vous au plus par jour ;
  - pas plus d'1h30 de route entre deux étapes ;
  - « pré sans lumière : avant 16h10 » ;
  - un coût calculé en carburant et en péages.
- **Démo B (l'atelier)** : les modules réels (planning, fiches clients, factures, carte, relances, comptes rendus) servent de « pièces » à assembler.
- **Section Réalisation** : avant / après en 3 bénéfices, par exemple :
  - « Des heures de planning papier → les tournées du mois proposées en un geste » ;
  - « Une compta complète et conforme » ;
  - « Fonctionne même au milieu des prés, sans réseau ».

### Goûts du porteur de projet observés dans l'application (à respecter sur le site)
- **Sobre, jamais gadget** : **aucun émoji**, aucune icône « magique » qui fait IA (étincelles, baguette).
- La police **Fraunces** a été essayée dans l'app puis **écartée (« trop tremblante »)**. Pour les titres serif du site, il faut **choisir une autre serif**.
- Il apprécie les **animations de tracé** (sceau qui se dessine) et les **transitions douces et rapides**, ce qui est cohérent avec le fil.

---

## 9. Points à approfondir (prochaines étapes)

- [ ] **Trouver le nom et l'identité visuelle** de l'activité (chantier prioritaire : le design du site en dépend).
- [ ] Choisir entre une niche précise ou une offre généraliste.
- [ ] Définir les prestations et la grille tarifaire (tarif « parrainage » de lancement, puis tarif normal).
- [ ] Formaliser les conditions du parrainage (ce qui est demandé en échange du prix réduit).
- [ ] Préparer la création de la micro-entreprise (démarches, statut, compatibilité avec l'alternance).
- [ ] Présenter l'application de soins équins comme étude de cas / portfolio.
- [ ] Définir le contenu du site vitrine.
- [ ] Construire une stratégie de démarchage.
