'use strict';

module.exports = function(sequelize, DataTypes) {
  var Round = sequelize.define('Round', {
    name: DataTypes.TEXT,
    folderID: DataTypes.TEXT,
    solvedFolderID: DataTypes.TEXT
  }, {
    classMethods: {
      associate: function(models) {
        Round.hasOne(Round, {as: 'Parent', foreignKey: 'parentID'});
        Round.hasMany(models.Puzzle, {as: "Puzzles", foreignKey: "roundID"});
      }
    }
  });
  return Round;
};
