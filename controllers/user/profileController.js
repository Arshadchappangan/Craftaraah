const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');
const { reviewSubmission } = require('./productController');


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

const securePassword = async (password) => {
    try {
        const passwordHashed = await bcrypt.hash(password, 10);
        return passwordHashed;
    } catch (error) {

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


const verifyForgotOtp = async (req, res) => {
    try {
        const otp = req.body.otp;
        if (otp === req.session.userOTP) {
            res.json({ success: true, redirectUrl: '/resetPassword' })
        } else {
            res.json({ success: false, message: 'OTP not matching' })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occured, please try again' })
    }
}

const loadResetPassword = async (req, res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const resendForgotOtp = async (req, res) => {
    try {

        const email = req.session.email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        const otp = generateOtp();
        req.session.userOTP = otp;
        const emailSent = await verificationMail(email, otp);
        console.log('mail sent to : ', email)
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

const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.session.user._id;
        const passwordHashed = await securePassword(password);
        await User.findByIdAndUpdate(userId, { $set: { password: passwordHashed } })
        res.redirect('/login')
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}



const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render('profile', { user: userData })
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}



const changeEmail = async (req, res) => {
    try {
        const email = req.query.email;

        if (!req.session.email || req.session.email !== email || !req.session.otpSent) {
            const otp = generateOtp();
            const emailSent = await verificationMail(email, otp);
            if (emailSent) {
                req.session.userOTP = otp;
                req.session.email = email;
                req.session.otpSent = true; 
                console.log('Change Email OTP : ', otp);
            } else {
                return res.json("Email Error");
            }
        }

        res.render('changeEmailOtp'); 

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}


const verifyEmailOtp = async (req,res) => {
    try {
        const otp = req.body.otp;

        if (otp === req.session.userOTP) {
            return res.json({ success: true, redirectUrl: '/newEmailEnter' });
        } else {
            return res.json({ success: false, message: 'Invalid OTP !!!' });
        }

    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}


const loadNewEmailEnter = async (req,res) => {
    try {
        res.render('newEmailEnter',{
            user : req.session.user || null
        })
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const updateEmail = async (req,res) => {
    try {
        const newEmail = req.body.email;
        const userId = req.session.user._id;
        await User.findByIdAndUpdate(userId,{email:newEmail});
        req.session.email = newEmail
        res.redirect('/userProfile')

    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const changePassword = async (req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
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
    userProfile,
    changeEmail,
    verifyEmailOtp,
    loadNewEmailEnter,
    updateEmail,
    changePassword
}