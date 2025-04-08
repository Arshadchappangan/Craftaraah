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
    discountAmount: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    maxDiscountAmount: {
        type: Number,
        default: 0,
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
},{
    timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;