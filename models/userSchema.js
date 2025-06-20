const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    phone : {
        type : String,
        required : false,
        unique : false,
        sparse : true,
        default : null
    },
    photo : {
        type : String,
        default : '/uploads/user-images/profile_img.png'
    },
    googleId : {
        type : String,
        unique : true
    },
    password : {
        type : String,
        required : false
    },
    isBlocked : {
        type : Boolean,
        default : false
    },
    isAdmin : {
        type : Boolean,
        default : false
    },
    cart : [{
        type : Schema.Types.ObjectId,
        ref : "cart"
    }],
    walletId : {
        type : Schema.Types.ObjectId,
        ref : "wallet"
    },
    wishlist : [{
        type : Schema.Types.ObjectId,
        ref : "wishlist"
    }],
    orders : [{
        type : Schema.Types.ObjectId,
        ref : "orders"
    }],
    referral : {
        link : {
            type : String,
            unique : true
        },
        isRedeemed : {
            type : Boolean,
            default : false
        }
    }
},{
    timestamps : true
})

const User = mongoose.model("User",userSchema);
module.exports = User;