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


const loadShopPage = async (req, res) => {
    try {
        const user = req.session.user;
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
        }

        const categories = await Category.find({ isListed: true, isDeleted: false });
        const categoryIds = categories.map(cat => cat._id);

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments({
            isDeleted: false,
            isBlocked: false,
            category: { $in: categoryIds }
        });
        const totalPages = Math.ceil(totalProducts / limit);

        let filteredProducts = await Product.find({
            isDeleted: false,
            isBlocked: false,
            category: { $in: categoryIds }
        })
        .populate('offers') // Ensure offers are populated
        .skip(skip)
        .limit(limit);

        calculateDiscount(filteredProducts);

        if (userData) {
            userData.savedFilteredProducts = filteredProducts.map(p => p._id);
            await userData.save();
        }

        res.render('shop-grid', {
            user: userData,
            products: filteredProducts,
            category: categories,
            totalPages,
            currentPage: page
        });

    } catch (error) {
        console.log("Shop page error: ", error.message);
        res.redirect('/pageNotFound');
    }
};



const filterProducts = async (req,res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const search = req.session.searchKeyword || '';
        const findCategory = category ? await Category.findOne({_id:category}) : null; 



        let findProducts = await Product.find({
            productName: { $regex: '.*' + search + '.*', $options: "i" },
            isDeleted : false,
            isBlocked : false,
            category : findCategory._id
        }).populate('offers').lean();

        calculateDiscount(findProducts)

        findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        const categories = await Category.find({isListed:true})

        let itemsPerPage = 9
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        let currentProduct = findProducts.slice(startIndex,endIndex)

        let userData = null;
        if(user){
            userData = await User.findOne({_id:user});
            if(userData){
                const searchEntry = {
                    category : findCategory ? findCategory._id : null,
                    searchedOn : new Date()
                }
                userData.searchHistory.push(searchEntry)

                const filteredProductIds = currentProduct.map(p => p._id);
                userData.savedFilteredProducts = filteredProductIds;

                await userData.save();
            }
        }


        res.render('shop-grid',{
            user : userData,
            products : currentProduct,
            category : categories,
            totalPages,
            currentPage,
            selectedCategory : category || null,

        })
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}


const filterPrice = async (req,res) => {
    try {
        const user = req.session.user;
        const search = req.session.searchKeyword || '';
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true}).lean();
        const {gt,lt} = req.query

        let products = await Product.find({
            productName: { $regex: '.*' + search + '.*', $options: "i" },
            isBlocked:false,
            isDeleted:false
        }).populate('offers')

        calculateDiscount(products)

        let findProducts = products.filter(product => {
            const discountedPrice = parseFloat(product.discountedPrice);
            return discountedPrice > parseFloat(gt) && discountedPrice <= parseFloat(lt);
        });

        findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))

        let itemsPerPage = 9
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        let currentProduct = findProducts.slice(startIndex,endIndex)

        const filteredProductIds = currentProduct.map(p => p._id);
        userData.savedFilteredProducts = filteredProductIds;

        await userData.save();

        res.render('shop-grid',{
            user : userData,
            products : currentProduct,
            category : categories,
            totalPages,
            currentPage

        })
        
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}

const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user }).populate('savedFilteredProducts');
        const search = req.body.query;
        req.session.searchKeyword = search;
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());

        if (search === '') {
            userData.savedFilteredProducts = [];
            await userData.save();
            return res.redirect('/shop');
        }

        let searchResult = [];

        if (userData.savedFilteredProducts && userData.savedFilteredProducts.length > 0) {
            searchResult = userData.savedFilteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            searchResult = await Product.find({
                productName: { $regex: '.*' + search + '.*', $options: "i" },
                isBlocked: false,
                category: { $in: categoryIds }
            }).populate('offers');
        }

        calculateDiscount(searchResult)

        searchResult.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let itemsPerPage = 9;
        let currentPage = parseInt(req.query.page) || 1;
        let totalPages = Math.ceil(searchResult.length / itemsPerPage);
        let currentProduct = searchResult.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        res.render('shop-grid', {
            user: userData,
            products: currentProduct,
            category: categories,
            totalPages,
            currentPage
        });

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
};


const sortProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const sortBy = req.query.by || 'createdAt';
        const type = parseInt(req.query.type) || -1;
        const userData = await User.findOne({ _id: user }).populate('savedFilteredProducts');
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        let sortedProducts;

        if (userData.savedFilteredProducts && userData.savedFilteredProducts.length > 0) {
            sortedProducts = [...userData.savedFilteredProducts];
            sortedProducts.sort((a, b) =>
                type === 1 ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]
            );
        } else {
            sortedProducts = await Product.find({
                isBlocked: false,
                category: { $in: categoryIds }
            }).sort({ [sortBy]: type }).lean();
        }

        const totalPages = Math.ceil(sortedProducts.length / limit);
        sortedProducts = sortedProducts.slice(skip, skip + limit);

        res.render('shop-grid', {
            user: userData,
            products: sortedProducts,
            category: categories,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
};





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
    loadShopPage,
    filterPrice,
    filterProducts,
    searchProducts,
    sortProducts
}