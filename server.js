var express = require('express');
var exphbs = require('express-handlebars');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var debug = require('debug')('superteamawesome:server');
var http = require('http');

var passport = require('passport');
var config = require('./config');
var StrategyGoogle = require('passport-google-oauth').OAuth2Strategy;
var session = require('express-session');
var Sequelize = require('sequelize');
var SequelizeStore = require('connect-session-sequelize')(session.Store);

var models = require("./models");
var auth = require("./auth");

// routes
var routes = require('./routes/routes');
var admin = require('./routes/admin');
var hunt = require('./routes/hunt');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(auth.serializeUser);
passport.deserializeUser(auth.deserializeUser);

passport.use(new StrategyGoogle({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback"
  }, auth.googleLogin));

// App setup

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({ defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());
app.use(session({
  cookie: {
    maxAge: 604800000
  },
  secret: 'poofytoo',
  saveUninitialized: false,
  resave: false,
  store: new SequelizeStore({
    db: models.sequelize
  })
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure Routes
app.get('/', routes.loggedIn, routes.index);

app.get('/login', routes.login);
app.get('/logout', routes.logout);

app.get('/auth/google', passport.authenticate('google', {
  scope: auth.googleScope
}));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  routes.loginCallback);

// Data routes
app.post('/data/folders', routes.loggedIn, routes.listFolders);

// Admin routes
app.post('/admin/create/hunt', routes.loggedIn, admin.createHunt);
app.post('/admin/create/round', routes.loggedIn, admin.createRound);

app.get('/admin', routes.loggedIn, admin.index);
app.get('/admin/create', routes.loggedIn, admin.create);
app.get('/admin/add', routes.loggedIn, admin.add);
app.get('/admin/announcement', routes.loggedIn, admin.announcement);
app.get('/admin/switch', routes.loggedIn, admin.switch);

// Admin edit routes
app.get('/admin/edit', routes.loggedIn, admin.edit);
app.get('/admin/edit/round', routes.loggedIn, admin.editRound);
app.get('/admin/edit/puzzle', routes.loggedIn, admin.editPuzzle);
app.get('/admin/edit/settings', routes.loggedIn, admin.editSettings);

// Hunt routes
app.get('/hunt/rounds', routes.loggedIn, hunt.rounds);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            stack: err.stack
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    var status = err.status || 500;
    res.status(status);
    res.render('error', {
        message: err.message,
        error: status,
        stack: ''
    });
});

/**
 * Get port from environment and store in Express.
 */

var port = parseInt(process.env.PORT, 10) || 8080;
app.set('port', port);

/**
 * Create HTTP server and setup database.
 */

var server = http.createServer(app);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error('Port ' + port + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('Port ' + port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  debug('Listening on port ' + server.address().port);
}

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

module.exports = app;
