const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const catetoryController = require('../controllers/admin/categoryController')
const {userAuth,adminAuth} = require("../middlewares/auth");


//error
router.get('/pageError',adminController.pageError);

//login management
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

//user management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.blockCustomer);
router.get('/unblockCustomer',adminAuth,customerController.unblockCustomer);

//category management

router.get('/category',adminAuth,catetoryController.categoryInfo);
router.post('/addCategory',adminAuth,catetoryController.addCategory);


module.exports = router