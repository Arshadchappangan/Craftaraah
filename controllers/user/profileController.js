const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Address = require('../../models/addressSchema')
const env = require('dotenv').config();
const session = require('express-session')
const bcrypt = require('bcrypt');
const { name } = require('ejs');
const category = require('../../models/categorySchema');
const { reviewSubmission } = require('./productController');
const { use } = require('passport');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const userHelper = require('../../helpers/userHelpers')


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
            const otp = userHelper.generateOtp()
            const emailSent = await userHelper.verificationMail(email, otp)
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
            req.session.user = await User.findOne({ email: req.session.email });
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

        const otp = userHelper.generateOtp();
        req.session.userOTP = otp;
        const emailSent = await userHelper.verificationMail(email, otp);
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
        const passwordHashed = await userHelper.securePassword(password);
        await User.findByIdAndUpdate(userId,{ password: passwordHashed })
        req.session.user = null;
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
        const email = req.session.user.email

        if (!req.session.email || req.session.email !== email || !req.session.otpSent) {
            const otp = userHelper.generateOtp();
            const emailSent = await userHelper.verificationMail(email, otp);
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

const myAddresses = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.locals.user = userData
        const userAddress = await Address.find({userId:userData._id})
        res.render('myAddresses', { userAddress: userAddress })
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const loadAddAddress = async (req,res) =>{
    try {
        const source = req.query.source;
        const user = req.session.user;
        res.render('addAddress',{user:user,source:source});
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const addAddress = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});

        const {addressType,name,city,landMark,state,pincode,phone,altPhone,isDefault,source} = req.body;

        const userAddress = await Address.findOne({userId:userId});

        if(userAddress && isDefault){
            await Address.updateOne({userId:userId},{$set : {"address.$[].isDefault" : false}})
        }

        if(!userAddress){
            const newAddress = new Address({
                userId : userId,
                address : [{
                    addressType,
                    name,
                    city,
                    landMark,
                    state,
                    pincode,
                    phone,
                    altPhone,
                    isDefault : isDefault ? true : false
                }]
            });
            await newAddress.save();
        }else{
            userAddress.address.push({
                addressType,
                name,
                city,
                landMark,
                state,
                pincode,
                phone,
                altPhone,
                isDefault : isDefault ? true : false
            })
            await userAddress.save();
        }

        if(source === 'checkout'){
            res.redirect('/checkout');
        }else if(source === 'myAddresses'){
            res.redirect('/myAddresses')
        }
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const loadEditAddress = async (req,res) => {
    try {
        const addressId = req.query.id;
        const source = req.query.source;
        const user = req.session.user;
        const currentAddress = await Address.findOne({
            "address._id" : addressId
        });

        if(!currentAddress){
            return res.redirect('/pageNotFound')
        }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString();
        })

        if(!addressData){
           return res.redirect('/pageNotFound');
        }

        console.log(addressData)
        res.render('editAddress',{
            address:addressData,
            user : user,
            source : source
        })
    } catch (error) {
        console.error('error in edit address : ',error);
        res.redirect('/pageNotFound')
    }
}


const editAddress = async (req,res) => {
    try {
        const data = req.body;
        const user = req.session.user;
        const findAddress = await Address.findOne({
            "address._id" : data.id
        })

        if(!findAddress){
           return res.redirect('/pageNotFound')
        }

        if(findAddress && data.isDefault){
            await Address.updateOne({userId:user._id},{$set : {"address.$[].isDefault" : false}})
        }

        await Address.updateOne({
            "address._id" : data.id},
            {$set : {
                "address.$" : {
                    _id : data.id,
                    addressType : data.addressType,
                    name : data.name,
                    city : data.city,
                    landMark : data.landMark,
                    state : data.state,
                    pincode : data.pincode,
                    phone : data.phone,
                    altPhone : data.altPhone,
                    isDefault : data.isDefault ? true : false
                }
            }}
        )
        if(data.source === 'checkout'){
            res.redirect('/checkout');
        }else if(data.source === 'myAddresses'){
            res.redirect('/myAddresses');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const deleteAddress = async (req,res) => {
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            return res.status(404).send("Address not found");
        }
        await Address.updateOne({
            "address._id":addressId
        },
        {
            $pull : {
                address : {
                    _id : addressId
                }
            }
        }
    )

    res.redirect('/myAddresses')
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const myOrders = async (req, res) => {
    try {
        const user = req.session.user;
        let searchQuery = req.query.search?.trim().toLowerCase() || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const query = { userId: user._id };

        let orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit) 
            .populate('orderedItems.product');

        if (searchQuery.length > 0) {
            orders = orders.filter(order =>
                order.orderedItems.some(item =>
                    item.product?.productName?.toLowerCase().includes(searchQuery)
                ) ||
                order.orderId?.toLowerCase().includes(searchQuery) ||
                order.status?.toLowerCase().includes(searchQuery)
            );

            // Re-sort filtered results
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('myOrders', {
            user,
            orders : orders,
            searchQuery,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Something went wrong");
    }
};



const loadWallet = async (req, res) => {
    try {
        const user = req.session.user;
        const page = req.query.page || 1;
        const limit = 15;
        const skip = (page - 1) * limit;
        let wallet = await Wallet.findOne({ userId: user._id });

        // Create wallet if not found
        if (!wallet) {

            wallet = new Wallet({ 
                walletId: userHelper.generateWalletId(),
                userId: user._id, 
                balance: 0, 
                transactions: [] 
            });

            await wallet.save();
        }

        if (wallet && wallet.transactions.length > 0) {
            wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const paginatedTransactions = wallet.transactions.slice(skip, skip + limit);


        res.render('wallet', {
            user: user,
            wallet: wallet,
            transactions: paginatedTransactions,
            currentPage: parseInt(page),    
            totalPages: totalPages
        });

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const uploadProfilePhoto = async(req,res) => {
    try {
        const user = req.session.user;
        const photoPath = "/uploads/user-images/"+req.file.filename;
        await User.updateOne({_id:user._id},{$set:{photo:photoPath}});
        res.redirect('/userProfile')
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const updateProfileInfo = async (req,res) => {
    try {
        const user = req.session.user;
        const {name,phone} = req.body
        await User.updateOne({_id:user._id},{$set:{name:name,phone:phone}});
        res.json({success:true})
    } catch (error) {
        console.error(error)
        res.json({success:false})
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
    changePassword,
    myAddresses,
    loadAddAddress,
    addAddress,
    loadEditAddress,
    editAddress,
    deleteAddress,
    myOrders,
    loadWallet,
    uploadProfilePhoto,
    updateProfileInfo
}