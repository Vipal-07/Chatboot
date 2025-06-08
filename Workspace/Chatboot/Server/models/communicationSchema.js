// filepath: /home/vikas07/Public/Chatboot/Server/models/communicationSchema.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const communicationSchema = new Schema({
    sender: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
    receiver: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
});

// This schema is used to store communication records between users.
// It includes fields for sender and receiver user IDs.

module.exports = mongoose.model("Communication", communicationSchema);