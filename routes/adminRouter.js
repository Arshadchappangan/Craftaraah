const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const inventoryController = require('../controllers/admin/inventoryController');
const couponController = require('../controllers/admin/couponController');
const offerController = require('../controllers/admin/offerController');
const nocache = require('../middlewares/noCache')
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require('../middlewares/multer')


//error
router.get('/pageError',adminController.pageError);

//login management
router.get('/login',nocache,adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',nocache,adminAuth,adminController.loadDashboard);
router.get('/logout',adminAuth,adminController.logout);

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
router.post('/editProduct/:id', adminAuth, multer.upload.fields([{ name: 'newImages', maxCount: 5 },]), productController.editProduct);  
router.post('/deleteImage',adminAuth,productController.deleteImage);
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
router.post('/updateStock/:id',adminAuth,inventoryController.updateStock);

// coupon management
router.get('/coupons',adminAuth,couponController.loadCoupons);
router.post('/addCoupon',adminAuth,couponController.addCoupon);
router.get('/archiveCoupon',adminAuth,couponController.archiveCoupon);
router.get('/archivedCoupons',adminAuth,couponController.archivedCouponInfo);
router.get('/restoreCoupon',adminAuth,couponController.restoreCoupon);
router.get('/deleteCoupon',adminAuth,couponController.deleteCoupon);
router.get('/deactivateCoupon',adminAuth,couponController.deactivateCoupon);
router.get('/activateCoupon',adminAuth,couponController.activateCoupon);
router.post('/editCoupon/:id',adminAuth,couponController.editCoupon);

// offer management
router.get('/offers',adminAuth,offerController.loadOffers);
router.post('/createOffer',adminAuth,offerController.createOffer);
router.put('/editOffer/:id',adminAuth,offerController.editOffer);
router.delete('/deleteOffer/:id',adminAuth,offerController.deleteOffer);
router.post('/activateProductOffer',adminAuth,offerController.activateProductOffer);
router.post('/deactivateProductOffer',adminAuth,offerController.deactivateProductOffer);
router.post('/activateCategoryOffer',adminAuth,offerController.activateCategoryOffer);
router.post('/deactivateCategoryOffer',adminAuth,offerController.deactivateCategoryOffer);

//sales management

router.get('/sales',adminAuth,orderController.loadSalesPage);
router.get('/downloadSalesPdf',adminAuth,orderController.downloadSalesPdf);
router.get('/downloadSalesExcel',adminAuth,orderController.downloadSalesExcel);


module.exports = router