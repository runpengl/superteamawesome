"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    googleID: DataTypes.TEXT,
    username: DataTypes.TEXT,
    firstName: DataTypes.TEXT,
    lastName: DataTypes.TEXT,
    picture: DataTypes.TEXT,
    accessToken: DataTypes.TEXT,
    refreshToken: DataTypes.TEXT
  }, {
    classMethods: {
      associate: function(models) {
        User.belongsToMany(models.Role, {through: "UserRole"});
      }
    }
  });
  return User;
};
