'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Hunts',
      'parentFolderID',
      Sequelize.TEXT
    );
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn(
      'Hunts',
      'parentFolderID'
    );
  }
};
