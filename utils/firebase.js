const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

// Only initialize if there are no existing apps
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = admin;