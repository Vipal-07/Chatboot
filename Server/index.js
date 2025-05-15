const express = require('express');
const app = express();
const mongoose = require("mongoose");
const LocalStrategy = require("passport-local")
const passport = require('passport')
const MONGO_URL = process.env.MONGOS_URL
const usersController = require('./controller/user.js')
const User = require("./models/userSchema.js");





app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());



app.route("/signup")
    .post(usersController.signUpFunction)

app.route("/login")
    .post( savedRedirect, passport.authenticate('local',
        {
            failureRedirect: '/login',
            failureFlash: error
        }),usersController.postLoginPage
        )  
        
app.route("/logout")
    .get( usersController.logoutFunction)        

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(5000, () => {
    console.log('Server is running on port 5000');
})