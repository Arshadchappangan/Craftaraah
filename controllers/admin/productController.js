const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const category = require('../../models/categorySchema');
const Offer = require('../../models/offerSchema');
const { error } = require('console');



const productInfo = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const productData = await Product.find({
            isDeleted : false,
            $or: [
                {productName:{$regex:'.*'+search+'.*',$options:'i'}}
            ]
        }).limit(limit * 1).skip((page - 1) * limit).populate('category').populate('offers').exec();

        const count = await Product.find({
            isDeleted : false,
            $or: [
                {productName:{$regex:'.*'+search+'.*',$options:'i'}}
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true,isDeleted:false });

        const productOffers = await Offer.find({ isActive: true , applicableTo:'Product'});
        const appliedOffers = await Product.find({ isDeleted: false }).populate('offers').exec();
        
        const productIds = productData.map(product => product._id);

        const offersPerProduct = await Offer.find({
        applicableTo: 'Product',
        isActive: true,
        products: { $in: productIds }
        }).lean();

        const activeOfferMap = {};

        offersPerProduct.forEach(offer => {
        offer.products.forEach(productId => {
            activeOfferMap[productId.toString()] = offer;
        });
        });


        productData.forEach(product => {
            let maxDiscount = 0;
            let discountedPrice = product.price;
        
            if (product.offers && product.offers.length > 0) {
                product.offers.forEach(offer => {
                    if (offer.isActive) {
                        const discount = offer.discountPercentage;
                        const offerPrice = product.price - (product.price * discount / 100);
                        if (discount > maxDiscount) {
                            maxDiscount = discount;
                            discountedPrice = offerPrice;
                        }
                    }
                });
            }
        
            product.maxDiscount = maxDiscount;
            product.discountedPrice = Math.max(discountedPrice, 0).toFixed(2);
        });
        


        if (category) {
            res.render('products', {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                category: category,
                productOffers: productOffers || [],
                appliedOffers: appliedOffers || [],
                activeOfferMap: activeOfferMap,
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
        const category = await Category.find({ isListed: true,isDeleted:false});
        res.render("addProduct", { category: category });
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName: { $regex: new RegExp(`^${products.productName}$`, 'i') }
        })

        if (!productExists) {
            const images = []

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

            let specsArray = products.specification ? products.specification.split('-') : [];

            let categoryId = await Category.findOne({ name: products.category })

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                specifications:specsArray,
                category: categoryId,
                price: products.price,
                productImage: images,
                status: 'Available'
            })
            await newProduct.save();
            return res.redirect('/admin/products')
        } else {
            return res.status(400).json('Product already exists, please try another name')
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
      const category = await Category.find({ isDeleted: false, isListed: true });
  
      res.render('editProduct', {
        product,
        category
      });
    } catch (error) {
      res.redirect('pageError');
    }
  };
  


  const editProduct = async (req, res) => {
    try {
      const productId = req.params.id;
  
      const {
        productName,
        description,
        specification,
        price,
        category,
        existingImages,
      } = req.body;
  
      // Normalize existing images (remove domain if present)
      let images = [];
      if (existingImages) {
        const existing = Array.isArray(existingImages)
          ? existingImages
          : [existingImages];
  
          images = existing.map(url => {
            const index = url.indexOf('/uploads/');
            return index !== -1 ? url.slice(index) : url;
          });
          
      }
  
      // Add new uploaded images
      if (req.files && req.files.newImages) {
        const newImages = Array.isArray(req.files.newImages)
          ? req.files.newImages
          : [req.files.newImages];
  
        const newPaths = newImages.map(file => '/uploads/product-images/' + file.filename);
        images.push(...newPaths);
  
        console.log('🆕 New Images Added:', newPaths);
      }

      images = [...new Set(images)]; // ensure unique paths only

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          productName,
          description,
          specification,
          price,
          category,
          productImage: images,
        },
        { new: true }
      );
  
      if (!updatedProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      res.status(200).json({ success: true, message: 'Product updated successfully', product: updatedProduct });
  
    } catch (error) {
      console.error('Error while editing product:', error.message);
      res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
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

const archivedProductInfo = async(req,res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 5;

        const productData = await Product.find({
            isDeleted : true,
            $or: [
                {productName:{$regex:'.*'+search+'.*',$options:'i'}}
            ]
        }).limit(limit * 1).skip((page - 1) * limit).populate('category').exec();

        const count = await Product.find({
            isDeleted : true,
            $or: [
                {productName:{$regex:'.*'+search+'.*',$options:'i'}}
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });

        if (category) {
            res.render('archivedProducts', {
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

const archiveProduct = async (req,res) => {
    try {
        const id = req.query.id;
        const archiveCategory = await Product.findOneAndUpdate({_id:id},{$set:{isDeleted:true}})
        if(archiveCategory){
            res.redirect('/admin/products')
        }else{
            res.status(404).json({error:"Product not found"})
        }
    } catch (error) {
        console.error("Error in archeiving product: ",error)
        res.redirect('/pageError')
    }
}

const restoreProduct = async(req,res) => {
    try {
        const id = req.query.id;
        const restoreProduct = await Product.findOneAndUpdate({_id:id},{$set:{isDeleted:false}})
        if(restoreProduct){
            res.redirect('/admin/archivedProducts')
        }else{
            res.status(404).json({error:"Product not found"})
        }
    } catch (error) {
        console.error("Error in restoring product : ",error)
        res.redirect('/pageError')
    }
}

const deleteProduct = async (req,res) => {
    try {
        const id = req.query.id;
        const deleteProduct = await Product.findByIdAndDelete(id)
        if(deleteProduct){
            res.redirect('/admin/archivedProducts')
        }else{
            res.status(404).json({error:"Product not found"})
        }
    } catch (error) {
        console.error("Error in deleting product : ",error)
        res.redirect('/pageError')
    }
}


module.exports = {
    productInfo,
    loadAddProducts,
    addProducts,
    loadEditProduct,
    editProduct,
    deleteImage,
    archivedProductInfo,
    archiveProduct,
    restoreProduct,
    deleteProduct
}