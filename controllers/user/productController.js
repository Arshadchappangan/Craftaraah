const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  
const Review = require('../../models/reviewSchema');
const Cart = require('../../models/cartSchema');


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

        const review = await Review.find({productId:productId}).populate('userId').sort({createdAt:-1});
        const overallRating = review.length > 0 ? Math.ceil(product.productRating / review.length) : 0

        res.render('shop-details',{
            user : userData,
            product : product,
            category : findCategory,
            related : related,
            review : review,
            overallRating : overallRating
        })

        
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
        }
}

const reviewSubmission = async (req,res) => {
    try {
        const userId = req.session.user;
        const productId = req.body.productId;
        const review = req.body.review;
        const rating = req.body.rating;

        const saveReview = new Review({
            userId : userId,
            productId : productId,
            review : review,
            rating : rating
        })

        await saveReview.save();
        await Product.findByIdAndUpdate(productId,{$inc:{productRating:rating}})
        res.redirect('/shop')

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const loadShoppingCart = async (req,res) => {
    try {
        const user = req.session.user;
        console.log(user)
        const findCart = await Cart.findOne({userId:user._id}).populate('items.productId');
        console.log(findCart)
        if(!findCart){
            return res.redirect('/pageNotFound')
        }
        res.render('shoppingCart',{
            user : user,
            cart : findCart});
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}


const addToCart = async (req,res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const quantity = req.query.quantity || 1;
        const productData = await Product.findOne({_id:productId})

        const cartExist = await Cart.findOne({userId:user._id});

        if(!cartExist){
            const newProduct = new Cart({
                userId : user._id,
                items : [{
                    productId : productId,
                    quantity : quantity,
                    price : productData.salePrice,
                    totalPrice : productData.salePrice * quantity
                }]
            })
            await newProduct.save();
            res.redirect('/shoppingCart');
        }else{
            const findProduct = cartExist.items.findIndex((item) => item.productId == productId);
            if(findProduct !== -1){
                cartExist.items[findProduct].quantity += quantity;
                cartExist.items[findProduct].totalPrice += productData.salePrice * quantity;
                await cartExist.save();
                res.redirect('/shoppingCart');
            }else{
                cartExist.items.push({
                    productId : productId,
                    quantity : quantity,
                    price : productData.salePrice,
                    totalPrice : productData.salePrice * quantity
                })
                await cartExist.save();
                res.redirect('/shoppingCart');

            }
        }
        

    } catch (error) {
        
    }
}

module.exports = {
    loadProductDetails,
    reviewSubmission,
    loadShoppingCart,
    addToCart
}