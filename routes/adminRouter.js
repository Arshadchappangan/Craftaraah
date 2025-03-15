const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController')
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require('../middlewares/multer')


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

router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.get('/unlistCategory',adminAuth,categoryController.unlistCategory);
router.get('/listCategory',adminAuth,categoryController.listCategory);
router.get('/editCategory',adminAuth,categoryController.loadEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory);
router.get('/deleteCategory',adminAuth,categoryController.deleteCategory)

// product management

router.get('/products',adminAuth,productController.productInfo);
router.get('/addProducts',adminAuth,productController.loadAddProducts);
router.post('/addProducts',adminAuth,multer.array('images',4),productController.addProducts);
router.get('/editProduct',adminAuth,productController.loadEditProduct)
router.post('/editProduct',adminAuth,multer.array('images',4),productController.editProduct);

module.exports = router