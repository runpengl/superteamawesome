var debug = require('debug')('superteamawesome:server'),
    Q = require('q'),
    firebaseRef = require('../api/firebase');;

module.exports = {
  rounds: function(req, res) {
    firebaseRef.child("hunts/" + req.query.huntId + "/rounds").once("value", function(snapshot) {
      var rounds = {};
      snapshot.forEach(function(childSnapshot) {
        // key will be "fred" the first time and "barney" the second time
        var key = childSnapshot.key();
        // childData will be the actual contents of the child
        var childData = childSnapshot.val();
        rounds[key] = childData;
      });
      res.send(rounds);
    });
  }
};