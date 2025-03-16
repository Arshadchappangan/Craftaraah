const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const {userAuth,adminAuth} = require('../middlewares/auth')

router.get('/pageNotFound',userController.pageNotFound)

router.get('/',userController.loadHome);
router.get('/login',userController.loadLogin)
router.get('/logout',userController.logout)

//signupn management
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope : ['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res) => {
    res.redirect('/')
});

//signin management
router.post('/signin',userController.signin)
router.get('/forgotPassword',userController.loadForgotPassword)
router.post('/forgotEmailVerify',userController.forgotEmailVerify)
router.post('/verifyForgotOtp',userController.verifyForgotOtp)
router.get('/resetPassword',userController.loadResetPassword)
router.post('/resendForgotOtp',userController.resendForgotOtp)
router.post('/resetPassword',userController.resetPassword)

// product management

router.get('/shop',userAuth,userController.loadShopPage)










module.exports = router;