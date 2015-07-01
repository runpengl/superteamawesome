"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    googleID: DataTypes.STRING,
    username: DataTypes.STRING,
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    picture: DataTypes.STRING
  });
  return User;
};