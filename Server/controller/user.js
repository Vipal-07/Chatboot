const User = require("../models/userSchema.js");
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')

module.exports.signUpFunction = async (req, res) => {

    try {
        const { name, username , password, profilePic } = req.body

        const exitingUser = await User.findOne({ username }) //{ name,email}  // null

        if(exitingUser){
            return res.status(400).json({
                message : "Already user exits",
                error : true,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashpassword = await bcryptjs.hash(password,salt)

        const payload = {
            name:name,
            username:username,
            password : hashpassword,
            profilePic: profilePic
        }

        const user = new User(payload)
        const userSave = await user.save()

        return res.status(201).json({
            message : "User created successfully",
            data : userSave,
            success : true
        })

    } catch (error) {
        return res.status(500).json({
            message : error.message || error,
            error : true
        })
    }
}






module.exports.logoutFunction = async (req,res)=>{
    try {
        const cookieOptions = {
            http : true,
            secure : true,
            sameSite : 'None'
        }

        return res.cookie('token','',cookieOptions).status(200).json({
            message : "session out",
            success : true
    })
    } catch (error) {
        return res.status(500).json({
            message : error.message || error,
            error : true
        })
    }
}


module.exports.loginFunction = async(req,res) =>{
    try {
        const { username, password } = req.body

        const user = await User.findOne({username})

        const verifyPassword = await bcryptjs.compare(password,user.password)

        if(!verifyPassword){
            return res.status(400).json({
                message : "Please check password",
                error : true
            })
        }

        const tokenData = {
            id : user._id,
            username : user.username 
        }
        const token = await jwt.sign(tokenData, process.env.TOKEN_SCRETE, { expiresIn : '1d'})

        const cookieOptions = {
            http : true,
            secure : true,
            sameSite : 'none'
        }

        return res.cookie('token',token,cookieOptions).status(200).json({
            message : "Login successfully",
            token : token,
            success :true
        })

    } catch (error) {
        return res.status(500).json({
            message : error.message || error,
            error : true
        })
    }
}

module.exports.getUser = async (req, res) => {
    try {
        const {username} = req.body
        const user = await User.findOne({ username })
        if(!user){
            return res.status(404).json({
                message : "User not found",
                error : true
            })
        }

        return res.status(201).json({
            message : "User exists",
            data : user,
            success : true
        })
        
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })
        
    }
}
