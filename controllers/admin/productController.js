const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema')
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
 

const productInfo = (req,res) => {
    res.render('products')
}

const loadAddProducts = async (req,res) => {
    try {
        const category = await Category.find({isListed:true});
        res.render("addProduct",{category:category});
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}


module.exports = {
    productInfo,
    loadAddProducts
}