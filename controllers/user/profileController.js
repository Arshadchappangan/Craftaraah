const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');


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


const userProfile = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render('profile',{user:userData})
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    loadForgotPassword,
    forgotEmailVerify,
    verifyForgotOtp,
    loadResetPassword,
    resendForgotOtp,
    resetPassword,
    userProfile
}