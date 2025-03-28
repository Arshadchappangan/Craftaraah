const mongoose = require('mongoose');
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');
const Address = require('./addressSchema');

const orderSchema = new Schema({
    orderId : {
        type : String,
        default : () => uuidv4(),
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
    finalAmount : {
        type : Number,
        required : true
    },
    address : {
        type : Schema.Types.ObjectId,
        ref : 'Address',
        required : true
    },
    paymentMethod : {
        type : String,
        enum : ['COD','Card','Net Banking','UPI'],
        required : true
    },
    status : {
        type : String,
        enum : ['Ordered','Processing','Shipped','Delivered','Cancelled','Return Requested','Returned'],
        default : 'Ordered'
    },
    createdAt : {
        type : Date,
        default : Date.now()
    }
})

const Order = mongoose.model('Order',orderSchema);
module.exports = Order;


