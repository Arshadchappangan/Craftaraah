const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');

const loadHome = async (req, res) => {
    try {
        const user = req.session.user;
        if (user) {
            const userData = await User.findOne({ _id: user })
            res.render("home", { user: userData });
        } else {
            return res.render('home');
        }

    } catch (error) {
        console.log("Home page not found");
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
            res.render('login')
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
        const { name, email, phone, password } = req.body;
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.render('login', { messageExists: "User already exists... Please Signin..." })
        }

        const otp = generateOtp();

        const emailSent = await verificationMail(email, otp);

        if (!emailSent) {
            return res.json('Email error')
        }

        req.session.userOTP = otp;
        req.session.userData = { name, email, phone, password }


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
        const { otp } = req.body

        if (otp === req.session.userOTP) {
            const user = req.session.userData;
            const passwordHashed = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHashed
            })
            await saveUserData.save();
            res.json({ success: true, redirectUrl: "/" })
            req.session.user = saveUserData._id;
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" })
        }

    } catch (error) {
        console.error("Error in verifying OTP : ", error);
        res.status(500).json({ success: false, message: "an error occured" })

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

const loadForgotPassword = async (req, res) => {
    try {
        res.render('forgot-password')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const forgotEmailVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email })
        if (user) {
            const otp = generateOtp()
            const emailSent = await verificationMail(email, otp)
            if (emailSent) {
                req.session.userOTP = otp;
                req.session.email = email;
                res.render('forgotOtp')
                console.log("OTP : ", otp)
            } else {
                res.json({ success: false, message: "Failed to send OTP, please try again" })
            }
        } else {
            res.render('forgot-password', { message: "User with this email does not exist" })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const verifyForgotOtp = async (req,res) => {
    try {
        const otp = req.body.otp;
        if(otp === req.session.userOTP){
            res.json({success:true,redirectUrl:'/resetPassword'})
        }else{
            res.json({success:false,message:'OTP not matching'})
        }
    } catch (error) {
        res.status(500).json({success:false,message:'An error occured, please try again'})
    }
}

const loadResetPassword = async(req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const resendForgotOtp = async(req,res) => {
    try {

        const email = req.session.email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        const otp = generateOtp();
        req.session.userOTP = otp;
        const emailSent = await verificationMail(email, otp);
        console.log('mail sent to : ',email)
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

const resetPassword = async (req,res) => {
    try {
        const {password} = req.body;
        const email = req.session.email;
        const passwordHashed = await securePassword(password);
        await User.updateOne({email:email},{$set:{password:passwordHashed}})
        res.redirect('/login')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadShopPage = async (req,res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user})
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map(category => category._id.toString())
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page-1) * limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds}
        }).sort({createdAt:-1}).skip(skip).limit(limit);

        const countProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds}
        })

        const totalPages = Math.ceil(countProducts/limit);

        const categoryWithIds = categories.map(category => ({_id:category.id,name:category.name})); 

        res.render('shop-grid',{
            user:userData,
            products : products,
            category : categoryWithIds,
            totalProducts : countProducts,
            currentPage : page,
            totalPages : totalPages
        })
    } catch (error) {
        res.redirect('pageNotFound')
    }
}

const filterProducts = async (req,res) => {
    try {
        const user = req.session.user;
        const category = req.query.category
        const findCategory = category ? await Category.findOne({_id:category}) : null; 
        let findProducts = await Product.find({
            isBlocked : false,
            category : findCategory._id
        }).lean();

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
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProduct

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
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true}).lean();
        const {gt,lt} = req.query
        let findProducts = await Product.find({
            salePrice: {$gt:gt,$lt:lt},
            isBlocked:false
        }).lean()

        findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))

        let itemsPerPage = 9
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length/itemsPerPage);
        let currentProduct = findProducts.slice(startIndex,endIndex)

        req.session.filteredProducts = currentProduct;

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

const searchProducts = async (req,res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const search = req.body.query;
        const categories = await Category.find({isListed:true}).lean();
        const categoryIds = categories.map(category => category._id.toString());

        let searchResult = [];

        if(req.session.filteredProducts && req.session.filteredProducts.length > 0){
            searchResult = req.session.filteredProducts.filter(product => {
               return product.productName.toLowerCase().includes(search.toLowerCase())
            })
        }else{
            searchResult = await Product.find({
                productName : {$regex:'.*'+search+'.*',$options:"i"},
                isBlocked : false,
                category : {$in:categoryIds}
            })
        }

        searchResult.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        let itemsPerPage = 9
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length/itemsPerPage);
        let currentProduct = searchResult.slice(startIndex,endIndex)

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

const sortProducts = async (req,res) => {
    try {
        const user = req.session.user;
        const sortBy = req.query.by || 'createdAt';
        const type = parseInt(req.query.type) || -1;
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map(category => category._id.toString())
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page-1) * limit;
        let products;
        let sortedProducts = req.session.filteredProducts ? [...req.session.filteredProducts] : [];
        
        if(req.session.filteredProducts && req.session.filteredProducts.length > 0){
            type===1 ? sortedProducts.sort((a,b) => a[sortBy] - b[sortBy]) : sortedProducts.sort((a,b) => b[sortBy] - a[sortBy])
        }else{
            products = await Product.find({
                isBlocked : false,
                category:{$in:categoryIds}
            }).sort({[sortBy]:type}).lean()
        }

        sortedProducts = sortedProducts.length > 0 ? sortedProducts : products;
        

        let itemsPerPage = 9
        let currentPage = parseInt(req.query.page) || 1;
        let totalPages = Math.ceil(sortedProducts.length/itemsPerPage);

        sortedProducts = sortedProducts.slice(skip, skip + limit);

        res.render('shop-grid',{
            user : userData,
            products : sortedProducts,
            category : categories,
            totalPages,
            currentPage,
        })
    } catch (error) {
        console.log(error)
        res.redirect('pageNotFound')
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
    loadForgotPassword,
    forgotEmailVerify,
    verifyForgotOtp,
    loadResetPassword,
    resendForgotOtp,
    resetPassword,
    loadShopPage,
    filterProducts,
    filterPrice,
    searchProducts,
    sortProducts
}