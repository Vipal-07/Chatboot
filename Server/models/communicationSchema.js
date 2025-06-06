const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const communicationSchema = new Schema({
    sender : {
        type : mongoose.Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    receiver : {
        type : mongoose.Schema.ObjectId,
        required : true,
        ref : 'User'
    },
})


module.exports = mongoose.model("Communication", communicationSchema);