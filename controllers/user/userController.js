const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');
const Coupon = require('../../models/couponSchema')
const Cart = require('../../models/cartSchema');


function calculateDiscount(productData) {
    const applyDiscount = (product) => {
        let maxDiscount = 0;
        let discountedPrice = product.price;

        if (product.offers && product.offers.length > 0) {
            product.offers.forEach(offer => {
                if (offer.isActive) {
                    const discount = offer.discountPercentage;
                    const offerPrice = product.price - (product.price * discount / 100);
                    if (discount > maxDiscount) {
                        maxDiscount = discount;
                        discountedPrice = Math.round(offerPrice);
                    }
                }
            });
        }

        product.maxDiscount = maxDiscount;
        product.discountedPrice = Math.max(discountedPrice, 0).toFixed(2);
    };

    if (Array.isArray(productData)) {
        productData.forEach(product => applyDiscount(product));
    } else {
        applyDiscount(productData);
    }
}

const loadHome = async (req, res) => {
    try {
        const category = await Category.find({isDeleted:false});
        const product = await Product.find({isDeleted:false}).sort({createdAt:-1}).populate('offers');
        calculateDiscount(product)
        const cartExist = await Cart.find({userId:req.session.user}).populate('items.productId');
        let userData = null;


        if (req.session.user) {
            userData = await User.findById(req.session.user);
        } else if (req.user) {
            userData = await User.findById(req.user._id);
        }

        res.render('home', {
            user: userData,
            category: category,
            product: product
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

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationMail = async (email, otp) => {
    try {
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<h3>Your one-time password (OTP) for account verification is :</h3>
            <h1> OTP : ${otp}</h1>
            <h3>This OTP is valid for 1 minute and should not be shared with anyone for security reasons. <br>If you did not request this OTP, please ignore this email or contact our support team immediately.</h3>
            <h3>Best regards,</h3>
            <h3>craftaraah</h3>`
        })

        return info.accepted.length > 0;

    } catch (error) {
        console.error("Error in sending Email");
        return false
    }
}

const signup = async (req, res) => {
    try {
        const { name, email, phone, password , referrer} = req.body;
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.render('login', { messageExists: "User already exists... Please Signin..." })
        }

        const otp = generateOtp();

        const emailSent = await verificationMail(email, otp);

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

        // ✅ Check if user already exists
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
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

        const otp = generateOtp();
        req.session.userOTP = otp;
        const emailSent = await verificationMail(email, otp);
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
        const findUser = await User.findOne({ email: email });
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

        calculateDiscount(products);

        const totalProducts = await Product.countDocuments(condition);
        const categories = await Category.find({isDeleted:false,isListed:true});

        let currentPage = parseInt(page) || 1
        let totalPages = Math.ceil(totalProducts/limit)

        res.render('shop-grid',{
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