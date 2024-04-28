const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../db');
var flash = require('connect-flash');
require('dotenv').config();
// Salt and pepper constants
const saltRounds = 10;
const pepper = process.env.PEPPER

// Middleware
router.use(bodyParser.urlencoded({ extended: true }));

router.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 } // Session timeout after 1 hour
}));

router.use(passport.initialize());
router.use(passport.session());
router.use(flash());

// MySQL Connection




// User model
function findUser(username, callback) {
    db.query('SELECT * FROM users WHERE displayName = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            callback(null, results[0]);
        } else {
            callback(null, null);
        }
    });
}

// Hashing Passwords with Salt and Pepper
function hashPassword(password) {
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(password + pepper, salt);
    return hash;
}

// Verify Passwords
function verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password + pepper, hashedPassword);
}

// Passport Local Strategy
passport.use(new LocalStrategy(
    function(username, password, done) {
        findUser(username, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false, { message: 'Incorrect username.' }); }
            if (!verifyPassword(password, user.password)) { return done(null, false, { message: 'Incorrect password.' }); }
            return done(null, user);
        });
    }
));

// Serialize and Deserialize User
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(Id, done) {
    db.query('SELECT * FROM users WHERE id = ?', [Id], function(err, results) {
        if (err) { return done(err); }
        done(null, results[0]);
        
    });
});

// Register Route
router.post('/register', function(req, res, next) {
    const username = req.body.username;
    const password = req.body.password;
    const fullName = req.body.fullname;
    const email = req.body.email;
    const hashedPassword = hashPassword(password);

    db.query('INSERT INTO users (displayName, password, email, adminr, realname) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, email, 0, fullName], function(err, results) {
        if (err) {
            return next(err); // Pass any errors to the error handling middleware
        }

        // After registration, log in the user
        passport.authenticate('local')(req, res, function () {
            res.redirect('/'); // Redirect after successful login
        });
    });
});

// Login Route
router.post('/login', passport.authenticate('local', {
    successRedirect: '/roll',
    failureRedirect: '/login',
    failureFlash: true
}));

// Logout Route
router.get('/logout', function(req, res) {
    req.logout(function(err) {
        if (err) {
            // Handle error
            console.error(err);
            return res.redirect('/'); // Redirect to homepage or login page
        }
        // Perform additional operations after logout if needed
        // For example, you can clear session data or perform other cleanup tasks
        
        // Redirect to the homepage or another appropriate page
        res.redirect('/');
    });
});



router.get('/register', function(req, res) {
  res.render('register', { user: req.user});
});

router.get('/login', function(req, res) {
  res.render('login', { user: req.user});
});

// Middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

module.exports = router;