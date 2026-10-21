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
| **Moyens de contact** | ✅ Bouton d'appel ou de SMS **et** formulaire très court (nom, métier, téléphone). |
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

## 7. Points à approfondir (prochaines étapes)

- [ ] **Trouver le nom et l'identité visuelle** de l'activité (chantier prioritaire : le design du site en dépend).
- [ ] Choisir entre une niche précise ou une offre généraliste.
- [ ] Définir les prestations et la grille tarifaire (tarif « parrainage » de lancement, puis tarif normal).
- [ ] Formaliser les conditions du parrainage (ce qui est demandé en échange du prix réduit).
- [ ] Préparer la création de la micro-entreprise (démarches, statut, compatibilité avec l'alternance).
- [ ] Présenter l'application de soins équins comme étude de cas / portfolio.
- [ ] Définir le contenu du site vitrine.
- [ ] Construire une stratégie de démarchage.
