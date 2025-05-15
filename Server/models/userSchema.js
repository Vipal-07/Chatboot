
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    firstname: {
        type: 'string',
        // required: true,
    },
    lastname: {
        type: 'string',
        // required: true,
    },
    username:{
        type: 'string',
        required: true,
        unique: true,
    }
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);