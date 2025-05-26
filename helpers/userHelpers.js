const Coupon = require('../models/couponSchema');
const nodeMailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');


//fuction to generate orderId in a readable format
function generateOrderId() {
    const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${date}-${randomStr}`;
  }


// function to calculate the applied discount from all offers and discounted amount
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
        product.discountedPrice = Math.max(discountedPrice, 0);
    };

    if (Array.isArray(productData)) {
        productData.forEach(product => applyDiscount(product));
    } else {
        applyDiscount(productData);
    }
}


//function to calculate the subtotal,discount,shipping,tax
function calculateCartTotals(findCart) {
    let subtotal = 0;
    findCart.items.forEach(item => {
        subtotal += item.productId.price * item.quantity;
    });

    let discount = 0;
    findCart.items.forEach(item => {
        discount += item.productId.discountedPrice * item.quantity;
    });

    discount = subtotal - discount;

    let shippingCharge = 0;
    if (subtotal < 1000) {
        shippingCharge = 50;
    }

    let tax = 0;
    if (subtotal > 3000) {
        tax = Math.floor(subtotal * 0.12);
    }

    return { subtotal, discount, shippingCharge, tax };
}

//function to apply coupon discout
async function couponDiscountApply(couponCode,subtotal){
    let coupon = null;
    let couponDiscount = 0;
    if(couponCode){
        coupon = await Coupon.findOne({couponCode:couponCode,isDeleted:false,isActive:true});
        if(coupon){
            if(coupon.couponType === 'percentage'){
                couponDiscount = Math.floor((subtotal * coupon.discountAmount) / 100);
            }else if(coupon.couponType === 'fixed'){
                couponDiscount = coupon.discountAmount;
            }
            if(couponDiscount > coupon.maxDiscountAmount){
                couponDiscount = coupon.maxDiscountAmount;
            }
            if(coupon.minPurchaseAmount > subtotal){
                couponDiscount = 0;
            }
        }
    }
    return {subtotal,coupon,couponDiscount}
}

//function to generate six digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//function to send verification mail for OTP
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
        console.error("Error in sending Email",error);
        return false
    }
}

//function to bycript the password
const securePassword = async (password) => {
    try {
        const passwordHashed = await bcrypt.hash(password, 10);
        return passwordHashed;
    } catch (error) {
        console.error("Error in securePassword:", error);
        return null; // 👈 return something meaningful on error
    }
};


//function to generate wallet ID 
const generateWalletId = () => {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    const p3 = Math.floor(1000 + Math.random() * 9000);
    const p4 = Math.floor(1000 + Math.random() * 9000);

    return `${p1} ${p2} ${p3} ${p4}`
}




  module.exports = {
    generateOrderId,
    calculateDiscount,
    calculateCartTotals,
    couponDiscountApply,
    generateOtp,
    verificationMail,
    securePassword,
    generateWalletId
  }