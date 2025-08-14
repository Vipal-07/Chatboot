
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    username:{
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePic: {
        type: String,
        default: "https://i.pinimg.com/736x/4d/37/13/4d37132904667bb194a25dcfc398d8fa.jpg"
    },
    fcmToken: {
        type: String,
        default: ''
    },
    timestamps: {
        type: 'Boolean',
        default: true,
     } 
});


module.exports = mongoose.model("User", userSchema);
