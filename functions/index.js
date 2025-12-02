const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

// Configuration globale pour la v2
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

// --- CONSTANTES ---
const ROULETTE_COST = 10;

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
// 🎰 FONCTION 1 : JOUER À LA ROULETTE (v2)
// ---------------------------------------------------------
exports.playRoulette = onCall(async (request) => {
  // En v2, 'context' devient 'request'
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

    // Récupération du stock
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

    // Logique du jeu
    const winnerItem = getRandomWeightedItem(
      products,
      userData.bad_luck_count || 0
    );
    const isBigWin = (winnerItem.price_cents || 0) > 150;

    // Mises à jour
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

  // En v2, les données envoyées sont dans request.data
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
