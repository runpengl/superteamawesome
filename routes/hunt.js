var debug = require('debug')('superteamawesome:server'),
    Q = require('q'),
    models = require('../models');

module.exports = {
  puzzles: function(req, res) {
    models.Round.findAll({
      include: [{
        model: models.Puzzle,
        as: 'Puzzles'
      }],
      where: {
        huntID: req.body.huntID
      }
    }).then(function(puzzles) {
      res.send(puzzles);
    })
  }
};