var google = require('googleapis');
var Q = require('q');


module.exports = {

  // Google Drive functions
  createHunt: function() {
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
        defer.resolve(response.items);
      }
    });
    return defer.promise;
  }
};
