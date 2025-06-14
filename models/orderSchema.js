const mongoose = require('mongoose');
const {Schema} = mongoose;
const Address = require('./addressSchema');

const orderSchema = new Schema({
    orderId : {
        type : String,
        unique : true,
        required : true
    },
    userId : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    orderedItems : [{
        product : {
            type : Schema.Types.ObjectId,
            ref : 'Product',
            required : true
        },
        quantity : {
            type : Number,
            required : true
        },
        price : {
            type : Number,
            required : true
        },
        isCancelled: {
            type : Boolean,
            default : false
        }
    }],
    totalPrice : {
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        default : 0
    },
    couponCode : {
        type : String,
        default : null
    },
    couponDiscount : {
        type : Number,
        default : 0
    },
    shippingCharge :{
        type : Number,
        default : 0
    },
    tax :{
        type : Number,
        default : 0
    },
    finalAmount : {
        type : Number,
        required : true
    },
    address: {
        addressType: String,
        name: String,
        landMark: String,
        city: String,
        state: String,
        pincode: String,
        phone: String,
        altPhone: String
    },
    paymentMethod : {
        type : String,
        enum : ['COD','Razorpay','wallet'],
        required : true
    },
    paymentDetails : {
        orderId : {
            type : String
        },
        paymentId : {
            type : String
        },
        signature : {
            type : String
        },
        status : {
            type : String,
            enum : ['Pending','Paid','Refunded'],
            default : 'Pending'
        }
    },
    status : {
        type : String,
        enum : ['Ordered','Processing','Shipped','Delivered','Cancelled','Partially Cancelled','Return Requested','Returned'],
        default : 'Ordered'
    },
    returnRequest : {
        status : {
            type : String,
            enum : ['Requested','Approved','Rejected','Completed'],
            default : null
        },
        reason : {
            type : String,
        },
        requestedAt : {
            type : Date,
            default : Date.now()
        }

    },
    refundAmount : {
        type : Number,
        default:0
    }
},{timestamps:true});

const Order = mongoose.model('Order',orderSchema);
module.exports = Order;


