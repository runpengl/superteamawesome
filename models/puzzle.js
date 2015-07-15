"use strict";

module.exports = function(sequelize, DataTypes) {
  var Puzzle = sequelize.define("Puzzle", {
    name: DataTypes.TEXT,
    sheetID: DataTypes.TEXT,
    slackID: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM,
      values: ['untouched', 'identification', 'groundwork', 'needsclosing', 'interaction', 'solved']
    },
    isSolved: DataTypes.BOOLEAN,
    isMeta: DataTypes.BOOLEAN,
    category: DataTypes.TEXT,
    answer: DataTypes.TEXT,
    isMetaMeta: DataTypes.BOOLEAN
  });
  return Puzzle;
};