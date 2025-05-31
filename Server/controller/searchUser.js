const UserModel = require("../models/userSchema.js");
async function searchUser(req,res){
    try {
        const { id } = req.body

        // const query = new RegExp(search,"i","g")

        const user = await UserModel.findById({
            _id : id
        }).select("-password")

        return response.json({
            message : 'all user',
            data : user,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true
        })
    }
}

module.exports = searchUser