const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const profileController = require('../controllers/user/profileController')
const passport = require('passport');
const {userAuth,adminAuth} = require('../middlewares/auth')

router.get('/pageNotFound',userController.pageNotFound)

router.get('/',userController.loadHome);
router.get('/login',userController.loadLogin)
router.get('/logout',userController.logout)

//signin & signupn management
router.post('/signin',userController.signin)
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope : ['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res) => {
    res.redirect('/')
});


// Shopping page

router.get('/shop',userAuth,userController.loadShopPage)
router.get('/filter',userAuth,userController.filterProducts)
router.get('/filterPrice',userAuth,userController.filterPrice)
router.post('/search',userAuth,userController.searchProducts)
router.get('/sort',userAuth,userController.sortProducts)

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


//address management

router.get('/addAddress',userAuth,profileController.addAddress);



module.exports = router;