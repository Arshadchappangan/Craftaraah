const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  
const Review = require('../../models/reviewSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const { v4: uuidv4 } = require('uuid');


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
        let findCart = await Cart.findOne({userId:user._id}).populate('items.productId');

        if(!findCart){
            findCart = {items:[]}
            res.render('shoppingCart',{
                user : user,
                cart : findCart,
                subtotal : 0,
                shippingCharge : 0,
                tax : 0,
                total : 0
            });
        }

        let subtotal = 0;
        findCart.items.forEach(item => {
            subtotal += item.totalPrice;
        });

        let shippingCharge = 0;
        if(subtotal < 1000){
            shippingCharge = 50;
        }

        let tax = 0;
        if(subtotal > 3000){
            tax = Math.floor(subtotal * 0.12);
        }

       let total = subtotal + shippingCharge + tax;

        res.render('shoppingCart',{
            user : user,
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


const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const quantityToAdd = 1;

        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let cart = await Cart.findOne({ userId: user._id });

        const wishlist = await Wishlist.findOne({ userId: user._id });
        if (wishlist) {
            const index = wishlist.products.findIndex(item => item.productId.toString() === productId);
            if (index !== -1) {
                wishlist.products.splice(index, 1);
                await wishlist.save();
            }
        }

        if (!cart) {
            if (quantityToAdd > productData.quantity) {
                return res.status(200).json({ success: false, message: "Product out of stock" });
            }

            const newCart = new Cart({
                userId: user._id,
                items: [{
                    productId,
                    quantity: quantityToAdd,
                    price: productData.salePrice,
                    totalPrice: productData.salePrice * quantityToAdd
                }]
            });

            await newCart.save();
            return res.status(200).json({ success: true, message: "Added to cart" });
        }


        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (productIndex !== -1) {
            const currentQty = cart.items[productIndex].quantity;
            const newQty = currentQty + quantityToAdd;

            if (currentQty >= 5) {
                return res.status(200).json({ success: false, message: "Maximum quantity reached (5)" });
            }

            if (newQty > productData.quantity) {
                return res.status(200).json({
                    success: false,
                    message: `Product Out of Stock`
                });
            }

            cart.items[productIndex].quantity = newQty;
            cart.items[productIndex].totalPrice = productData.salePrice * newQty;
        } else {
            if (quantityToAdd > productData.quantity) {
                return res.status(200).json({ success: false, message: "Product out of stock" });
            }

            cart.items.push({
                productId,
                quantity: quantityToAdd,
                price: productData.salePrice,
                totalPrice: productData.salePrice * quantityToAdd
            });
        }

        await cart.save();
        return res.status(200).json({ success: true, message: "Added to cart" });

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};



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
        if(quantity == 1 && cartExist.items[findProduct].quantity < 5){
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

      let cartExist = await Cart.findOne({userId:userId});
      if(cartExist){
        const findProduct = cartExist.items.findIndex((item) => item.productId == productId);
        if(findProduct !== -1){
            return res.status(200).json({success : false, message: "Product already in cart" });
        }
      }
  
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
  
      if (productIndex === -1 && wishlist.products.length < 12) {
        wishlist.products.push({productId});
        await wishlist.save();
        return res.status(200).json({success : true, message: "Added to wishlist" });
      } else if(productIndex !== -1 && wishlist.products.length >= 12){
        return res.status(200).json({success : false, message: "Wishlist is full" });
      }else{
        return res.status(200).json({success : false, message: "Already in wishlist" });
      }
    } catch (error) {
      console.error("Error in addToWishlist:", error);
      res.redirect("/pageNotFound");
    }
  };

  const loadWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const wishlist = await Wishlist.findOne({userId:user._id}).populate('products.productId');
        if(!wishlist){
            wishlist = {products:[]}
            res.render('wishlist',{
                user : user,
                wishlist : wishlist
            })
        }else{
            res.render('wishlist',{
                user : user,
                wishlist : wishlist
            })
        }
    } catch (error) {
      console.error("Error in loadWishlist:", error);
      res.redirect("/pageNotFound");
        
    }
  }
  

  const removeFromWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const wishlist = await Wishlist.findOne({userId:user._id});
        wishlist.products.pull({productId:productId});
        await wishlist.save();
        return res.status(200).json({success : true, message: "Removed from wishlist" });
    } catch (error) {
      console.error("Error in removeFromWishlist:", error);
      return res.status(500).json({success : false, message: "Internal server error" });
    }
  }


    const checkCartStatus = async (req, res) => {
        try {
            const user = req.session.user;
            const cart = await Cart.findOne({ userId: user._id });

            if (!cart || cart.items.length === 0) {
                return res.status(200).json({ success: false, message: "Cart is empty" });
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error in checkCartStatus:", error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    };



  const checkout = async (req, res) => {
    try {
        const user = req.session.user;
        const cart = await Cart.findOne({userId:user._id}).populate('items.productId');

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.totalPrice;
        });

        let shippingCharge = 0;
        if(subtotal < 1000){
            shippingCharge = 50;
        }

        let tax = 0;
        if(subtotal > 3000){
            tax = Math.floor(subtotal * 0.12);
        }
        
        let total = subtotal + shippingCharge + tax;

        const address = await Address.findOne({userId:user._id});


        res.render('checkout',{
            user : user,
            cart : cart,
            subtotal : subtotal,
            shippingCharge : shippingCharge,
            tax : tax,
            total : total,
            address : address
        });
    } catch (error) {
        console.error("Error in checkout:", error);
        res.redirect("/pageNotFound");
    }
}

const placeOrder = async (req, res) => {
    try {

        const user = req.session.user;
        const cart = await Cart.findOne({userId:user._id}).populate('items.productId');
        const address = await Address.findOne({userId:user._id});
        const orderId = uuidv4();
        console.log("req.body : ",req.body)
        const { paymentMethod,selectedAddress } = req.body;
        

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.totalPrice;
        })

        let shippingCharge = 0;
        if(subtotal < 1000){
            shippingCharge = 50;
        }

        total = subtotal + shippingCharge;



        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.price
          }));

        const placeOrder = new Order({
            orderId : orderId,
            userId : user._id,
            orderedItems : orderedItems,
            totalPrice : subtotal,
            finalAmount : total,
            address : address.address[selectedAddress],
            paymentMethod : paymentMethod
        })

        await placeOrder.save();
        await Cart.findOneAndDelete({userId:user._id}); 

        for (const item of orderedItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } },
                { new: true }
            );
        }

        res.redirect('/orderPlaced')

    } catch (error) {
        console.error("Error in placeOrder:", error);
        res.redirect("/pageNotFound");
    }
}

const orderPlaced = async (req,res) => {
    try {
        const user = req.session.user;
        res.render('orderPlaced',{
            user : user
        })
    } catch (error) {
        console.error("Error in orderPlaced:", error);
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
    loadWishlist,
    removeFromWishlist,
    checkCartStatus,
    checkout,
    placeOrder,
    orderPlaced
}