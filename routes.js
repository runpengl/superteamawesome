var JSX = require('node-jsx').install(),
    React = require('react');

module.exports = {
  index: function(req, res) {
    res.render('home', {user: req.user});
  },
  login: function(req, res) {
    var random = Math.floor(Math.random() * 8);
    res.render('login', {random: random, layout: 'login_layout.handlebars'});
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  },
  admin: function(req, res) {
    res.render('admin', {user: req.user});
  }
}