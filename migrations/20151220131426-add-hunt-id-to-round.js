'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Rounds',
      'huntID',
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
      'huntID'
    );
  }
};
