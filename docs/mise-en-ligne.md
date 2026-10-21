# Mettre le site en ligne

Ce guide suit l'ordre le plus simple. Compte environ une heure la première fois.
Tant que Supabase n'est pas branché, le site fonctionne en **mode démo** :
- les liens `/sylvie` et `/marc` servent d'exemples ;
- les demandes de contact sont simulées (rien n'est enregistré ni envoyé).

---

## 0. Compléter ses informations

Fichier `site/src/config/site.ts` : tout ce qui est marqué **À COMPLÉTER**.

| Champ | Exemple |
|---|---|
| `contact.phoneE164` | `+33612345678` (sert aux boutons SMS et WhatsApp) |
| `contact.email` | `bonjour@ton-domaine.fr` |
| `owner.fullName` | Prénom et nom (mentions légales) |
| `owner.portrait` | `/images/portrait.jpg`, avec la photo déposée dans `site/public/images/` (carrée, 640 × 640 px conseillés) |
| `legal.siret`, `legal.address` | À la création de la micro-entreprise |
| `brand.name` | Le nom de la marque, une fois choisi |

---

## 1. Supabase (parrains, demandes, espace admin)

1. Sur [supabase.com](https://supabase.com), crée un projet (région **Paris, eu-west-3**) et note le mot de passe de la base.
2. Ouvre **SQL Editor**, colle le contenu de `site/supabase/migrations/20261021000000_parrainage_contact.sql` et lance-le.
3. Dans **Authentication → Providers → Email**, **désactive les inscriptions** (« Allow new users to sign up »).
   Seul ton compte doit exister.
4. Dans **Authentication → Users → Add user**, crée ton compte (e-mail et mot de passe).
5. Retourne dans **SQL Editor** pour donner les droits d'admin à ce compte :
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'ton-email@exemple.fr';
   ```
6. Dans **Project Settings → API**, récupère :
   - l'**URL du projet** → `PUBLIC_SUPABASE_URL`
   - la clé **publishable** (anciennement « anon ») → `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - la clé **secret / service_role** → `SUPABASE_SERVICE_ROLE_KEY`

   Cette dernière clé est secrète : elle ne va **que** dans Vercel, jamais dans le code.

Facultatif : pour effacer automatiquement les demandes de plus de 3 ans (comme l'annonce la page Confidentialité), active l'extension **pg_cron** et planifie `select public.purge_old_contact_requests();` une fois par mois.

## 2. Alerte par e-mail (Resend)

1. Crée un compte sur [resend.com](https://resend.com) (offre gratuite).
2. Ajoute et vérifie ton nom de domaine (quelques enregistrements DNS à copier).
   Pour tester avant d'avoir un domaine, l'expéditeur `onboarding@resend.dev` fonctionne, mais seulement vers ta propre adresse.
3. Crée une clé d'API → `RESEND_API_KEY`.
4. Expéditeur → `CONTACT_EMAIL_FROM` (ex. `Site <site@ton-domaine.fr>`). Destinataire → `CONTACT_EMAIL_TO` (ton adresse).

## 3. Notification sur le téléphone (ntfy)

1. Installe l'application **ntfy** (Android ou iPhone).
2. Abonne-toi à un **sujet long et impossible à deviner**, par exemple `vitrine-7f3k9q2m-demandes`.
3. Ce nom va dans `NTFY_TOPIC`.

Pour rester discrète, la notification ne contient ni numéro ni message, seulement le prénom et le moyen de contact préféré. Le détail arrive par e-mail et dans l'espace admin.

## 4. Vercel (hébergement)

1. Sur [vercel.com](https://vercel.com), **Add New → Project** et importe le dépôt `vitrine_services`.
2. **Root Directory** : `site`. Vercel reconnaît Astro tout seul.
3. **Environment Variables** : ajoute toutes les variables ci-dessous, puis **Deploy**.

| Variable | Rôle |
|---|---|
| `PUBLIC_SITE_URL` | Adresse définitive (ex. `https://ton-domaine.fr`), pour les aperçus de lien |
| `PUBLIC_SUPABASE_URL` | Supabase |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase (clé publique) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (clé secrète, serveur uniquement) |
| `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` | Alerte e-mail |
| `NTFY_TOPIC` (et `NTFY_TOKEN` si sujet protégé) | Notification |

Les variables qui commencent par `PUBLIC_` sont intégrées **au moment de la compilation** : après les avoir modifiées, il faut redéployer.

Par défaut, Vercel protège les déploiements d'aperçu : il faut être connecté à son compte Vercel pour les voir. C'est pratique pour tout vérifier sur ton téléphone avant d'ouvrir le site au public.

## 5. Nom de domaine

Une fois la marque trouvée : **Vercel → Project → Settings → Domains**. Achète le domaine ou branche-en un existant.
Mets ensuite `PUBLIC_SITE_URL` à jour et redéploie.

---

## Vérifications avant d'ouvrir le site

- [ ] `/admin` : connexion, puis création d'un lien de parrainage (ex. pour ta belle-mère).
- [ ] Le lien partagé par SMS ou WhatsApp affiche bien l'aperçu « *Prénom* pense que je peux vous aider. ».
- [ ] Une demande envoyée depuis ce lien arrive par e-mail, en notification, et dans `/admin` avec le bon parrain.
- [ ] Les boutons SMS, WhatsApp et e-mail ouvrent la bonne application avec ton numéro et ton adresse.
- [ ] Les mentions légales sont complètes (nom, adresse, SIRET une fois la micro-entreprise créée).
- [ ] Test sur un vieux téléphone : le site doit rester fluide. Pour comparer les versions, ajoute `?effets=low`, `?effets=mid` ou `?effets=high` à l'adresse.

## Bon à savoir

- **Partager le site** : envoie toujours un lien de parrainage (`ton-domaine.fr/prenom`) plutôt que l'adresse nue.
  Il personnalise l'accueil, l'aperçu dans les messageries et le suivi « qui a recommandé qui ».
- **Visites** : chaque ouverture d'un lien de parrainage est comptée (une fois par visite, sans aucune donnée personnelle).
- **Aucun cookie, aucune mesure d'audience** : donc pas de bandeau cookies à afficher.
