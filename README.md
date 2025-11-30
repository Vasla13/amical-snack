# AMICALE R&T - Snack & Fidelite

Application web React/Vite pour le snack de l'Amicale R&T : connexion par lien magique ou mot de passe, catalogue et panier, generation de Pass/QR, programme de points (boutique + roulette), et back-office admin (scan, stock, statistiques). L'app est fournie en PWA pour un usage mobile.

## Fonctionnalites
- Auth Firebase : lien magique + mode mot de passe, creation du mot de passe apres login (/setup), reset password, roles, admin defini via `constants.js`.
- Catalogue & panier : produits Firestore, ajout/retrait, disponibilite temps reel, validation -> creation d'ordre avec token QR.
- Pass & paiements simules : affichage des commandes, paiement "solde PayPal" simule ou cash, debit de points, QR a scanner cote admin.
- Fidelite : solde de points, boutique de recompenses, roulette animee (case opening) avec debit via transactions Firestore.
- Profil : changement de mot de passe, notifications push (FCM) si dispo, leaderboard mensuel/global.
- Admin : scan QR pour valider les commandes, changement de statut, historique, stats, gestion du stock (toggle disponibilite), seed produits par defaut, reset complet du stock.
- PWA : manifest + service worker autoUpdate (vite-plugin-pwa), cible mobile iOS/Android.

## Stack technique
- React 19, React Router 7, Vite 6.
- Firebase v12 (Auth, Firestore, Messaging optionnel).
- TailwindCSS, framer-motion, lucide-react.
- Vite PWA plugin.

## Structure rapide (src)
- `App.jsx` : routes, toasts/modales, finalisation lien magique, creation mot de passe, protections `/login`, `/setup`, `/admin`.
- `context/` : `AuthContext` (session + profil Firestore + creation auto du doc user), `CartContext` (panier, creation d'ordre).
- `features/` :
  - `auth/` : ecran de login (onglets lien magique / mot de passe).
  - `catalog/`, `cart/`, `order/` (Pass, paiement, QR), `loyalty/` (boutique + roulette), `profile/` (points, leaderboard, notifications, change password), `layout/` (shell + nav), `admin/` (dashboard, onglets commandes/historique/stock/stats, scanner QR).
- `data/seedProducts.js` : produits par defaut pour le seed admin.
- `lib/` : helpers device/format/token.
- `ui/` : Button, Modal, NavBtn, Toast, Skeleton.
- `config/` : Firebase, constantes (email admin, regex UHA).

## Modele de donnees Firestore (voir `firestore.rules`)
- `users/{uid}` : email, displayName, role (`admin`/`user`), points, balance_cents, setup_complete (true apres creation du mot de passe), points_history, created_at. Un user ne peut pas modifier points/role/balance; admin full access.
- `products/{id}` : nom, prix (cents), is_available. Lecture publique, ecriture admin.
- `orders/{id}` : user_id, items, total_cents, status (`created`/`paid`/`cash`), qr_token, timestamps, payment_method, points_earned. Lecture owner/admin, creation owner, update admin.

## Parcours d'authentification
1) `/login` : envoi d'un lien magique (`sendSignInLinkToEmail`). Si `auth/quota-exceeded` survient, attendre le reset quotidien ou augmenter le quota.
2) Clic sur le lien => sign-in, redirection automatique vers `/setup` si `setup_complete` est false.
3) `/setup` : creation du mot de passe via `linkWithCredential` (ajout du provider password). Si `requires-recent-login`, recliquer un lien magique recent.
4) Admin : defini par `ADMIN_EMAIL` (`src/config/constants.js`), redirige vers `/admin`.

## Prerequis
- Node.js 18+ et npm.
- Acces Firebase (projet `amical-rt` par defaut) + Firebase CLI pour deployer.

## Installation & demarrage
```bash
npm install
npm run dev   # http://localhost:5173
```
Lint / build / preview :
```bash
npm run lint
npm run build
npm run preview
```

## Variables d'environnement
Copier `.env` (deja present) ou creer `.env` :
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_RECAPTCHA_SITE_KEY=...    # si besoin recaptcha
VITE_FIREBASE_VAPID_KEY=...    # pour FCM web push
```
L'app charge actuellement la config dans `src/config/firebase.js`. Les cles Firebase web sont publiques; la securite repose sur les regles Firestore et les quotas.

## Commandes Firebase utiles
- Deploiement Hosting : `npm run build` puis `firebase deploy --only hosting` (voir `firebase.json` et `.firebaserc`).
- Regles Firestore : `firebase deploy --only firestore:rules`.
- Emulateurs (optionnel) : `firebase emulators:start` si config ajoutee.

## Notes PWA & mobile
- Service worker autoUpdate, manifest defini dans `vite.config.js`.
- Target ES2015 pour eviter les ecrans blancs sur certaines webviews iOS.
- Icones depuis `public/logo.png` (192/512).

## Astuces debug / limites
- `auth/quota-exceeded` a l'envoi du lien magique : quota Firebase depasse -> attendre ou augmenter le plan/quota; utiliser l'onglet "Mot de passe" si le compte en a un, ou creer un user manuel dans la console.
- `auth/requires-recent-login` a la creation du mot de passe : se reconnecter via lien magique puis refaire `/setup`.
- Seed produits : bouton reset dans l'onglet Stock (admin) supprime les produits et reinjecte `SEED_PRODUCTS`.
- Notifications : FCM peut etre indisponible sur certaines webviews; le code degrade silencieusement.

## Securite
- Regles Firestore : un user ne peut pas modifier ses points/role/solde; seules les creations d'ordres self-service sont autorisees.
- Les commandes ne sont modifiables que par l'admin.
- Les tokens QR sont generes cote client (`lib/token.js`) et consommes cote admin (TTL gere dans `useAdminOrders`).

Bonne contribution !
