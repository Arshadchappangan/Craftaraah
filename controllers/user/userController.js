const User = require('../../models/userSchema')
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();

const loadHome = async (req, res) => {
    try {
        return res.render("home");
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
        res.render('login')
    } catch (error) {
        console.log('Login page not found');
        res.status(500).send('Server Error')
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
        const { email,password } = req.body;
        const existingUser = await User.find({ email })
        if (existingUser) {
            res.render('login', { message: "User already exists" })
        }

        const otp = generateOtp();

        const emailSent = await verificationMail(email,otp);

        if(!emailSent){
            return res.json('Email error')
        }

        req.session.userOTP = otp;
        req.session.userData = {email,password}

        // res.render('otp');
        console.log("OTP sent" , otp)

    } catch (error) {
        console.error("Signup error",error);
        // res.redirect('/pageNotFound')
        
    }
}

module.exports = {
    loadHome,
    pageNotFound,
    loadLogin,
    signup
}