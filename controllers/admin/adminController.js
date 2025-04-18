const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Order = require('../../models/orderSchema');
const category = require('../../models/categorySchema');


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

        const bestSellingProducts = await Order.aggregate([
            {$unwind:"$orderedItems"},
            {
                $group:{
                    _id:"$orderedItems.product",
                    totalQuantitySold : {$sum : "$orderedItems.quantity" } 
                }
            },
            {$sort:{totalQuantitySold:-1}},
            {$limit:10},
            {$lookup:{
                from : 'products',
                localField : '_id',
                foreignField : '_id',
                as : 'productDetails'
            }},
            {$unwind:"$productDetails"},
            {$lookup:{
                from : 'categories',
                localField : 'productDetails.category',
                foreignField : '_id',
                as : 'categoryDetails'
            }},
            {$unwind:"$categoryDetails"},
            {$project:{
                _id : 0,
                name : "$productDetails.productName",
                photo : { $arrayElemAt: ["$productDetails.productImage", 0] },
                totalQuantitySold : 1,
                category : "$categoryDetails.name"
            }},
        ])

        const bestSellingCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
          
            {
              $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "productDetails"
              }
            },
            { $unwind: "$productDetails" },
          
            {
              $group: {
                _id: "$productDetails.category",
                totalQuantitySold: { $sum: "$orderedItems.quantity" }
              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
          
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
              }
            },
            { $unwind: "$categoryDetails" },
          
            {
              $project: {
                _id: 0,
                category: "$categoryDetails.name",
                description:"$categoryDetails.description",
                totalQuantitySold: 1
              }
            }
          ])


        if (!req.session.admin) {
            return res.redirect('/admin/login')
        }
        res.render('dashboard',{
            customers : users,
            products:products,
            categories:categories,
            orders:orders,
            bestSellingProducts,
            bestSellingCategories
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