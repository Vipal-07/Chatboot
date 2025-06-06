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
const cookiesParser = require('cookie-parser')
const ConversationModel = require('./models/communicationSchema.js');
const httpServer = createServer(app);
const { UserDetailsByToken } = require('./middleWare.js');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookiesParser())


app.use(cors({
    origin: 'https://chat-boot-9yl6.onrender.com', 
    credentials: true,
}));

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
        origin: 'https://chat-boot-9yl6.onrender.com',
        credentials: true,
    }
});
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);


    const token = socket.handshake.auth.token

    const currentUser = await UserDetailsByToken(token)
    socket.join(currentUser?._id.toString());



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
                profile_pic: user.profile_pic,
            });
        }
    });

    socket.on('check-user-online', (userId) => {
        const isOnline = onlineUsers.has(userId?.toString());
        socket.emit('user-online-status', { userId, isOnline });
    });

    socket.on('send-massage', async (data) => {
        let conversation = await ConversationModel.findOne({
            "$or": [
                { sender: data?.sender, receiver: data?.receiver },
                { sender: data?.receiver, receiver: data?.sender }
            ]
        })

        if (!conversation) {
            const createConversation = await ConversationModel({
                sender: data?.sender,
                receiver: data?.receiver
            })
            conversation = await createConversation.save()
        }

        const { sender, receiver, text } = data;

        if (sender && receiver && text) {
            io.to(receiver).emit('receive-massage', data);
            io.to(sender).emit('receive-massage', data);
        } 

    })

    socket.on('disconnect', () => {
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


app.get('/', (req, res) => {
    res.send('Hello World! 123');
})

httpServer.listen(5000, () => {
    console.log('Server is running on port 5000');
})
