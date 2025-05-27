const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');  
const Review = require('../../models/reviewSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');
const userHelper = require('../../helpers/userHelpers')
const razorpay = require('../../config/razorpay');
const adminHelpers = require('../../helpers/adminHelpers')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');



const loadProductDetails = async(req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id || req.session.product;
        const product = await Product.findById(productId).populate('category').populate('offers');
        const findCategory = product.category._id;
        req.session.product = null;
        let related = await Product.find({
            category : findCategory,
            _id : {$ne:productId}
        }).populate('offers').limit(4)
        userHelper.calculateDiscount(related)

        const review = await Review.find({productId:productId}).populate('userId').sort({createdAt:-1});
        const overallRating = review.length > 0 ? Math.ceil(product.productRating / review.length) : 0

        userHelper.calculateDiscount(product)

        res.render('shop-details',{
            userId : userData,
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

const reviewSubmission = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, review, rating } = req.body;
        req.session.product = productId;

        const product = await Product.findOne({ _id: productId });

        const existingReview = await Review.findOne({userId:userId,productId:productId})
        if(existingReview){
            existingReview.review = review,
            existingReview.rating = rating
            await existingReview.save()
        }else{
            const saveReview = new Review({
                userId: userId,
                productId,
                review,
                rating
            });
            await saveReview.save();

            product.review.push(saveReview._id);
            await product.save();
        }

        const allReviews = await Review.find({ productId: productId });
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        product.rating = totalRating / allReviews.length;
        await product.save();

        res.redirect('/productDetails');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}


const loadShoppingCart = async (req,res) => {
    try {
        const user = req.session.user;
        const couponCode = req.session.couponCode || null;
        let findCart = await Cart.findOne({userId:user._id}).populate({
            path: 'items.productId',
            populate: {
              path: 'offers'
            }
          })
          

        if(!findCart){
            findCart = {items:[]}
            return res.render('shoppingCart',{
                user : user,
                cart : findCart,
                subtotal : 0,
                discount : 0,
                shippingCharge : 0,
                tax : 0,
                total : 0,
                coupons : null,
                coupon : null,
                couponDiscount : 0
            });
        }

        findCart.items.forEach(item => userHelper.calculateDiscount(item.productId))

        let cartData = userHelper.calculateCartTotals(findCart)
        
        let couponData = await userHelper.couponDiscountApply(couponCode,cartData.subtotal)

        let total = cartData.subtotal - couponData.couponDiscount - cartData.discount + cartData.shippingCharge + cartData.tax;

        return res.render('shoppingCart',{
            user : user,
            cart : findCart,
            subtotal : cartData.subtotal,
            discount : cartData.discount,
            shippingCharge : cartData.shippingCharge,
            tax : cartData.tax,
            total : total,
            coupon : couponData.coupon || null,
            couponDiscount : couponData.couponDiscount || 0
        });
    } catch (error) {
        console.error(error)
        return res.redirect('/pageNotFound')
    }
}


const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.query.productId;
        const quantityToAdd = 1;

        const productData = await Product.findById(productId).populate('offers');
        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        userHelper.calculateDiscount(productData);

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
            if (productData.stock < quantityToAdd) {
                return res.status(200).json({ success: false, message: "Product out of stock" });
            }

            const newCart = new Cart({
                userId: user._id,
                items: [{
                    productId,
                    quantity: quantityToAdd,
                    price: productData.price
                }]
            });

            await newCart.save();
            return res.status(200).json({ success: true, message: "Added to cart" });
        }

        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (productIndex !== -1) {
            const currentQty = cart.items[productIndex].quantity;
            const newQty = currentQty + quantityToAdd;

            if (newQty > 5) {
                return res.status(200).json({ success: false, message: "Maximum quantity reached (5)" });
            }

            if (newQty > productData.stock) {
                return res.status(200).json({ success: false, message: "Product out of stock" });
            }

            cart.items[productIndex].quantity = newQty;

        } else {
            if (quantityToAdd > productData.stock) {
                return res.status(200).json({ success: false, message: "Product out of stock" });
            }

            cart.items.push({
                productId,
                quantity: quantityToAdd,
                price: productData.price
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

const updateCart = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity); 

        const cartExist = await Cart.findOne({ userId: user._id }).populate('items.productId');
        if (!cartExist) {
            return res.json({success:false,message:'Cart not found'})
        }

        const findProduct = cartExist.items.findIndex(
            (item) => item.productId._id.toString() === productId.toString()
        );

        if (findProduct === -1) {
            return res.json({success:false,message:'Product not found in cart'})
        }

        const item = cartExist.items[findProduct];

        if ((item.quantity + quantity) > (item.productId?.stock || 0)) {
            return res.json({success:false,message:`Only ${item.productId.stock} items left in inventory`})
        }

        if((item.quantity + quantity) > 5){
            return res.json({ success: false, message: "Maximum quantity reached (5)" });
        }

        if (quantity === 1 && item.quantity < 5 ) {
            item.quantity += 1;
        } else if (quantity === -1 && item.quantity > 1) {
            item.quantity -= 1;
        }

        await cartExist.save();
        res.json({success:true});
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' })
    }
};


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

        let wishlist = await Wishlist.findOne({ userId: user._id }).populate('products.productId');
        let wishlistProducts = []

        if (!wishlist) {
            wishlist = { products: [] };
        } else {
            const productIds = wishlist.products.map(item => item.productId);
            wishlistProducts = await Product.find({ _id: { $in: productIds } }).populate('offers');
            userHelper.calculateDiscount(wishlistProducts);
        }

        res.render('wishlist', {
            user: user,
            wishlist: wishlistProducts
        });

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
                return res.json({ success: false, message: "Cart is empty" });
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
        const couponCode = req.session.couponCode || null;

        let cart = await Cart.findOne({userId:user._id}).populate({
            path: 'items.productId',
            populate: {
              path: 'offers'
            }
          })

        cart.items.forEach(item => userHelper.calculateDiscount(item.productId))

        let cartData = userHelper.calculateCartTotals(cart)

        let couponData = await userHelper.couponDiscountApply(couponCode,cartData.subtotal)

        let total = cartData.subtotal - couponData.couponDiscount - cartData.discount + cartData.shippingCharge + cartData.tax;


        const address = await Address.findOne({userId:user._id});


        res.render('checkout',{
            user : user,
            cart : cart,
            subtotal : cartData.subtotal,
            discount : cartData.discount,
            shippingCharge : cartData.shippingCharge,
            tax : cartData.tax,
            total : total,
            address : address,
            coupon : couponData.coupon || null,
            couponDiscount : couponData.couponDiscount || 0
        });
    } catch (error) {
        console.error("Error in checkout:", error);
        res.redirect("/pageNotFound");
    }
}

const placeOrder = async (req, res) => {
    try {
        const user = req.session.user;
        const couponCode = req.session.couponCode || null;
        let { razorOrderId, paymentId, signature, paymentMethod,selectedAddress } = req.body;

        let cart = await Cart.findOne({userId:user._id}).populate({
            path: 'items.productId',
            populate: {
              path: 'offers'
            }
          })
        const address = await Address.findOne({userId:user._id});
        let selectedAddressDetails = address.address[selectedAddress];

        const orderId = userHelper.generateOrderId()

        for (const item of cart.items) {
            userHelper.calculateDiscount(item.productId);
          }

        let cartData = userHelper.calculateCartTotals(cart)

        let couponData = await userHelper.couponDiscountApply(couponCode,cartData.subtotal)

        let total = cartData.subtotal - couponData.couponDiscount - cartData.discount + cartData.shippingCharge + cartData.tax;

        let wallet = await Wallet.findOne({userId:user._id});
        if(!wallet){
            wallet = new Wallet({
                userId : user._id,
                walletId : userHelper.generateWalletId(),
                balance : 0,
                transactions : []
            })
            await wallet.save();
        }

        if(paymentMethod === 'wallet' && wallet.balance < total){
            return res.json({success:false,message:'Insufficient wallet balance. Please choose another payment method or top up your wallet.'})
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.discountedPrice
          }));


        const placeOrder = new Order({
            orderId : orderId,
            userId : user._id,
            orderedItems : orderedItems,
            totalPrice : cartData.subtotal,
            discount : cartData.discount,
            couponCode : couponCode,
            couponDiscount : couponData.couponDiscount,
            shippingCharge : cartData.shippingCharge,
            tax : cartData.tax,
            finalAmount : total,
            address : selectedAddressDetails,
            paymentMethod : paymentMethod
        })

        req.session.orderId = placeOrder._id;
        await placeOrder.save();

        if(paymentMethod === 'wallet'){
            placeOrder.paymentDetails = {
                status : "Paid"
            }
            wallet.balance -= total;
            wallet.transactions.push({
                transactionType : 'Debit',
                transactionId : adminHelpers.generateTransactionId(),
                amount : total,
                order : placeOrder._id,
                date : new Date(),
                description : `Order payment with the order ID ${orderId}`
            })
            await wallet.save();
            await placeOrder.save();
        }else if(paymentMethod === 'Razorpay'){
            placeOrder.paymentDetails = {
                orderId : razorOrderId,
                paymentId : paymentId,
                signature : signature,
                status : "Paid"
            }
            await placeOrder.save();
        }

        await Cart.findOneAndDelete({userId:user._id}); 

        let userUsage = null;
        if(couponCode){
            if(couponData.coupon && couponData.coupon.usedBy > 0){   
                userUsage = couponData.coupon.usedBy.find(item => item.userId.toString() === user._id.toString());
            }
        }
        if (userUsage) {
            userUsage.usedCount += 1;
        } else {
            if(couponData.coupon && couponData.coupon.usedBy){
                couponData.coupon.usedBy.push({ userId:user._id, usedCount: 1 });
            }
        }

        if (couponData && couponData.coupon) {
            await couponData.coupon.save();
        }

        req.session.couponCode = null;

        for (const item of orderedItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );
        }

        res.json({success:true});

    } catch (error) {
        console.error("Error in placeOrder:", error);
        res.redirect("/orderFailure");
    }
}

const orderPlaced = async (req,res) => {
    try {
        const user = req.session.user;
        const order = await Order.findById(req.session.orderId)
        .sort({createdAt:-1})
        .populate('orderedItems.product');

        if (!order) {
            return res.redirect('/pageNotFound');
        }

        req.session.orderId = null;

        let subtotal = 0;
        order.orderedItems.forEach(item => {
            subtotal += item.product.regularPrice * item.quantity;
        })

        let discount = 0;
        order.orderedItems.forEach(item => {
            discount += item.product.salePrice * item.quantity
        })
        discount = subtotal - discount;

        let shippingCharge = 0;
        if(subtotal < 1000){
            shippingCharge = 50;
        }

        let tax = 0;
        if(subtotal > 3000){
            tax = Math.floor(subtotal * 0.12);
        } 

        let total = order.finalAmount;


        return res.render('orderPlaced',{
            user : user,
            order : order,
            total : total,
        })

    } catch (error) {
        console.error("Error in orderPlaced:", error);
        res.redirect("/pageNotFound");
    }
}

const orderDetails = async(req,res) => {
    try {
        const user = req.session.user;
        const id = req.query.id;
        const order = await Order.findById(id).populate('orderedItems.product').populate('address');
        const couponCode = order.couponCode;
        let coupon = await Coupon.findOne({couponCode:couponCode,isDeleted:false,isActive:true});

        return res.render('orderDetails',{
            user : user,
            order:order,
            coupon : coupon || null,
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const cancelOrder = async (req, res) => {
    try {
        const user = req.session.user;
        const { orderId, productId } = req.query;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }

        const order = await Order.findById(orderId).populate('orderedItems.product');
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        let productIndex = null;
        let selectedItem = null;

        if (productId && productId !== 'undefined') {
            productIndex = order.orderedItems.findIndex(item => item.product && item.product._id.toString() === productId);

            if (productIndex === -1) {
                return res.status(404).json({ success: false, message: "Product not found in the order." });
            }

            selectedItem = order.orderedItems[productIndex];
        }

        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({ 
                userId: user._id, 
                walletId: userHelper.generateWalletId(),
                balance: 0, 
                transactions: [] 
            });
        }

        if (["Razorpay", "wallet"].includes(order.paymentMethod)) {
            let refundAmount = 0;
            let description = '';

            if (selectedItem) {
                refundAmount = selectedItem.price * selectedItem.quantity;
                description = `Refund for "${selectedItem.product.productName}" from the order with order ID ${order.orderId}`;
            } else {
                const cancelledItemsTotal = order.orderedItems
                    .filter(item => item.isCancelled === true)
                    .reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
                refundAmount = order.finalAmount - cancelledItemsTotal;
                description = `Refund for order ID: ${order.orderId}`;
            }

            order.refundAmount = (order.refundAmount || 0) + refundAmount;

            wallet.balance += refundAmount;
            wallet.transactions.push({
                transactionId: adminHelpers.generateTransactionId(),
                transactionType: "Refund",
                amount: refundAmount,
                date: new Date(),
                order: orderId,
                description: description,
            });

            await wallet.save();
        }

        // Restock products
        if (selectedItem) {
            await Product.findByIdAndUpdate(selectedItem.product._id, {
                $inc: { stock: selectedItem.quantity },
            });
            selectedItem.isCancelled = true;
        } else {
            for (const item of order.orderedItems) {
                if (item.product) {
                    await Product.findByIdAndUpdate(item.product._id, {
                        $inc: { stock: item.quantity },
                    });
                }
                item.isCancelled = true;
            }
        }

        // Update order status
        const allItemsCancelled = order.orderedItems.every(item => item.isCancelled);
        order.status = allItemsCancelled ? "Cancelled" : "Partially Cancelled";

        await order.save();

        return res.json({ success: true, message: "Cancellation processed successfully!" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};




const returnOrder = async (req,res) => {
    try {
        const id = req.query.id;
        const reason = req.body.reason;
        const order = await Order.findById(id);

        order.returnRequest = {
            status : "Requested",
            reason : reason,
            requestedAt : Date.now()
        }
        order.status = "Return Requested"

        await order.save()
        res.json({success:true,message:"Return request submitted successfully !"})
    } catch (error) {
        console.error(error);
        res.json({success:false,message:"Something went wrong"})
    }
}


const downloadInvoice = async (req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id).populate("orderedItems.product");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const invoicesDir = path.join(__dirname, "../../public/invoices");
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const pdfPath = path.join(invoicesDir, `invoice_${order.orderId}.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const primaryColor = "#000000";
        const secondaryColor = "#555555";
        const accentColor = "#007BFF";

        // Header
        const logoPath = path.join(__dirname, "../../public/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 30, { width: 60 });
        }

        doc.fillColor(primaryColor)
            .fontSize(20)
            .text("Craftaraah", 130, 40)
            .fontSize(10)
            .text("Irumbuchola Subway", 130, 60)
            .text("AR Nagar, Malappuram", 130, 75)
            .text("Kerala, India", 130, 90)
            .moveDown();

        doc.moveTo(50, 110).lineTo(550, 110).stroke();

        doc.fillColor(accentColor).fontSize(25).text("INVOICE", 400, 130);

        doc.fillColor(primaryColor)
            .fontSize(10)
            .text(`Invoice No: ${order.orderId}`, 400, 160)
            .text(`Date: ${new Date().toDateString()}`, 400, 175)
            .moveDown();

        // Billing Address
        doc.fontSize(12).fillColor(accentColor).text("Bill To:", 50, 160);
        doc.fillColor(primaryColor).font("Helvetica-Bold").text(order.address.name, 50, 175);
        doc.font("Helvetica").text(`${order.address.city}, ${order.address.state}`, 50, 190);
        doc.text(`Phone: ${order.address.phone}`, 50, 205);

        // Table Header
        doc.fillColor("white")
            .rect(50, 230, 500, 25)
            .fill()
            .fillColor("black")
            .font("Helvetica-Bold")
            .text("Item", 55, 235)
            .text("Qty", 200, 235)
            .text("Price", 250, 235)         
            .text("Offer Price", 320, 235)  
            .text("Total", 420, 235);        

        // Table Rows
        let y = 260;
        doc.fillColor(primaryColor).font("Helvetica");
        order.orderedItems.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.fillColor("#F0F0F0").rect(50, y - 5, 500, 20).fill().fillColor(primaryColor);
            }

            const offerPrice = item.price;
            const total = offerPrice * item.quantity;

            doc.text(item.product.productName, 55, y);
            doc.text(item.quantity.toString(), 200, y);
            doc.text(`${item.product.price.toFixed(2)}`, 250, y);
            doc.text(`${item.price.toFixed(2)}`, 320, y);
            doc.text(`${total.toFixed(2)}`, 420, y);

            y += 25;

        });

        doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();

        // Summary (with shipping and tax)
        const shipping = order.shipping || 0;
        const tax = order.tax || 0;

        const subtotal = order.totalPrice;
        const discount = order.discount;
        const finalAmount = order.finalAmount;

        doc.fillColor(primaryColor).font("Helvetica-Bold");
        doc.text(`Subtotal: ${subtotal.toFixed(2)}`, 400, y + 20);
        doc.text(`Shipping: ${shipping.toFixed(2)}`, 400, y + 35);
        doc.text(`Tax     : ${tax.toFixed(2)}`, 400, y + 50);
        doc.text(`Discount: ${discount.toFixed(2)}`, 400, y + 65);
        doc.text(`Total   : ${finalAmount.toFixed(2)}`, 400, y + 85);

        // Footer
        doc.moveDown().fontSize(10).fillColor(secondaryColor).text("Thank you for your purchase!", 50, y + 120);

        doc.end();

        stream.on("finish", () => {
            res.download(pdfPath, `invoice_${order.orderId}.pdf`);
        });

    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).json({ success: false, message: "Error generating invoice" });
    }
};

const orderFailed = (req,res) => {
    try {
        let user = req.session.user;
        res.render('orderFailed',{
            user,
            order : null
        });

    } catch (error) {
        console.error('Order failed : ',error);
        res.status(500).send('Something went wrong');
        
    }
}


const applyCoupon = async (req, res) => {
    try {
        const user = req.session.user;
        const couponCode = req.body.couponCode.toUpperCase();

        const coupon = await Coupon.findOne({ couponCode, isDeleted: false, isActive: true });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code' });
        }

        const userUsage = coupon.usedBy.find(item => item.userId.toString() === user._id.toString());
        if (userUsage && userUsage.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon already used' });
        }

        if(coupon.expiryDate < Date.now()){
            return res.status(400).json({ success: false, message: 'Coupon expired' });
        }

        req.session.couponCode = couponCode;

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            coupon
        });

    } catch (error) {
        console.error('Apply coupon error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const loadCouponPage = async (req, res) => {
    try {
        const user = req.session.user;

        const coupons = await Coupon.find({
            isDeleted: false,
            couponCode: { $not: /^REF/ }
        }).sort({ isActive: -1, expiryDate: 1 });

        const referralCoupon = await Coupon.find({
            couponCode: { $regex: /^REF/ },  
            owner: new mongoose.Types.ObjectId(user._id)   
        });
        
        res.render('couponDetails',{user,coupons,referralCoupon});
    } catch (error) {
        console.error('Load coupon page error:', error);
        res.redirect('/pageNotFound');
        
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
    orderPlaced,
    orderDetails,
    cancelOrder,
    returnOrder,
    downloadInvoice,
    orderFailed,
    applyCoupon,
    loadCouponPage,
}