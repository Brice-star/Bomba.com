// Middleware pour vérifier l'authentification admin
const checkAuth = (req, res, next) => {
    if (req.session && req.session.adminLoggedIn) {
        return next();
    }
    res.redirect('/admin/login');
};

module.exports = checkAuth;
