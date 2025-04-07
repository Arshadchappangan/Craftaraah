const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');

const loadCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });
        res.render('coupons', { coupons });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const addCoupon = async (req, res) => {
    try {
        let { code, type, discount, minAmount, maxDiscount, usageLimit, expiryDate  } = req.body;

        const existing = await Coupon.findOne({ couponCode: code });
        if (existing) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }

        expiryDate = new Date(expiryDate);
        const formatted = expiryDate.toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });



        const coupon = new Coupon({
            couponCode:code, 
            couponType:type, 
            discountAmount:discount, 
            minPurchaseAmount:minAmount, 
            maxDiscountAmount:maxDiscount || 0, 
            usageLimit:usageLimit, 
            expiryDate:formatted
        });

        await coupon.save();
         return res.status(200).json({message: 'Coupon added successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to add coupon' });
    }
}


module.exports = {
    loadCoupons,
    addCoupon
}