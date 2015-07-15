"use strict";

module.exports = function(sequelize, DataTypes) {
  var Role = sequelize.define("Role", {
    name: DataTypes.TEXT,
    permissions: {
      type: DataTypes.ENUM,
      values: ['user', 'admin']
    }
  });
  return Role;
};