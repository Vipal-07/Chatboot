// filepath: /home/vikas07/Public/Chatboot/Server/models/userSchema.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: 'string',
        // required: true,
    },
    username: {
        type: 'string',
        required: true,
        unique: true,
    },
    password: {
        type: 'string',
        required: true,
    },
    profile_pic: {
        type: 'string',
        default: ""
    },
    timestamps: {
        type: 'Boolean',
        default: true,
    }
});

// Exporting the User model based on the userSchema
module.exports = mongoose.model("User", userSchema);