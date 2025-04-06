const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

const createRazorpayOrder = async (req,res) => {
    try {
        const amount = req.body.amount * 100;

        const options = {
            amount,
            currency : "INR",
            receipt : "receipt_"+Date.now()
        };

        const order = await razorpay.orders.create(options)

        res.json({orderId:order.id,key:process.env.RAZORPAY_KEY_ID,amount});

    } catch (error) {
        console.error('Order creation failed : ',error);
        res.status(500).send('Something went wrong');
    }
}


const verifyPayment = (req,res) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const hash = crypto.createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');


        if (hash === razorpay_signature) {
            return res.status(200).json({status: true});
        }else {
            return res.status(400).json({status: false});
        }
}

const orderSuccess = (req,res) => {
    try {
        res.render('orderSuccess');
    } catch (error) {
        console.error('Order success failed : ',error);
        res.status(500).send('Something went wrong');
        
    }
}
const orderFailed = (req,res) => {
    try {
        res.render('orderFailed');
    } catch (error) {
        console.error('Order failed : ',error);
        res.status(500).send('Something went wrong');
        
    }
}

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    orderSuccess,
    orderFailed
}