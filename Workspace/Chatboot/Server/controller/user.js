// filepath: /home/vikas07/Public/Chatboot/Server/controller/user.js
const User = require("../models/userSchema.js");
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const PendingMessage = require('../models/pendingMessageSchema.js'); // Import the PendingMessage model

module.exports.signUpFunction = async (req, res) => {
    try {
        const { name, username, password } = req.body;

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
                error: true,
            });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        const payload = {
            name: name,
            username: username,
            password: hashedPassword
        };

        const user = new User(payload);
        const userSave = await user.save();

        return res.status(201).json({
            message: "User created successfully",
            data: userSave,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
};

module.exports.logoutFunction = async (req, res) => {
    try {
        const cookieOptions = {
            http: true,
            secure: true,
            sameSite: 'None'
        };

        return res.cookie('token', '', cookieOptions).status(200).json({
            message: "Session out",
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
};

module.exports.loginFunction = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({
                message: "User not found",
                error: true
            });
        }

        const verifyPassword = await bcryptjs.compare(password, user.password);

        if (!verifyPassword) {
            return res.status(400).json({
                message: "Please check your password",
                error: true
            });
        }

        const tokenData = {
            id: user._id,
            username: user.username
        };
        const token = await jwt.sign(tokenData, process.env.TOKEN_SCRETE, { expiresIn: '1d' });

        const cookieOptions = {
            http: true,
            secure: true,
            sameSite: 'none'
        };

        return res.cookie('token', token, cookieOptions).status(200).json({
            message: "Login successfully",
            token: token,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
};

module.exports.getUser = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true
            });
        }

        return res.status(201).json({
            message: "User exists",
            data: user,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
};