const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    couponType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    discountAmount: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    maxDiscountAmount: {
        type: Number,
        default: -1,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    usedBy: [{
        userId : {  type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'},
        usedCount: {type : Number, default: 0}
    }],
    autoDeleteAt: {
        type: Date,
        index: { expires: 0 }
    }
},{
    timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;