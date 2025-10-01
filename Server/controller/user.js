const User = require("../models/userSchema.js");
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const { signupValidation, loginValidation } = require('./validation.js');
const twilio = require('twilio');

module.exports.signUpFunction = async (req, res) => {

    try {
        const { name, username, password, profilePic } = req.body

        const { error } = signupValidation(req.body)
        if (error) {
            return res.status(400).json({
                message: error.details[0].message,
                error: true
            })
        }

        const exitingUser = await User.findOne({ username }) //{ name,email}  // null

        if (exitingUser) {
            return res.status(400).json({
                message: "Already user exits",
                error: true,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashpassword = await bcryptjs.hash(password, salt)

        const payload = {
            name: name,
            username: username,
            password: hashpassword,
            profilePic: profilePic,
        }

        const user = new User(payload)
        const userSave = await user.save()

        return res.status(201).json({
            message: "User created successfully",
            data: userSave,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })
    }
}


module.exports.logoutFunction = async (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        // Use SameSite=None so the cookie is sent in cross-site requests (socket.io handshake)
        // In production set secure=true; in dev secure=false to allow localhost HTTP
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'None',
            maxAge: 0
        }

        return res.cookie('token', '', cookieOptions).status(200).json({
            message: "Logged out successfully",
            success: true
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })
    }
}


module.exports.loginFunction = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required",
                error: true
            })
        }
        const { error } = loginValidation(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message, success: false });
        }

        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({
                message: "Invalid username or password",
                error: true
            })
        }

        const verifyPassword = await bcryptjs.compare(password, user.password)

        if (!verifyPassword) {
            return res.status(400).json({
                message: "Please check password",
                error: true
            })
        }

        const tokenData = {
            id: user._id,
            username: user.username
        }
        // Issue JWT with 7d expiry; we'll re-issue on each activity (/me) to implement sliding window
        const token = await jwt.sign(tokenData, process.env.TOKEN_SCRETE, { expiresIn: '7d' })

        const isProd = process.env.NODE_ENV === 'production';
        // Use SameSite=None so the cookie is available to cross-origin socket handshakes in dev
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }

        // expires: Date.now() + 3600000 * 24 * 7,
        // seccure: false,

        const safeUser = await User.findById(user._id).select('-password');
        return res.cookie('token', token, cookieOptions).status(200).json({
            message: "Login successfully",
            success: true,
            user: safeUser,
            token // also return token so client can use it for socket auth
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })
    }
}

// NOTE: /me endpoint is no longer routed from the server. Keeping this function for reference.
// Return current user & refresh sliding session (reset cookie maxAge + new exp)
module.exports.meFunction = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated', success: false });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.TOKEN_SCRETE);
        } catch (err) {
            return res.status(401).json({ message: 'Session expired', success: false });
        }
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found', success: false });

        // Re-issue a fresh token to slide the 7 day window
        const newToken = await jwt.sign({ id: user._id, username: user.username }, process.env.TOKEN_SCRETE, { expiresIn: '7d' });
        const isProd = process.env.NODE_ENV === 'production';
        // Re-issue cookie with SameSite=None to allow socket handshakes to include it across origins
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };
        res.cookie('token', newToken, cookieOptions);
        return res.json({ success: true, data: user });
    } catch (err) {
        return res.status(500).json({ message: err.message || err, success: false });
    }
}

module.exports.getUser = async (req, res) => {
    try {
        const { username } = req.body
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true
            })
        }

        return res.status(201).json({
            message: "User exists",
            data: user,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true
        })

    }
}


const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

module.exports.credential = async (req, res) => {
    try {
        const token = await client.tokens.create();
        const iceServers = (token.iceServers || []).map(s => ({
            urls: s.urls || s.url,
            username: s.username,
            credential: s.credential
        }));
        return res.json({ iceServers });
    } catch (err) {
        console.error("Error fetching ICE servers:", err);
        res.status(500).json({ error: "Failed to get ICE servers" });
    }
};
