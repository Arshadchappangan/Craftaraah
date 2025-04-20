const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Order = require('../../models/orderSchema');
const category = require('../../models/categorySchema');
const adminHelper = require('../../helpers/adminHelpers')


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

                req.session.admin = admin._id
                
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
        const orders = await Order.find({});

        const matchStage = adminHelper.filterRange({type:'all'})
        const bestProducts = await adminHelper.saleCountProducts(matchStage);
        const bestCategories = await adminHelper.saleCountCategories(matchStage);


        if (!req.session.admin) {
            return res.redirect('/admin/login')
        }

        res.render('dashboard',{
            customers : users,
            products:products,
            categories:categories,
            orders:orders,
            saleCountProducts : bestProducts,
            saleCountCategories : bestCategories
        })
    } catch (error) {
        console.error(error)
        res.redirect('/pageError')
    }
}

const pageError = async (req, res) => {
    res.render("adminError")
}

const logout = async (req, res) => {
    try {
        delete req.session.admin
        console.log(req.session.admin)
        res.redirect("/admin/login")

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