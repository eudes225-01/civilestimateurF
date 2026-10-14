# Connexion Google et projets enregistrés (Supabase)

Ordre à suivre. Aucune étape ne coûte rien pour démarrer (plans gratuits).

## 1. Supabase
1. Créer un projet sur supabase.com (région proche : Europe).
2. **SQL Editor → New query** : coller le contenu de `civilestimateur-backend/supabase/schema.sql` (dépôt B) puis **Run**.
3. **Project Settings → API** : noter l'URL du projet et la clé **anon** (publique).

## 2. Google Cloud (identifiant OAuth)
1. console.cloud.google.com → créer un projet → **APIs & Services → OAuth consent screen** (type *External*, nom de l'application, e-mail de contact).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized redirect URI** : `https://<projet>.supabase.co/auth/v1/callback`.
4. Copier le *Client ID* et le *Client secret*.

## 3. Brancher Google dans Supabase
**Authentication → Providers → Google** : activer, coller le Client ID et le Client secret.
**Authentication → URL Configuration** :
- *Site URL* : `https://civilestimator-archinova.store`
- *Redirect URLs* : ajouter la même adresse (et l'ancienne adresse vercel.app pendant la transition) et `http://localhost:5173`.

## 4. Variables d'environnement
- **Frontend (Vercel)** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ `VITE_API_URL` déjà en place).
- **Backend (Render)** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`. `REQUIRE_AUTH` vaut `true` par défaut en production : la lecture de plans exige alors une session valide.

## 5. Mise à jour du moteur
Le frontend épingle une version du moteur (dépôt B) dans `package-lock.json`. Après avoir poussé le dépôt B :
`npm update civilestimateur-engine` puis `npm install`, et commiter `package-lock.json`.

## Ce qui est stocké
- En base : titre, saisies, paramètres, niveaux, prix modifiés, **noms** des plans déposés.
- Pas en base : les fichiers de plans (PDF/images). Un projet rouvert garde les noms des plans, mais pour relancer une lecture il faut redéposer les fichiers.
- Chaque utilisateur ne voit que ses projets (Row Level Security).
