var debug = require('debug')('superteamawesome:server'),
    Q = require('q'),
    models = require('../models');

module.exports = {
  rounds: function(req, res) {
    // replace with firebase

    // models.Round.findAll({
    //   include: [{
    //     model: models.Puzzle,
    //     as: 'Puzzles'
    //   }],
    //   where: {
    //     huntID: req.query.huntID
    //   }
    // }).then(function(rounds) {
    //   res.send(rounds);
    // })
  }
};