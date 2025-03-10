const User = require('../../models/userSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const { name } = require('ejs');

const loadHome = async (req, res) => {
    try {
        const user = req.session.user;
        if(user){
            const userData = await User.findOne({_id:user})
            res.render("home",{user:userData});
        }else{
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
        if(!req.session.user){
            res.render('login')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationMail = async (email,otp) => {
    try {
        const transporter = nodeMailer.createTransport({
            service : 'gmail',
            port : 587,
            secure : false,
            requireTLS : true,
            auth : {
                user : process.env.NODEMAILER_EMAIL,
                pass : process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from : process.env.NODEMAILER_EMAIL,
            to : email,
            subject : "Verify your account",
            text : `Your OTP is ${otp}`,
            html : `<h1>Your OTP for Signup to craftaraah : ${otp}</h1>`
        })

        return info.accepted.length > 0;

    } catch (error) {
        console.error("Error in sending Email");
        return false
    }
}

const signup = async (req, res) => {
    try {
        const { name,email,phone,password } = req.body;
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.render('login', { messageExists: "User already exists... Please Signin..." })
        }

        const otp = generateOtp();

        const emailSent = await verificationMail(email,otp);

        if(!emailSent){
            return res.json('Email error')
        }

        req.session.userOTP = otp;
        req.session.userData = {name,email,phone,password}


        console.log("OTP sent" , otp)
        res.render('otp')
        

    } catch (error) {
        console.error("Signup error",error);
        res.redirect('/pageNotFound')
        
    }
}

const securePassword = async(password) => {
    try {
        const passwordHashed = await bcrypt.hash(password,10);
        return passwordHashed;
    } catch (error) {
        
    }
}


const verifyOtp = async (req,res) => {
    try {
        const {otp} = req.body

        if (otp === req.session.userOTP){
            const user = req.session.userData;
            const passwordHashed = await securePassword(user.password);

            const saveUserData = new User({
                name : user.name,
                email : user.email,
                phone : user.phone,
                password : passwordHashed
            })
            await saveUserData.save();
            res.json({success:true,redirectUrl:"/"})
            req.session.user = saveUserData._id;
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
        }
        
    } catch (error) {
        console.error("Error in verifying OTP : ",error);
        res.status(500).json({success:false, message:"an error occured"})
        
    }
}

const resendOtp = async(req,res) => {
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOTP = otp;
        const emailSent = await verificationMail(email,otp);
        if(emailSent){
            console.log("Resend OTP : ",otp);
            res.status(200).json({success:true,message:"OTP Resent successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error resending OTP : ",error);
        res.status(500).json({success:false,message:"Internal Server Error, Please try again"})
        
    }
}

const signin = async(req,res) => {
    try {
        const {email,password} = req.body;
        const findUser = await User.findOne({email:email});
        if(!findUser){
            return res.render('login',{message:"User Not Found"})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:"User is blocked by Admin"})
        }
        
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render('login',{message:"Incorrect Password"})
        }

        req.session.user = {
            _id:findUser._id,
            name : findUser.name,
            email : findUser.email
        };

        res.redirect('/')
    } catch (error) {
        console.error("Login Error : ",error);
        res.render('login',{message:"login failed, please try again"})
    }
}

const logout = async (req,res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log("Session destroy error : ",err);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.error("Logout error : ",error);
        res.redirect('/pageNotFound');
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
    logout
}