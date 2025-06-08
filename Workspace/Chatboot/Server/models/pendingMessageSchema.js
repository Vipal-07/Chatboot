// filepath: /home/vikas07/Public/Chatboot/Server/models/pendingMessageSchema.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pendingMessageSchema = new Schema({
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
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("PendingMessage", pendingMessageSchema);