const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const inventoryController = require('../controllers/admin/inventoryController');
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
router.get('/archiveCategory',adminAuth,categoryController.archiveCategory);
router.get('/archivedCategories',adminAuth,categoryController.archivedCategoryInfo);
router.get('/deleteCategory',adminAuth,categoryController.deleteCategory);
router.get('/restoreCategory',adminAuth,categoryController.restoreCategory)


// product management

router.get('/products',adminAuth,productController.productInfo);
router.get('/addProducts',adminAuth,productController.loadAddProducts);
router.post('/addProducts',adminAuth,multer.upload.array('croppedImages',10),productController.addProducts);
router.get('/editProduct',adminAuth,productController.loadEditProduct)
router.post('/editProduct/:id',adminAuth,multer.upload.array([
    { name: 'newImages', maxCount: 5 },
    { name: 'croppedImages', maxCount: 5 }
]),productController.editProduct);
router.post('/deleteImage',adminAuth,productController.deleteImage)
router.get('/archivedProducts',adminAuth,productController.archivedProductInfo);
router.get('/archiveProduct',adminAuth,productController.archiveProduct);
router.get('/restoreProduct',adminAuth,productController.restoreProduct);
router.get('/deleteProduct',adminAuth,productController.deleteProduct);

//order management

router.get('/orders',adminAuth,orderController.viewOrders);
router.get('/orderDetails',adminAuth,orderController.viewDetails);
router.put('/updateOrderStatus/:id',adminAuth,orderController.updateOrderStatus);
router.get('/returns',adminAuth,orderController.viewReturns);
router.post('/approveReturn',adminAuth,orderController.approveReturn);
router.post('/rejectReturn',adminAuth,orderController.rejectReturn);
router.post('/refund',adminAuth,orderController.refund);

//inventory management

router.get('/inventory',adminAuth,inventoryController.loadInventory);
router.post('/updateStock/:id',adminAuth,inventoryController.updateStock)

module.exports = router