/**
 * Authentication middleware
 */

// Ensure user is logged in
function ensureLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Check if user is admin
function ensureAdmin(req, res, next) {
  if (req.session.user && req.session.user.email === 'rikkik102@gmail.com') {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

module.exports = {
  ensureLoggedIn,
  ensureAdmin
};