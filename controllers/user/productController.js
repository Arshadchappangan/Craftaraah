const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  


const loadProductDetails = async(req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const related = await Product.find({
            category : findCategory,
            _id : {$ne:productId}
        }).limit(4)
        res.render('shop-details',{
            user : userData,
            product : product,
            category : findCategory,
            related : related
        })

        
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
        }
}


module.exports = {
    loadProductDetails
}