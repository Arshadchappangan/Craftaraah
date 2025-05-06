const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');
const Coupon = require('../../models/couponSchema')
const Cart = require('../../models/cartSchema');
const Review = require('../../models/reviewSchema')
const userHelper = require('../../helpers/userHelpers')
const adminHelper = require('../../helpers/adminHelpers');
const Order = require('../../models/orderSchema');

const loadHome = async (req, res) => {
    try {
        const category = await Category.find({isDeleted:false});
        const product = await Product.find({isDeleted:false}).sort({createdAt:-1}).populate('offers');
        userHelper.calculateDiscount(product)
        const rated = [...product].sort((a,b) => b.rating - a.rating)

        const cartExist = await Cart.find({userId:req.session.user}).populate('items.productId');
        let userData = null;

        const orders = await Order.aggregate([
            {$unwind:"$orderedItems"},
            {
                $group: {
                    _id: "$orderedItems.product",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: "$productDetails._id",
                    totalQuantitySold: 1,
                }
            }
        ])

        product.forEach(prod => {
            const order = orders.find(order => order._id.toString() === prod._id.toString());
            prod.totalSold = order ? order.totalQuantitySold : 0;
        });

        const bestSeller = product.sort((a,b) => b.totalSold-a.totalSold)

        if (req.session.user) {
            userData = await User.findById(req.session.user);
        } else if (req.user) {
            userData = await User.findById(req.user._id);
        }

        res.render('home', {
            user: userData,
            category: category,
            product: product,
            rated:rated,
            bestSeller:bestSeller
        });


    } catch (error) {
        console.log("Home page not found",error);
        res.status(500).send("Server Error")
    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadLogin = async (req, res) => {
    try {
        
        if (!req.session.user) {
            let referrer = req.query.ref || null
            res.render('login',{referrer})
        } else {
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const signup = async (req, res) => {
    try {
        const { name, email, phone, password , referrer} = req.body;
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.render('login', { messageExists: "User already exists... Please Signin..." })
        }

        const otp = userHelper.generateOtp();

        const emailSent = await userHelper.verificationMail(email, otp);

        if (!emailSent) {
            return res.json('Email error')
        }

        req.session.email = email;
        req.session.userOTP = otp;
        req.session.userData = { name, email, phone, password };
        req.session.referrer = referrer

        console.log("OTP sent", otp)
        res.render('signupOtp')

    } catch (error) {
        console.error("Signup error", error);
        res.redirect('/pageNotFound')

    }
}

const securePassword = async (password) => {
    try {
        const passwordHashed = await bcrypt.hash(password, 10);
        return passwordHashed;
    } catch (error) {

    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const referrer = req.session.referrer;
        const user = req.session.userData;
        const domain = process.env.BASE_URL;

        if (otp !== req.session.userOTP) {
            return res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }

        const existingUser = await User.findOne({ email: user.email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered." });
        }

        const passwordHashed = await securePassword(user.password);
        const namePart = user.name.slice(0, 3).toUpperCase();
        const numberPart = Math.floor(1000 + Math.random() * 9000);
        const referralLink = `${domain}?ref=${namePart}${numberPart}`;

        const saveUserData = new User({
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: passwordHashed,
            referral: {
                link: referralLink
            }
        });

        await saveUserData.save();

        if (referrer) {
            const referrerData = await User.findOne({ "referral.link": `${domain}?ref=${referrer}` });

            if (referrerData) {
                const referralCoupon = new Coupon({
                    couponCode: `REF-${referrer}`,
                    couponType: "percentage",
                    discountAmount: 15,
                    owner: referrerData._id,
                    minPurchaseAmount: 1000,
                    maxDiscountAmount: 2000,
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    autoDeleteAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
                });

                await referralCoupon.save();
            }
        }

        req.session.user = {
            _id: saveUserData._id,
            name: saveUserData.name,
            email: saveUserData.email
        };

        res.json({ success: true, redirectUrl: "/" });

    } catch (error) {
        console.error("Error in verifying OTP : ", error);
        res.status(500).json({ success: false, message: "An error occurred." });
    }
}


const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        const otp = userHelper.generateOtp();
        req.session.userOTP = otp;
        const emailSent = await userHelper.verificationMail(email, otp);
        if (emailSent) {
            console.log("Resend OTP : ", otp);
            res.status(200).json({ success: true, message: "OTP Resent successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP, Please try again" })
        }
    } catch (error) {
        console.error("Error resending OTP : ", error);
        res.status(500).json({ success: false, message: "Internal Server Error, Please try again" })

    }
}

const signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email: email ,isAdmin:false});
        if (!findUser) {
            return res.render('login', { message: "User Not Found" })
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by Admin" })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect Password" })
        }

        req.session.user = {
            _id: findUser._id,
            name: findUser.name,
            email: findUser.email
        };

        res.redirect('/')
    } catch (error) {
        console.error("Login Error : ", error);
        res.render('login', { message: "login failed, please try again" })
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destroy error : ", err);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/')
        })
    } catch (error) {
        console.error("Logout error : ", error);
        res.redirect('/pageNotFound');
    }
}


const loadShopPage = async (req,res) => {
    try {

        const {
            search,
            category,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder,
            page,
            limit = 9
        } = req.query

        const condition = {};

        if(search){
            condition.productName = {$regex:search,$options:'i'};
        }

        if(category) condition.category = category;
        if (minPrice || maxPrice) {
            condition.price = {};
            if (minPrice) condition.price.$gte = parseInt(minPrice);
            if (maxPrice) condition.price.$lte = parseInt(maxPrice);
        }
        

        const sortOptions = {};
        if(sortBy){
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
        }

        const skip = (parseInt(page)-1) * parseInt(limit);

        const products = await Product.find(condition)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('offers');

        userHelper.calculateDiscount(products);

        const totalProducts = await Product.countDocuments(condition);
        const categories = await Category.find({isDeleted:false,isListed:true});

        let currentPage = parseInt(page) || 1
        let totalPages = Math.ceil(totalProducts/limit)

        res.render('shop-grid',{
            user : req.session.user,
            products,
            category : categories,
            query : req.query,
            currentPage,
            totalPages
        })

    } catch (error) {
        console.error(error);
        res.json({success:false,message:"Server Error"})
    }
}

module.exports = {
    loadHome,
    pageNotFound,
    loadLogin,
    signup,
    securePassword,
    verifyOtp,
    resendOtp,
    signin,
    logout,
    loadShopPage
}