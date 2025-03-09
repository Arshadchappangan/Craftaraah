const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController')

router.get('/',userController.loadHome);
router.get('/pageNotFound',userController.pageNotFound);
router.get('/login',userController.loadLogin)
router.post('/signup',userController.signup)








module.exports = router;