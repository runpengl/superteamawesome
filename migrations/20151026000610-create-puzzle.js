'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Puzzles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.TEXT
      },
      sheetID: {
        type: Sequelize.TEXT
      },
      slackID: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.ENUM,
        values: ['untouched', 'identification', 'groundwork', 'needsclosing', 'interaction', 'solved']
      },
      isSolved: {
        type: Sequelize.BOOLEAN
      },
      isMeta: {
        type: Sequelize.BOOLEAN
      },
      category: {
        type: Sequelize.TEXT
      },
      answer: {
        type: Sequelize.TEXT
      },
      isMetaMeta: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('Puzzles');
  }
};