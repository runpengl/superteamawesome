var Firebase = require('firebase'),
    FirebaseTokenGenerator = require('firebase-token-generator'),
    config = require('../config');

// firebase setup
var firebaseRef = new Firebase("https://" + config.firebase.host + "/");
var tokenGenerator = new FirebaseTokenGenerator(config.firebase.secret);

firebaseRef.onAuth(function(authData) {
  if (authData) {
    console.info("Authentication renewed successfully");
    console.info("Auth expires at:", new Date(authData.expires * 1000));
  } else {
    console.info("auth expired! renewing...");
    var newToken = tokenGenerator.createToken({ uid: config.firebase.serverId });
    firebaseRef.authWithCustomToken(newToken, function(error, result) {
      if (error) {
        console.error("Firebase Authentication Failed!", error);
      }
    });
  }
});

module.exports = firebaseRef;