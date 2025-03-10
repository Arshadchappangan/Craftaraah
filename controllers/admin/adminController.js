const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const loadLogin = (req,res) => {
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('adminLogin',{message:null})
}

const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        const admin = User.findOne({email,isAdmin:true});
        if(admin){
            console.log(admin)
            const passwordMatch = bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin = true;
                return res.redirect('/admin/dashboard')
            }else{
                return res.render('adminLogin',{message:"Invalid password"})
            }
        }else{
            return res.render('adminLogin',{message:"Admin not found"})
        }
    } catch (error) {
        console.error("Admin login error");
        return res.redirect('/pageError')
    }
}

const loadDashboard = async (req,res) => {
    try {
        if(req.session.admin){
            res.render('dashboard')
        }
    } catch (error) {
        res.redirect('/pageError')
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard
}