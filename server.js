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
var models = require("./models");
var routes = require('./routes');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new StrategyGoogle({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    models.User.findOrCreate(
      {
        where: {googleID: profile.id},
        defaults: {
          googleID: profile.id,
          lastName: profile.name.familyName,
          firstName: profile.name.givenName,
          picture: profile._json.picture
        }
      }
    ).spread(function(user, created) {
      return done(false, user.get({plain: true}));
    })
  }
));

function loggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        req.session.returnPath = req.route.path;
        res.redirect('/login');
    }
}

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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret: 'poofytoo', 
                 saveUninitialized: true,
                 resave: true}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', loggedIn, routes.index);
app.get('/admin', loggedIn, routes.admin);

app.get('/login', routes.login);
app.get('/logout', routes.logout);

app.get('/auth/google', passport.authenticate('google', {scope: 'https://www.googleapis.com/auth/plus.login'}));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    if (req.session.returnPath)
      res.redirect(req.session.returnPath);
    else
      res.redirect('/');
  });

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
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
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
 * Listen on provided port, on all network interfaces.
 */

// Database setup

models.sequelize.sync().then(function () {
  console.log('Models synced');
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
});

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


module.exports = app;
