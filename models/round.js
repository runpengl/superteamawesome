"use strict";

module.exports = function(sequelize, DataTypes) {
  var Round = sequelize.define("Round", {
    name: DataTypes.TEXT,
    folderID: DataTypes.TEXT,
    solvedFolderID: DataTypes.TEXT
  });
  Round.hasOne(Round, {as: 'Parent', foreignKey: 'parentID'});
  return Round;
};