'use strict';

module.exports = function(sequelize, DataTypes) {
  var Hunt = sequelize.define('Hunt', {
    name: DataTypes.TEXT,
    folderID: DataTypes.TEXT,
    createdBy: DataTypes.TEXT,
    isActive: DataTypes.BOOLEAN,
    parentFolderID: DataTypes.TEXT
  }, {
    classMethods: {
      associate: function(models) {
        Hunt.hasMany(models.Round, {as: "Rounds", foreignKey: "huntID"})
      }
    }
  });
  return Hunt;
};
