const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema')
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
            const passwordMatch = await bcrypt.compare(password, admin.password);
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
        const users = await User.find({});
        const products = await Product.find({});
        const categories = await Category.find({isDeleted:false})


        if (!req.session.admin) {
            return res.redirect('/admin/login')
        }
        res.render('dashboard',{
            customers : users,
            products:products,
            categories:categories
        })
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