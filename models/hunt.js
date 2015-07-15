"use strict";

module.exports = function(sequelize, DataTypes) {
  var Hunt = sequelize.define("Hunt", {
    name: DataTypes.TEXT,
    folderID: DataTypes.TEXT,
    createdBy: DataTypes.TEXT,
    isActive: DataTypes.BOOLEAN
  });
  return Hunt;
};