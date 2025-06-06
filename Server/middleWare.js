const User = require("./models/userSchema.js");
const jwt = require('jsonwebtoken')

// tokengenerator


module.exports.UserDetailsByToken = async (token) => {


    if (!token) {
        return {
            message: "session out",
            logout: true,
        }
    }

    const decode = await jwt.verify(token, process.env.TOKEN_SCRETE)

    const user = await User.findById(decode.id)

    return user
}





