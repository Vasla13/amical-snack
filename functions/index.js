const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler"); // Nécessaire pour le leaderboard
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

// Configuration globale pour la v2
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

// --- CONSTANTES ---
const ROULETTE_COST = 10;

/**
 * Utilitaire : Choix pondéré sécurisé pour la roulette
 */
function getRandomWeightedItem(products, badLuckCount = 0) {
  const boostFactor = badLuckCount > 5 ? 3 : 1;

  const weights = products.map((p) => {
    let w = p.probability || 1;
    if (boostFactor > 1 && w < 0.1) w *= boostFactor;
    return w;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < products.length; i++) {
    random -= weights[i];
    if (random <= 0) return products[i];
  }
  return products[products.length - 1];
}

/**
 * Utilitaire : Calcul des points à vie (pour le leaderboard)
 */
function calculateLifetimePoints(userData) {
  const history = userData.points_history || {};
  const sum = Object.values(history).reduce((acc, val) => acc + (val || 0), 0);
  return sum > 0 ? sum : userData.points || 0;
}

// ---------------------------------------------------------
// 🎰 FONCTION 1 : JOUER À LA ROULETTE (v2)
// ---------------------------------------------------------
exports.playRoulette = onCall(async (request) => {
  // Vérification authentification
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez être connecté.");
  }
  const uid = request.auth.uid;

  return db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Utilisateur introuvable.");
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < ROULETTE_COST) {
      throw new HttpsError("failed-precondition", "Points insuffisants.");
    }

    // Récupération du stock disponible
    const productsSnap = await db
      .collection("products")
      .where("is_available", "==", true)
      .where("category", "in", ["Snacks", "Boissons"])
      .get();

    if (productsSnap.empty) {
      throw new HttpsError("unavailable", "Stock vide.");
    }

    const products = productsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Logique du jeu (Côté serveur pour éviter la triche)
    const winnerItem = getRandomWeightedItem(
      products,
      userData.bad_luck_count || 0
    );
    const isBigWin = (winnerItem.price_cents || 0) > 150;

    // Mises à jour atomiques
    transaction.update(userRef, {
      points: currentPoints - ROULETTE_COST,
      bad_luck_count: isBigWin ? 0 : admin.firestore.FieldValue.increment(1),
    });

    const newOrderRef = db.collection("orders").doc();
    const token = Math.random().toString(36).substring(2, 6).toUpperCase();

    transaction.set(newOrderRef, {
      user_id: uid,
      items: [
        {
          ...winnerItem,
          qty: 1,
          price_cents: 0,
          source: "Roulette",
        },
      ],
      total_cents: 0,
      status: "reward_pending",
      payment_method: "roulette",
      qr_token: token,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Historique transaction
    const historyRef = userRef.collection("transactions").doc();
    transaction.set(historyRef, {
      type: "spend",
      amount: -ROULETTE_COST,
      reason: "Roulette",
      date: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      winner: winnerItem,
      remainingPoints: currentPoints - ROULETTE_COST,
    };
  });
});

// ---------------------------------------------------------
// 🛍️ FONCTION 2 : ACHAT BOUTIQUE (v2)
// ---------------------------------------------------------
exports.buyShopItem = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Non connecté");
  }

  const { productId } = request.data;
  const uid = request.auth.uid;

  return db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const productRef = db.collection("products").doc(productId);

    const [userDoc, productDoc] = await Promise.all([
      transaction.get(userRef),
      transaction.get(productRef),
    ]);

    if (!productDoc.exists || !productDoc.data().is_available) {
      throw new HttpsError("unavailable", "Produit indisponible.");
    }

    const product = productDoc.data();
    // Coût fixe pour l'instant (à adapter si besoin)
    const isRedBull = (product.name || "").toLowerCase().includes("red bull");
    const cost = isRedBull ? 15 : 15;

    const currentPoints = userDoc.data().points || 0;

    if (currentPoints < cost) {
      throw new HttpsError("failed-precondition", "Points insuffisants.");
    }

    transaction.update(userRef, { points: currentPoints - cost });

    const newOrderRef = db.collection("orders").doc();
    const token = Math.random().toString(36).substring(2, 6).toUpperCase();

    transaction.set(newOrderRef, {
      user_id: uid,
      items: [{ ...product, id: productId, qty: 1, price_cents: 0 }],
      total_cents: 0,
      status: "reward_pending",
      payment_method: "loyalty",
      source: "Boutique",
      qr_token: token,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const historyRef = userRef.collection("transactions").doc();
    transaction.set(historyRef, {
      type: "spend",
      amount: -cost,
      reason: `Boutique: ${product.name}`,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});

// ---------------------------------------------------------
// 🏆 FONCTION 3 : CALCUL DU LEADERBOARD (Toutes les heures)
// ---------------------------------------------------------
// Cette fonction résout le problème de sécurité et de performance :
// Elle génère un fichier JSON statique dans Firestore que le client peut lire
// sans avoir accès à la liste complète des utilisateurs.
exports.updateLeaderboard = onSchedule("every 60 minutes", async (event) => {
  console.log("Début de la mise à jour du leaderboard...");

  // 1. Récupérer tous les utilisateurs (Opération lourde faite 1 seule fois par heure côté serveur)
  const usersSnap = await db.collection("users").get();

  const currentMonthKey = new Date().toISOString().slice(0, 7); // Ex: "2023-10"

  let globalLeaderboard = [];
  let monthlyLeaderboard = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    // On ignore les admins et ceux sans nom public
    if (data.role === "admin" || !data.displayName) return;

    // Score Global
    const totalPoints = calculateLifetimePoints(data);
    if (totalPoints > 0) {
      globalLeaderboard.push({
        id: doc.id,
        name: data.displayName,
        score: totalPoints,
        // On ne stocke PAS l'email ou d'autres données sensibles
      });
    }

    // Score Mensuel
    const monthlyPoints = data.points_history?.[currentMonthKey] || 0;
    if (monthlyPoints > 0) {
      monthlyLeaderboard.push({
        id: doc.id,
        name: data.displayName,
        score: monthlyPoints,
      });
    }
  });

  // Tri décroissant
  globalLeaderboard.sort((a, b) => b.score - a.score);
  monthlyLeaderboard.sort((a, b) => b.score - a.score);

  // On ne garde que le top 50 pour optimiser la lecture client
  const top50Global = globalLeaderboard.slice(0, 50);
  const top50Monthly = monthlyLeaderboard.slice(0, 50);

  // 2. Écrire le résultat dans un document unique 'stats/leaderboard'
  // Le client n'aura qu'à lire ce seul document.
  await db.collection("stats").doc("leaderboard").set({
    global: top50Global,
    monthly: top50Monthly,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    `Leaderboard mis à jour : ${top50Global.length} global, ${top50Monthly.length} mensuel.`
  );
});
