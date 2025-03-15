const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema')
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const category = require('../../models/categorySchema');



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
        const productId = req.params.id;
        const updatedData = req.body;

        let product = await Product.findById(productId);
        let category = await Category.findOne({name:updatedData.category})

        if (!product) {
            return res.status(404).json({ error: "Product not found!" });
        }

        const productExists = await Product.findOne({
            productName: product.productName,
            _id: { $ne: productId }
        })

        if (productExists) {
            return res.status(400).json({ error: "Product with this name already exists, please try another name" })
        }

        let images = []
        if (req.files && req.files.length > 0) {
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
            category: category._id,
            regularPrice: updatedData.regularPrice,
            salePrice: updatedData.salePrice,
            quantity: updatedData.quantity,
            productImage: images,
            updatedAt: new Date(),
        });

        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        res.redirect('/admin/pageError');
    }
};


const deleteImage = async (req, res) => {

    try {
        const { imageNameToServer, productIdToServer } = req.body;

        const imageFilename = path.basename(imageNameToServer);
        const imagePath = path.join('public', 'uploads', 'product-images', imageFilename);


        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found!" });
        }

        if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
            console.log(`Image deleted: ${imageFilename}`);
        } else {
            console.log("Image file not found on the server.");
        }

        res.json({ status: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



module.exports = {
    productInfo,
    loadAddProducts,
    addProducts,
    loadEditProduct,
    editProduct,
    deleteImage
}