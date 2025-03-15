const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema')
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const productInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 5;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } }
            ]
        }).limit(limit * 1).skip((page - 1) * limit).populate('category').exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } }
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });

        if (category) {
            res.render('products', {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                category: category
            })
        } else {
            res.redirect('/pageError')
        }

    } catch (error) {
        res.redirect('/pageError')
    }

}

const loadAddProducts = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("addProduct", { category: category });
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName
        })

        if (!productExists) {
            const images = []
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No image uploaded!" });
            }

            if (req.files && req.files.length > 0) {
                for (let file of req.files) {
                    const originalImagePath = file.path;
                    const extension = path.extname(file.filename)
                    const timestamp = Date.now()
                    const resizedImagePath = path.join('public', 'uploads', 'product-images', `resized-${timestamp}${extension}`);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(`/uploads/product-images/resized-${timestamp}${extension}`);
                }
            }

            let categoryId = await Category.findOne({ name: products.category })

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                category: categoryId,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdAt: new Date(),
                quantity: products.quantity,
                productImage: images,
                status: 'Available'
            })
            await newProduct.save();
            return res.redirect('/admin/addProducts')
        } else {
            return res.status(400).json('Product alreary exists, please try another name')
        }
    } catch (error) {
        console.error('Error in saving products : ', error)
        return res.redirect('/admin/pageError')
    }
}

const loadEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        console.log(product)
        res.render('editProduct', {
            product: product,
            category: category
        })
    } catch (error) {
        res.redirect('pageError')
    }
}


const editProduct = async (req, res) => {
    try {
        const productId = req.body.id;
        const updatedData = req.body;

        let product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found!" });
        }

        let images = product.productImage; 
        if (req.files && req.files.length > 0) {
            images = []; 
            for (let file of req.files) {
                const originalImagePath = file.path;
                const extension = path.extname(file.filename);
                const timestamp = Date.now()
                const resizedImagePath = path.join('public', 'uploads', 'product-images', `resized-${timestamp}${extension}`);

                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(`/uploads/product-images/resized-${timestamp}${extension}`);
            }
        }


        await Product.findByIdAndUpdate(productId, {
            productName: updatedData.productName,
            description: updatedData.description,
            category: updatedData.category,
            regularPrice: updatedData.regularPrice,
            salePrice: updatedData.salePrice,
            quantity: updatedData.quantity,
            productImage: images,
            status: updatedData.status,
            updatedAt: new Date(),
        });

        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        res.redirect('/admin/pageError');
    }
};


module.exports = {
    productInfo,
    loadAddProducts,
    addProducts,
    loadEditProduct,
    editProduct
}