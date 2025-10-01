const express = require('express');
const app = express();
require('dotenv').config()
const mongoose = require("mongoose");
const MONGO_URL = process.env.MONGO_URL;
const usersController = require('./controller/user.js')
const User = require("./models/userSchema.js");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require('cors');
const redis = require('redis');
const cookiesParser = require('cookie-parser')
const wrapSocketAsync = require('./wrapSocketAsync.js');
const httpServer = createServer(app);
const { UserDetailsByToken } = require('./middleWare.js');
const wrapAsync = require('./wrapAsync.js');
const frontendUrl = process.env.FRONTEND_URL;
// const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin removed (notifications not in use)

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookiesParser())

app.use(cors({
    origin: frontendUrl,
    credentials: true,
}));

const redisUrl = process.env.REDIS_URL;
const redisClient = redis.createClient({ url: redisUrl });

redisClient.connect().then(() => {
    console.log('Connected to Redis');
}).catch(console.error);

const onlineUsers = new Map();
// Push notification throttle removed (notifications disabled)

async function main() {
    await mongoose.connect(MONGO_URL);
}
main()
    .then(() => {
        console.log("ok");
    })
    .catch((err) => {
        console.log(err);
    })


const io = new Server(httpServer, {
    cors: {
        origin: frontendUrl,
        credentials: true,
    }
});
io.on('connection', wrapSocketAsync(async (socket) => {
    // Support token from handshake auth or cookie (sliding session cookie)
    let token = socket.handshake?.auth?.token;
    if (!token) {
        const cookieHeader = socket.handshake?.headers?.cookie || '';
        if (cookieHeader) {
            const parts = cookieHeader.split(';').map(p => p.trim());
            for (const p of parts) {
                if (p.startsWith('token=')) {
                    token = decodeURIComponent(p.substring(6));
                    break;
                }
            }
        }
    }

    // update code
    if (!token) {
        console.error('Token is missing');
        socket.disconnect(); // Disconnect the socket if token is missing
        return;
    }

    const currentUser = await UserDetailsByToken(token)

    // updated code
    if (!currentUser || !currentUser._id) {
        console.error('Invalid token or user not found');
        socket.disconnect(); // Disconnect the socket if token is invalid
        return;
    }
    socket.join(currentUser?._id.toString());

    // Handle WebRTC signaling
    socket.on('call-user', ({ receiverId, offer }) => {
        io.to(receiverId).emit('incoming-call', {
            senderId: currentUser._id,
            offer,
        });
    });
    socket.on('answer-call', ({ senderId, answer }) => {
        io.to(senderId).emit('call-answered', { answer });
    });
    // Relay-only upgrade (fallback when direct path fails)
    socket.on('relay-upgrade-offer', ({ receiverId, offer }) => {
        io.to(receiverId).emit('relay-upgrade-offer', { senderId: currentUser._id, offer });
    });
    socket.on('relay-upgrade-answer', ({ senderId, answer }) => {
        io.to(senderId).emit('relay-upgrade-answer', { answer });
    });
    socket.on('reject-call', ({ senderId }) => {
        io.to(senderId).emit('call-rejected');
    });

    socket.on('ice-candidate', ({ receiverId, candidate }) => {
        io.to(receiverId).emit('ice-candidate', { candidate });
    });

    // Add this inside your io.on('connection', ...) block
    socket.on('end-call', ({ receiverId }) => {
        io.to(receiverId).emit('call-ended', { by: socket.userId || currentUser._id });
        socket.emit('call-ended', { by: socket.userId || currentUser._id }); // local echo safeguard
    });
    // end
    onlineUsers.set(currentUser._id.toString(), true);
    io.emit('user-online-status', { userId: currentUser._id, isOnline: true });

    socket.emit('currentUser-details', currentUser);

    socket.on('get-user-details', async (userId) => {
        try {
            console.log('[Socket] get-user-details request', { requester: currentUser._id.toString(), userId });
            if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
                console.warn('[Socket] invalid userId format', userId);
                return;
            }
            const user = await User.findById(userId).select('_id name username profilePic');
            if (user) {
                socket.emit('receiver-user', {
                    _id: user._id,
                    name: user.name,
                    username: user.username,
                    profilePic: user.profilePic,
                });
            } else {
                console.warn('[Socket] user not found for id', userId);
            }
        } catch (e) {
            console.error('[Socket] error fetching user details', e.message);
        }
    });

    socket.on('check-user-online', (userId) => {
        const isOnline = onlineUsers.has(userId?.toString());
        socket.emit('user-online-status', { userId, isOnline });
    });
    const offlineMessagesKey = `offline_msgs:${currentUser._id}`;
    try {
        const messages = await redisClient.lRange(offlineMessagesKey, 0, -1);

        if (messages && messages.length > 0) {
            messages.forEach((msg) => {
                socket.emit('receive-massage', JSON.parse(msg));
            });
            await redisClient.del(`offline_msgs:${currentUser._id}`);
        }
    } catch (error) {
        console.error("Error processing offline messages:", error);
    }

    socket.on('send-massage', async (data) => {
        if (!data.sender || !data.receiver || (!data.text && !data.imageUrl)) {
            console.error("Invalid message data:", data);
            return;
        }
        const { sender, receiver, text, imageUrl, timestamp } = data;
        const minimal = { sender, receiver, text, imageUrl, timestamp };
        if (sender && receiver && (text || imageUrl)) {
            const receiverOnline = onlineUsers.has(receiver);
            if (receiverOnline) {
                io.to(receiver).emit('receive-massage', minimal);
                io.to(sender).emit("message-received", { sender, timestamp });
            } else {
                await redisClient.rPush(`offline_msgs:${receiver}`, JSON.stringify(minimal));
            }
            io.to(sender).emit("message-delivered", { receiver, timestamp });
        }
    })

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${currentUser?._id}`);
        if (currentUser && currentUser._id) {
            onlineUsers.delete(currentUser._id.toString());
            io.emit('user-online-status', { userId: currentUser._id, isOnline: false });
        }
    })

}));

app.route("/signup")
    .post(wrapAsync(usersController.signUpFunction))

app.route("/login")
    .post(wrapAsync(usersController.loginFunction))

app.route("/logout")
    .post(wrapAsync(usersController.logoutFunction))

app.route("/card")
    .post(wrapAsync(usersController.getUser))

app.route("/credential")
    .get(wrapAsync(usersController.credential))

// '/me' route removed; client relies on login response + local cache

// FCM registration endpoint removed (notifications disabled)

// Fallback REST endpoint to fetch a user's public details by id (used if socket event misses)
app.get('/user/:id', wrapAsync(async (req, res) => {
    const u = await User.findById(req.params.id).select('_id name username profilePic');
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: u });
}));


app.get('/', (req, res) => {
    res.send('Hello World! 123');
})

httpServer.listen(5000, () => {
    console.log('Server is running on port 5000');
})

// Centralized Express error handler (captures errors forwarded by wrapAsync)
app.use((err, req, res, next) => {
    console.error('Express error:', err && err.stack ? err.stack : err);
    const status = err && err.status ? err.status : 500;
    res.status(status).json({ success: false, message: err && err.message ? err.message : 'Internal Server Error' });
});
