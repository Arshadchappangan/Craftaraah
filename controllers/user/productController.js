const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  
const Review = require('../../models/reviewSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');


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
        const findCart = await Cart.findOne({userId:user._id}).populate('items.productId');
        if(!findCart){
            return res.redirect('/pageNotFound')
        }

        let subtotal = 0;
        findCart.items.forEach(item => {
            subtotal += item.totalPrice;
        });

        let shippingCharge = 0;
        if(subtotal < 1000){
            shippingCharge = 50;
        }

        const tax = Math.floor(subtotal * 0.12);
        const total = subtotal + shippingCharge + tax;

        res.render('shoppingCart',{
            cart : findCart,
            subtotal : subtotal,
            shippingCharge : shippingCharge,
            tax : tax,
            total : total
        });
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
        const wishlistExist = await Wishlist.findOne({userId:user._id});

        const checkWishlist = wishlistExist.products.findIndex((item) => item.productId.toString() === productId);
        if(checkWishlist !== -1){
            wishlistExist.products.pull({productId:productId});
            await wishlistExist.save();
        }

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
        console.error(error);
        res.redirect('/pageNotFound');
    }
}


const removeFromCart = async(req,res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const cartExist = await Cart.findOne({userId:user._id});
        cartExist.items.pull({_id:productId});
        await cartExist.save();
        res.redirect('/shoppingCart');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const updateCart = async(req,res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const quantity = req.query.quantity;
        cartExist = await Cart.findOne({userId:user._id});
        const findProduct = cartExist.items.findIndex((item) => item.productId == productId);
        if(quantity == 1){
            cartExist.items[findProduct].quantity += 1;
            cartExist.items[findProduct].totalPrice += cartExist.items[findProduct].price;
        }else if(cartExist.items[findProduct].quantity > 1){
            cartExist.items[findProduct].quantity -= 1;
            cartExist.items[findProduct].totalPrice -= cartExist.items[findProduct].price;
        }
        await cartExist.save();
        res.redirect('/shoppingCart');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const addToWishlist = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const productId = req.query.productId;
  
      let wishlist = await Wishlist.findOne({ userId : userId });
  
      if (!wishlist) {
        const wishlist = new Wishlist({
          userId : userId,
          products: [],
        });
        await wishlist.save();
      }
  
      const productIndex = wishlist.products.findIndex(
        (item) => item.productId.toString() === productId
      );
  
      if (productIndex === -1) {
        wishlist.products.push({productId});
        await wishlist.save();
        return res.status(200).json({ message: "Added to wishlist" });
      } else {
        return res.status(200).json({ message: "Already in wishlist" });
      }
    } catch (error) {
      console.error("Error in addToWishlist:", error);
      res.redirect("/pageNotFound");
    }
  };

  const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const wishlist = await Wishlist.findOne({userId:userId}).populate('products.productId');
        if(!wishlist){
            return res.redirect('/pageNotFound');
        }else{
            res.render('wishlist',{
                wishlist : wishlist
            })
        }
    } catch (error) {
      console.error("Error in loadWishlist:", error);
      res.redirect("/pageNotFound");
        
    }
  }
  

module.exports = {
    loadProductDetails,
    reviewSubmission,
    loadShoppingCart,
    addToCart,
    removeFromCart,
    updateCart,
    addToWishlist,
    loadWishlist
}