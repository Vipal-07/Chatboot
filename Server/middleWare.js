const User = require("./models/userSchema.js");
const jwt = require('jsonwebtoken')

// tokengenerator

module.exports.tokengenrator = async (req, res) => {
    const {  username, password } = req.body;
    if ( !username || !password) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const user = await User.findOne(username);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const cookiesOption = {
            httpOnly: true,
            secure: true
        }
        const tokenReqData = {
            // userId: user._id,
            username: user.username,
        }
        const token = await jwt.sign(tokenReqData, "qwertyuiop", { expiresIn: '1d' })
        return res.cookie('token', token, cookiesOption).status(200).json({
            message: "Login successfully",
            token: token,
            success: true
        })
    }
    catch (e) {
    res.status(500).json({ message: "Internal server error" });
    }
}
// 

module.exports.getUserByToken = async(req, res)=>{

    const token = request.cookies.token || ""

    if(!token){
        return {
            message : "session out",
            logout : true,
        }
    }

    const decode = await jwt.verify(token, "qwertyuio")

    const user = await User.findById(decode.id).select('-password')

    return user

    // res.status(200).json({
    //     message: "User found",
    //     user: user,
    //     success: true
    // }) 
}