'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Rounds',
      'parentID',
      {
        type: Sequelize.INTEGER,
        references: {
          model: 'Hunts',
          key: 'id'
        }
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn(
      'Rounds',
      'parentID'
    );
  }
};
