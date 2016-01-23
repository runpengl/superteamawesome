module.exports = {
  getFolderUrl: function(id) {
    return "https://drive.google.com/drive/folders/" + id;
  },

  getSheetUrl: function(id) {
    return "https://docs.google.com/spreadsheets/d/" + id;
  },
}