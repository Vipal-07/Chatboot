// filepath: /home/vikas07/Public/Chatboot/Server/middleWare.js
const User = require("./models/userSchema.js");
const jwt = require('jsonwebtoken');

// Function to retrieve user details based on the provided token
module.exports.UserDetailsByToken = async (token) => {
    // Check if the token is provided
    if (!token) {
        return {
            message: "session out",
            logout: true,
        };
    }

    // Verify the token and decode the user ID
    const decode = await jwt.verify(token, process.env.TOKEN_SCRETE);

    // Find the user in the database using the decoded ID
    const user = await User.findById(decode.id);

    return user;
};