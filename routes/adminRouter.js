const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require('../controllers/admin/customerController')

//error
router.get('/pageError',adminController.pageError)

//login management
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

//user management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.blockCustomer);
router.get('/unblockCustomer',adminAuth,customerController.unblockCustomer);


module.exports = router