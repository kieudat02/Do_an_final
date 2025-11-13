module.exports = (req, res, next) => {
    res.locals.currentPath = req.originalUrl;
    next();
};