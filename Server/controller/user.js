module.exports.signUpFunction = async (req, res, next) => {
    try { 
        let { firstname, lastname, username, password } = req.body
        const newUser = new User({ firstname, lastname, username })
        let exitingUser = await User.findOne({
           username : username
        })
        if(exitingUser){
            res.redirect("/signup")
            return  // if email exists, return to login page and stop here
        }
        const registerUser = await User.register(newUser, password) 
        req.login(registerUser, (err) => {
            if (err) {
                return next(err)
            }
           
        })
    }
    catch (e) {
        req.flash("error", e.message)
        res.redirect("/signup")
    }
}

module.exports.profile = async(req, res) => {
    // console.log(req.user.id)
    let profileId = req.user.id
    let user = await User.findById(profileId)
}

module.exports.postLoginPage = async (req, res) => {
    req.flash("success", "You have been logged in successfully")
    let redirectUrl = res.locals.redirectUrl || "/listings"
    res.redirect(redirectUrl)
}

module.exports.logoutFunction = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err)
        }
        res.redirect("/listings")
    })
}

