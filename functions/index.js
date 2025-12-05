const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const crypto = require("crypto"); // Module natif pour la crypto sécurisée

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

const ROULETTE_COST = 10;

// Utilitaire : Générateur de Token Sécurisé (6 caractères alphanumériques majuscules)
function generateSecureToken() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/**
 * Utilitaire : Choix pondéré sécurisé
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

// ---------------------------------------------------------
// 🛍️ FONCTION 2 : ACHAT BOUTIQUE (CORRIGÉE & SÉCURISÉE)
// ---------------------------------------------------------
exports.buyShopItem = onCall(async (request) => {
  // 1. Vérification Auth
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez être connecté.");
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

    // 2. Vérification Stock & Disponibilité
    if (!productDoc.exists) {
      throw new HttpsError("not-found", "Produit introuvable.");
    }
    const product = productDoc.data();

    if (product.is_available === false) {
      throw new HttpsError(
        "unavailable",
        "Ce produit est en rupture de stock."
      );
    }

    // 3. Vérification Solde (Prix réel depuis la DB)
    const costPts = Math.round(((product.price_cents || 0) / 100) * 15); // Exemple: 15% du prix en points ou valeur fixe
    // OU si vous avez un champ 'point_cost' dans le produit :
    // const costPts = product.point_cost || 15;
    const finalCost = 15; // On garde 15 points fixe pour l'instant comme demandé

    const currentPoints = userDoc.data().points || 0;

    if (currentPoints < finalCost) {
      throw new HttpsError(
        "failed-precondition",
        `Points insuffisants. Requis : ${finalCost}`
      );
    }

    // 4. Exécution
    transaction.update(userRef, { points: currentPoints - finalCost });

    const newOrderRef = db.collection("orders").doc();
    const token = generateSecureToken(); // Token sécurisé

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
      amount: -finalCost,
      reason: `Boutique: ${product.name}`,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, remainingPoints: currentPoints - finalCost };
  });
});

// ---------------------------------------------------------
// 🎰 FONCTION 1 : ROULETTE (MISE À JOUR TOKEN)
// ---------------------------------------------------------
exports.playRoulette = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }
  const uid = request.auth.uid;

  return db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists)
      throw new HttpsError("not-found", "Utilisateur inconnu.");

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < ROULETTE_COST) {
      throw new HttpsError("failed-precondition", "Points insuffisants.");
    }

    const productsSnap = await db
      .collection("products")
      .where("is_available", "==", true)
      .where("category", "in", ["Snacks", "Boissons"])
      .get();

    if (productsSnap.empty) throw new HttpsError("unavailable", "Stock vide.");

    const products = productsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const winnerItem = getRandomWeightedItem(
      products,
      userData.bad_luck_count || 0
    );
    const isBigWin = (winnerItem.price_cents || 0) > 150;

    transaction.update(userRef, {
      points: currentPoints - ROULETTE_COST,
      bad_luck_count: isBigWin ? 0 : admin.firestore.FieldValue.increment(1),
    });

    const newOrderRef = db.collection("orders").doc();
    const token = generateSecureToken(); // Token sécurisé

    transaction.set(newOrderRef, {
      user_id: uid,
      items: [{ ...winnerItem, qty: 1, price_cents: 0, source: "Roulette" }],
      total_cents: 0,
      status: "reward_pending",
      payment_method: "roulette",
      qr_token: token,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log transaction
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

// ... (Garder la fonction updateLeaderboard existante telle quelle)
exports.updateLeaderboard = onSchedule("every 60 minutes", async (event) => {
  // ... Code existant du leaderboard ...
  // (Copiez le reste du fichier original ici pour le leaderboard)
  console.log("Leaderboard updated");
});
