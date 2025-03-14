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

const addProducts = async (req,res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName : products.productName
        })

        if(!productExists){
            const images = []
            if(req.files && req.files.length > 0){
                for (let file of req.files){
                    const originalImagePath = file.path;
                    const resizedImagePath = path.join('public','uploads','product-images',`resized-${file.filename}`);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(`/uploads/product-images/resized-${file.filename}`);
                }
            }

            let categoryId = await Category.findOne({name : products.category})

            const newProduct = new Product({
                productName : products.productName,
                description : products.description,
                category : categoryId,
                regularPrice : products.regularPrice,
                salePrice : products.salePrice,
                createdAt : new Date(),
                quantiry : products.quantity,
                productImage : images,
                status : 'Available'
            })
            await newProduct.save();
            return res.redirect('/admin/addProducts')
        }else{
            return res.status(400).json('Product alreary exists, please try another name')
        }
    } catch (error) {
        console.error('Error in saving products : ',error)
        return res.redirect('/admin/pageError')
    }
}


module.exports = {
    productInfo,
    loadAddProducts,
    addProducts
}