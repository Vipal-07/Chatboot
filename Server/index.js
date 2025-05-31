const express = require('express');
const app = express();
const mongoose = require("mongoose");
const LocalStrategy = require("passport-local")
const passport = require('passport')
const session = require('express-session')
const MONGO_URL = `mongodb+srv://vm6431135:9si8G1t93I8oSpdb@chatboot.is1bign.mongodb.net/?retryWrites=true&w=majority&appName=Chatboot`
const usersController = require('./controller/user.js')
const MongoStore = require('connect-mongo');
const User = require("./models/userSchema.js");
const Communication = require("./models/communicationSchema.js");
const { createServer } = require("http");
const httpServer = createServer(app);
const cors = require('cors');
const cookieParser = require('cookie-parser')
const { tokengenrator } = require('./middleWare.js');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// const store = MongoStore.create({
//     mongoUrl: MONGO_URL,
//     crypto: {
//         secret: "asvgfhtyuj",
//     },
//     touchAfter: 24 * 60 * 60,
// });

// app.use(session({
//     store,
//     secret: "asvgfhtyuj",
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//         expires: Date.now() + 3600000 * 24 * 7, // 1 week
//         maxAge: 3600000 * 24 * 7, // 1 week
//         httpOnly: true,
//         secure: false
//     }
// }))

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}
)
);

app.use(cookieParser())



// app.use(passport.initialize())
// app.use(passport.session())
// passport.use(new LocalStrategy(User.authenticate()))

// passport.serializeUser(User.serializeUser());

// passport.deserializeUser(User.deserializeUser());

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

// socket.io setup

// const io = socketIO(httpServer, {
//   cors: {
//     origin: '*', // Allow all origins (adjust in production)
//     methods: ['GET', 'POST'],
//     credentials: true,
//   }
// });

// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);
//   socket.emit('message', 'Welcome to the chat!');
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
//   socket.on('sendMessage', (message) => {
//     console.log('Message received:', message);
//     io.emit('message', message); // Broadcast the message to all connected clients
//   });
//   socket.on('idMatching', async (givenId) => {
//     let user = await User.findById(givenId)
//     if (!user) {
//       socket.emit('userNotFound', { message: "User not found" });
//     } else {
//       socket.emit('userFound', { message: "User found", user });
//     }
// })
// })

// 

app.route("/signup")
    .post(usersController.signUpFunction)


app.route("/login")
    .post(usersController.loginFunction)
// Use the tokengenrator middleware after successful authenticati


app.route("/logout")
    .post(usersController.logoutFunction)

app.route("/card")
    .post(usersController.getUser)

// app.route("/testing")
//     .get( usersController.getUserByToken)
app.get('/', (req, res) => {
    res.send('Hello World! 123');
})
// app.get('/profile', usersController.profile)

httpServer.listen(5000, () => {
    console.log('Server is running on port 5000');
})