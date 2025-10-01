const User = require("./models/userSchema.js");
const jwt = require('jsonwebtoken')
const wrapAsync = require('./wrapAsync.js');

// tokengenerator


module.exports.UserDetailsByToken = async (token) => {
    if (!token) {
        return null;
    }
    try {
        let t = String(token).trim();
        if (t.toLowerCase().startsWith('bearer ')) {
            t = t.slice(7).trim();
        }
        if (!t) return null;
        const decode = await jwt.verify(t, process.env.TOKEN_SCRETE);
        const user = await User.findById(decode.id).select('-password');
        return user || null;
    } catch (error) {
        console.error("Error verifying token:", error && error.message ? error.message : error);
        return null; // invalid/malformed/expired
    }
}







