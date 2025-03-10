const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin')
    }
    res.render('adminLogin', { message: null })
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email });
        if (admin) {
            const passwordMatch = bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect('/admin')
            } else {
                return res.render('adminLogin', { message: "Invalid password" })
            }
        } else {
            return res.render('adminLogin', { message: "Admin not found" })
        }
    } catch (error) {
        console.error("Admin login error : ", error);
        return res.redirect('/pageError')
    }
}

const loadDashboard = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login')
        }
        res.render('dashboard')
    } catch (error) {
        res.redirect('/pageError')
    }
}

const pageError = async (req, res) => {
    res.render("adminError")
}

const logout = async (req, res) => {
    try {
        req.session.destroy(error => {
            if (error) {
                console.log("Error in Destroying admin session : ", error);
                return res.redirect('/pageError')
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("Unexpected error during logout : ",error)
        res.redirect('/pageError')
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}