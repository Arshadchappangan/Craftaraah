const User = require('../models/userSchema');

const userAuth = (req,res,next) => {
    if(req.session.user){
        User.findById(req.session.user)
        .then(data => {
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect('/login')
            }
        })
        .catch(error => {
            console.log("Error in User Authentication");
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect("/login")
    }
}


const adminAuth = (req,res,next) => {
    if(req.session.admin){
        User.findById(req.session.admin)
     .then(data => {
        if(data && data.isAdmin){
            next()
        }else{
            res.redirect("/admin/login")
        }
     })
     .catch(error => {
        console.log("Error in Admin Authentication");
        res.status(500).send("Internal server error")
     })
    }else{
        res.redirect('/admin/login')
    }
}

module.exports = {
    userAuth,
    adminAuth
}