"use strict";

if (!global.hasOwnProperty('db')) {
  var fs        = require("fs");
  var path      = require("path");
  var Sequelize = require("sequelize");
  var env       = process.env.NODE_ENV || "development";
  var config    = require('../config').ENV;
  var sequelize = new Sequelize(config.database, config.username, config.password, config.config);
  global.db        = {};

  fs
    .readdirSync(__dirname)
    .filter(function(file) {
      return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function(file) {
      var model = sequelize.import(path.join(__dirname, file));
      global.db[model.name] = model;
    });

  Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
      global.db[modelName].associate(db);
    }
  });

  // Define Model relationships
  global.db["Hunt"].hasMany(db["Round"], {as: "Rounds", foreignKey: "huntID"});
  global.db["Round"].hasMany(db["Puzzle"], {as: "Puzzles", foreignKey: "roundID"});
  global.db["User"].belongsToMany(db["Role"], {through: "UserRole"});

  global.db.sequelize = sequelize;
  global.db.Sequelize = Sequelize;
}

module.exports = global.db;