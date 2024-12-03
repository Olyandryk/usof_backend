const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');

dotenv.config();

exports.cookieJwtAuth = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).send({ error: "Authentication required" });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        res.clearCookie("token");
        return res.status(403).send({ error: "Invalid or expired token" });
    }
};