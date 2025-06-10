
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: 'string',
        // required: true,
    },
    username:{
        type: 'string',
        required: true,
        unique: true,
    },
    password: {
        type: 'string',
        required: true,
    },
    profilePic: {
        type: 'string',
        default: ""
    },
    timestamps: {
        type: 'Boolean',
        default: true,
     } 
});


module.exports = mongoose.model("User", userSchema);