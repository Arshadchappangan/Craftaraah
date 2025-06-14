const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const profileController = require('../controllers/user/profileController')
const passport = require('passport');
const {userAuth,adminAuth} = require('../middlewares/auth')
const multer = require('../middlewares/multer');
const paymentController = require('../controllers/user/paymentController')
const nocache = require('../middlewares/noCache')
const userMiddlewares = require('../middlewares/userMiddlewares')

router.get('/pageNotFound',userController.pageNotFound)

router.get('/',nocache,userController.loadHome);
router.get('/login',nocache,userController.loadLogin)
router.get('/logout',userController.logout)

//signin & signupn management
router.post('/signin',userController.signin)
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope : ['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    req.session.user = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email
    };
    
    res.redirect('/')
});


// Shopping page
router.get('/shop',userAuth,userController.loadShopPage)


//product details

router.get('/productDetails',userAuth,productController.loadProductDetails)
router.post('/review',userAuth,productController.reviewSubmission)


//profile management

router.get('/forgotPassword',profileController.loadForgotPassword);
router.post('/forgotEmailVerify',profileController.forgotEmailVerify);
router.post('/verifyForgotOtp',profileController.verifyForgotOtp);
router.get('/resetPassword',profileController.loadResetPassword);
router.post('/resendForgotOtp',profileController.resendForgotOtp);
router.post('/resetPassword',profileController.resetPassword);
router.get('/userProfile',userAuth,profileController.userProfile);
router.get('/changeEmail',userAuth,profileController.changeEmail);
router.post('/verifyEmailOtp',userAuth,profileController.verifyEmailOtp);
router.get('/newEmailEnter',userAuth,profileController.loadNewEmailEnter);
router.post('/updateEmail',userAuth,profileController.updateEmail);
router.get('/changePassword',userAuth,profileController.changePassword);
router.get('/myAddresses',userAuth,profileController.myAddresses);
router.get('/myOrders',userAuth,profileController.myOrders);
router.get('/wallet',userAuth,profileController.loadWallet);
router.post('/uploadProfilePhoto',userAuth,multer.dpUpload.single('profilePhoto'),profileController.uploadProfilePhoto);
router.post('/updateProfileInfo',userAuth,profileController.updateProfileInfo)


//address management

router.get('/addAddress',userAuth,profileController.loadAddAddress);
router.post('/addAddress',userAuth,profileController.addAddress);
router.get('/editAddress',userAuth,profileController.loadEditAddress);
router.post('/editAddress',userAuth,profileController.editAddress);
router.get('/deleteAddress',userAuth,profileController.deleteAddress);


//cart management
router.get('/shoppingCart',userAuth,productController.loadShoppingCart);
router.get('/coupon',userAuth,productController.loadCouponPage);
router.get('/addToCart',userAuth,productController.addToCart);
router.get('/removeFromCart',userAuth,productController.removeFromCart);
router.post('/updateCart',userAuth,productController.updateCart);
router.post('/applyCoupon',userAuth,productController.applyCoupon);


//wishlist management
router.get('/wishlist',userAuth,productController.loadWishlist);
router.get('/addToWishlist',userAuth,productController.addToWishlist);
router.get('/removeFromWishlist',userAuth,productController.removeFromWishlist);


//order management
router.get('/checkCart',userAuth,productController.checkCartStatus);
router.get('/checkout',userAuth,productController.checkout);
router.post('/placeOrder',userAuth,userMiddlewares.verifyStock,productController.placeOrder);
router.get('/orderPlaced',userAuth,productController.orderPlaced);
router.get('/orderDetails',userAuth,productController.orderDetails);
router.post('/cancelOrder',userAuth,productController.cancelOrder);
router.post('/returnOrder',userAuth,productController.returnOrder);
router.get('/invoice/:id',userAuth,productController.downloadInvoice);
router.get('/orderFailure',userAuth,productController.orderFailed);

//razorpay payment
router.post('/razorpayOrder',userAuth,userMiddlewares.verifyStock,paymentController.createRazorpayOrder);
router.post('/verifyPayment',userAuth,paymentController.verifyPayment);
router.post('/topupWallet',userAuth,paymentController.topupWallet)


module.exports = router;