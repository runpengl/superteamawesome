var google = require('googleapis');
var Q = require('q');
var _ = require('lodash');

module.exports = {

  // Google Drive functions
  createHunt: function(title, parentID) {
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
