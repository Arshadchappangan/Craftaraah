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
            const passwordMatch = bcrypt.compare(password, admin.password);
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
        let range = req.query.range;
        if(!range) range = 'year';

        const users = await User.find({});
        const products = await Product.find({});
        const categories = await Category.find({isDeleted:false})
        const orders = await Order.find({});

        let currentMatchStage = null;
        let pastMatchStage = null;
        let saleCount = null;

        if(range === 'week'){
            currentMatchStage = adminHelper.filterRange({type:'week',week: new Date()});
            pastMatchStage = adminHelper.filterRange({type:'week',week: new Date(new Date().setDate(new Date().getDate() - 6))
            });
            saleCount = await adminHelper.getCounts(currentMatchStage,pastMatchStage)
        }else if(range === 'month'){
            const now = new Date();
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);  
                    
            currentMatchStage = adminHelper.filterRange({ type: 'month', month: currentMonth });
            pastMatchStage = adminHelper.filterRange({ type: 'month', month: lastMonth });
                    
            saleCount = await adminHelper.getCounts(currentMatchStage, pastMatchStage);
        } else if(range === 'year'){
            currentMatchStage = adminHelper.filterRange({type:'year',year: new Date().getFullYear()});
            pastMatchStage = adminHelper.filterRange({type:'year',year:new Date().getFullYear() - 1});
            saleCount = await adminHelper.getCounts(currentMatchStage,pastMatchStage);
        }


        let chart = { label: [], sales: [], revenue: [] };

        if (saleCount && saleCount.currentProductCount) {
            chart.label = saleCount.currentProductCount.map(item => item.name);
            chart.sales = saleCount.currentProductCount.map(item => item.totalQuantitySold);
            chart.revenue = saleCount.currentProductCount.map(item => item.totalPrice);
        }
        

        if (!req.session.admin) {
            return res.redirect('/admin/login')
        }

        res.render('dashboard',{
            customers : users,
            products:products,
            categories:categories,
            orders:orders,
            saleCountProducts : saleCount.currentProductCount,
            saleCountCategories : saleCount.currentCategoryCount,
            chart
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