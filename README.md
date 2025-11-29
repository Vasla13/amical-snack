# AMICALE R&T – Snack & Fidélité

Application React/Vite pour gérer les snacks de l’amicale : catalogue, panier/Pass, système de points avec “case opening”, et back-office admin. Le projet repose sur Firebase (Auth + Firestore) et Tailwind.

## Fonctionnalités principales
- Authentification par email (Firebase Auth) et gestion du profil.
- Catalogue et panier, passage en caisse (points gagnés en fonction du montant).
- Pass / commandes avec QR code (générés côté client).
- Fidélité : boutique de récompenses + “Case Opening” (roulette animée) débitant les points via transactions Firestore.
- Admin : suivi des commandes, historique, gestion du stock (toggle disponibilité), seed produits.

## Démarrage rapide
1) Prérequis : Node.js 18+ et npm.
2) Installer les dépendances : `npm install`
3) Lancer en dev : `npm run dev` (http://localhost:5173 par défaut)
4) Lancer un lint : `npm run lint`
5) Build production : `npm run build` (puis `npm run preview` pour tester le build)

## Configuration Firebase
Le projet charge la config depuis `src/config/firebase.js` (valeurs déjà présentes pour l’environnement déployé). Pour pointer vers un autre projet Firebase, remplace les champs `firebaseConfig` ou injecte tes propres variables et importe-les ici.

## Structure rapide
- `src/App.jsx` : routing, modales (confirm/toast), récupération des produits, protection des routes.
- `src/features/` :
  - `catalog`, `cart`, `order/PassScreen`, `profile` : parcours utilisateur.
  - `loyalty/` : `LoyaltyScreen`, `PointsShop`, `RouletteGame`.
  - `admin/` : `AdminDashboard` + onglets commandes/historique/stock.
- `src/context/AuthContext.jsx` : session utilisateur et données associées.
- `src/lib/token.js` : génération de tokens pour QR.
- `src/config/firebase.js` : initialisation Firebase.

## Scripts npm
- `npm run dev` : serveur de développement Vite.
- `npm run build` : build production.
- `npm run preview` : prévisualisation du build.
- `npm run lint` : eslint.

## Notes d’implémentation
- Les débits de points (boutique et case opening) sont réalisés via `runTransaction` Firestore pour éviter les doubles clics/conflits.
- Le “Case Opening” construit une bande d’items avec un index gagnant fixe pour caler l’animation CSS (keyframe `roulette-spin`).
- Les points sont normalisés (prise en charge des formats “29,50” ou numériques) avant écriture.

## Déploiement
- Build : `npm run build`
- L’application est conçue pour Firebase Hosting (voir `firebase.json` et `.firebaserc`).

## Support/maintenance
- Stack : React 19, Vite 6, Tailwind, Firebase v12, react-router 7, lucide-react.
- Vérifie les clés Firebase et les règles Firestore avant de mettre en prod.
