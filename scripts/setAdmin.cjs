// Script pour définir un Admin via Custom Claims
// Usage : node scripts/setAdmin.js ton.email@uha.fr

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // Ta clé privée

// Initialisation avec privilèges système
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Récupération de l'email depuis la ligne de commande
const args = process.argv.slice(2);
const email = args[0];

if (!email) {
  console.log("❌ Erreur : Veuillez fournir un email.");
  console.log("Usage: node scripts/setAdmin.js <email>");
  process.exit(1);
}

async function setAdminRole(userEmail) {
  try {
    // Trouver l'utilisateur par email
    const user = await admin.auth().getUserByEmail(userEmail);

    // Définir le "claim" admin (C'est ça la vraie sécurité)
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    // Mise à jour visuelle dans Firestore (pour le front-end)
    await admin.firestore().collection("users").doc(user.uid).set(
      {
        role: "admin",
      },
      { merge: true }
    );

    console.log(`✅ Succès ! ${userEmail} est maintenant administrateur.`);
    console.log(
      "ℹ️  L'utilisateur doit se déconnecter et se reconnecter pour voir les changements."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    process.exit(1);
  }
}

setAdminRole(email);
