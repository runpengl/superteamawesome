var JSX = require('node-jsx').install(),
    React = require('react');

module.exports = {
  index: function(req, res) {
    res.render('home', {});
  },
  login: function(req, res) {
    res.render('login', {});
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  }
}