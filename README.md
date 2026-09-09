# Shrewsbury Armory — ERP

Site statique (HTML/CSS/JS) + Supabase (base de données, auth, realtime, stockage).
Hébergeable gratuitement sur GitHub Pages.

## 1. Créer le projet Supabase

1. Allez sur https://supabase.com → **New project**.
2. Une fois créé, ouvrez **SQL Editor** → collez tout le contenu de `sql/schema.sql` → **Run**.
   Cela crée toutes les tables, la sécurité (RLS), et les fonctions métier.
3. Allez dans **Storage** → **New bucket** → nommez-le `documents` → cochez **Public bucket**.
   (C'est ici que sont stockées les cartes d'identité/contrats des employés.)

## 2. Créer vos comptes (PDG, gestionnaire, gouvernement)

Supabase gère les mots de passe côté serveur ; il n'y a pas de page d'inscription publique
(volontairement, pour la sécurité).

Pour chaque personne :
1. **Authentication → Users → Add user** → renseignez l'e-mail et le mot de passe que vous choisissez.
2. Copiez l'**UUID** généré (colonne `id`).
3. Connectez-vous au site avec le compte **PDG** une fois qu'il existe (voir point 4),
   allez sur la page **Comptes / accès**, collez l'UUID, indiquez le nom et le rôle
   (`pdg`, `gestionnaire` ou `gouvernement`).

Pour le tout premier compte PDG (avant que la page « Comptes » soit accessible), faites
l'étape 3 directement en SQL Editor :
```sql
insert into profiles (id, nom, role) values ('UUID-COPIÉ-ICI', 'Nom du PDG', 'pdg');
```

## 3. Configurer le site

Ouvrez `js/config.js` et remplacez :
```js
const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "VOTRE_CLE_ANON_PUBLIC";
```
Ces deux valeurs se trouvent dans **Project Settings → API** (utilisez bien la clé
`anon public`, jamais la clé `service_role`).

## 4. Déployer sur GitHub Pages

1. Créez un dépôt GitHub, poussez tout le contenu de ce dossier à la racine.
2. **Settings → Pages → Source : Deploy from branch → branch `main` / dossier `/ (root)`**.
3. Votre site est disponible à `https://votre-compte.github.io/votre-repo/`.

Toute modification (y compris `js/config.js`) nécessite un nouveau `git push` pour être en ligne.

## 5. Fonctionnement des modules

- **Comptabilité** : grand livre unique. Chaque farming/achat met aussi à jour le stock
  automatiquement (fonctions `fn_enregistrer_farming` / `fn_enregistrer_achat`). Aucune ligne
  n'est jamais supprimée par un gestionnaire — seul le PDG peut corriger/supprimer une ligne,
  ce qui garantit l'intégrité de l'historique consultable par le gouvernement.
- **Stock** : ressources (matériaux/peintures), articles non sérialisés (munitions, kits…),
  et armes sérialisées (1 ligne = 1 arme physique, avec son n° de série obligatoire).
  Un bouton permet d'ajouter un nouveau type de ressource si le jeu évolue.
- **Calculateur** : la recette de chaque article (quantité de chaque ressource nécessaire)
  est entièrement modifiable. Le bouton « Fabriquer » consomme les ressources et incrémente
  le stock (ou demande un n° de série réel si l'article est sérialisé).
- **Caisse** : formulaire → aperçu de facture identique au modèle fourni, mis à jour en
  direct à chaque frappe. « Télécharger l'image » et « Copier l'image » utilisent
  `html2canvas` (la copie image nécessite un navigateur récent type Chrome/Edge).
  « Valider la vente » décrémente le stock, enregistre la vente en comptabilité et verse
  automatiquement 5 000 $ de commission au vendeur.
- **Employés** : contrat et carte d'identité sont uploadés comme fichiers (bucket
  `documents`) ; salaire fixe + historique de primes/augmentations/commissions.
- **Clients / Fournisseurs** : carte d'identité et permis stockés comme **liens (URL)**,
  pas comme fichiers, conformément à votre demande.
- **Temps réel** : toutes les pages écoutent les changements Supabase Realtime — aucun
  rafraîchissement manuel n'est nécessaire, les autres utilisateurs voient les mises à jour
  instantanément.

## 6. Sécurité

Toutes les règles d'accès sont appliquées **côté base de données** (Row Level Security),
pas seulement dans le JavaScript : même en modifiant le code du site, un compte
« gouvernement » ne pourra jamais écrire de données, et un compte non listé dans `profiles`
ne peut rien lire ni écrire.

## 7. Limites connues (MVP)

- La création de comptes (e-mail + mot de passe) se fait depuis le tableau de bord Supabase,
  pas depuis le site (Supabase ne permet pas la création d'utilisateurs avec la clé publique).
- La copie d'image de facture dépend du support `ClipboardItem` par le navigateur ; le
  téléchargement fonctionne partout.

## 8. Logo

Déposez votre logo dans `assets/logo.png` (le fichier n'existe pas encore dans ce ZIP).
Toutes les pages référencent déjà `assets/logo.png` et s'affichent correctement même sans
logo (l'image est simplement masquée si le fichier est absent).
