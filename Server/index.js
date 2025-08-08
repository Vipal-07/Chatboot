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
const httpServer = createServer(app);
const { UserDetailsByToken } = require('./middleWare.js');

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
io.on('connection', async (socket) => {
    const token = socket.handshake.auth.token

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
    socket.on('reject-call', ({ senderId }) => {
        io.to(senderId).emit('call-rejected');
    });

    socket.on('ice-candidate', ({ receiverId, candidate }) => {
        io.to(receiverId).emit('ice-candidate', { candidate });
    });

    // Add this inside your io.on('connection', ...) block
    socket.on('end-call', ({ receiverId }) => {
        io.to(receiverId).emit('call-ended');
    });

    // end

    onlineUsers.set(currentUser._id.toString(), true);
    io.emit('user-online-status', { userId: currentUser._id, isOnline: true });

    socket.emit('currentUser-details', currentUser);

    socket.on('get-user-details', async (userId) => {
        const user = await User.findById(userId);
        if (user) {
            socket.emit('receiver-user', {
                _id: user._id,
                name: user.name,
                username: user.username,
                profilePic: user.profilePic,
            });
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
        // console.log(`Message sent from ${data.sender} to ${data.receiver}: ${data.text}`);
        if (!data.sender || !data.receiver || (!data.text && !data.imageUrl && !data.videoUrl)) {
            console.error("Invalid message data:", data);
            return;
        }
        const { sender, receiver, text, imageUrl, videoUrl, timestamp } = data;

        if (sender && receiver && (text || imageUrl || videoUrl)) {
            if (onlineUsers.has(receiver)) {
                io.to(receiver).emit('receive-massage', data);
                io.to(sender).emit("message-received", { sender, timestamp }); // Notify sender
            } else {
                await redisClient.rPush(`offline_msgs:${receiver}`, JSON.stringify({ sender, receiver, text, timestamp }));
            }
            // io.to(sender).emit('receive-massage', data);
            // Notify sender that the message was delivered (even if offline)
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

})

app.route("/signup")
    .post(usersController.signUpFunction)

app.route("/login")
    .post(usersController.loginFunction)

app.route("/logout")
    .post(usersController.logoutFunction)

app.route("/card")
    .post(usersController.getUser)

app.route("/credential")
    .get(usersController.credential)


app.get('/', (req, res) => {
    res.send('Hello World! 123');
})

httpServer.listen(5000, () => {
    console.log('Server is running on port 5000');
})
