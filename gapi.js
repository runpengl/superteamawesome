var google = require('googleapis');
var Q = require('q');
var _ = require('lodash');

var debug = require('debug')('superteamawesome:server');

module.exports = {

  // Google Drive functions
  copySheet: function(sheetLink, destinationFolder) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2'});
    var regex = /https:\/\/docs.google.com\/spreadsheets\/d\/(.+)\/.+/g;
    var fileId = regex.exec(sheetLink)[1];
    service.files.copy({
      fileId: fileId,
      resource: {
        "title": "Puzzle Template",
        "parents": [{ "id": destinationFolder }]
      }
    }, function(err, response) {
      if (err) {
        debug("The API returned an error when copying a file: " + err);
        defer.reject(err);
      } else {
        debug(response);
        defer.resolve(response);
      }
    });
    return defer.promise;
  },

  createFolder: function(title, parentID) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2'});
    service.files.insert({
      resource: {
        "title": title,
        "parents": [{ "id": parentID }],
        "mimeType": "application/vnd.google-apps.folder"
      }
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error:' + err);
        defer.reject(err);
      } else {
        defer.resolve(response);
      }
    });
    return defer.promise;
  },

  createSheet: function(title, parentID) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2'});
    service.files.insert({
      resource: {
        "title": title,
        "parents": [{ "id": parentID }],
        "mimeType": "application/vnd.google-apps.spreadsheet"
      }
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error:' + err);
        defer.reject(err);
      } else {
        defer.resolve(response);
      }
    });
    return defer.promise;
  },

  getFolder: function(folderID) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2'});
    service.files.get({
      fileId: folderID
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error:' + err);
        defer.reject(err);
      } else {
        defer.resolve(response);
      }
    });
    return defer.promise;
  },

  listFiles: function(folderID) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2'});
    service.files.list({
      q: '"' + folderID + '" in parents and mimeType = "application/vnd.google-apps.folder"'
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        defer.reject(err);
      } else {
        defer.resolve(_.filter(response.items, { labels: { trashed: false }}));
      }
    });
    return defer.promise;
  }
};
