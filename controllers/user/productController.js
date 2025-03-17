const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  


const loadProductDetails = async(req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = Product.category;
        res.render('shop-details',{
            user : userData,
            product : product,
            category : findCategory
        })

        
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
        }
}


module.exports = {
    loadProductDetails
}