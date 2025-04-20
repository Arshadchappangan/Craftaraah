const razorpay = require('../../config/razorpay');
const crypto = require('crypto');
const Wallet = require('../../models/walletSchema')
const adminHelper = require('../../helpers/adminHelpers')


const createRazorpayOrder = async (req,res) => {
    try {

        console.log('inside the razorpay order create function')

        const amount = req.body.amount * 100;
        
        const options = {
            amount,
            currency : "INR",
            receipt : "receipt_"+Date.now()
        };
    
        const order = await razorpay.orders.create(options)
    
        console.log('order created')
        res.json({orderId:order.id,key:process.env.RAZORPAY_KEY_ID,amount});

    } catch (error) {
        console.error('Order creation failed : ',error);
        res.status(500).send('Something went wrong');
    }
}


const verifyPayment = (req,res) => {
    try {

        console.log('verify payment function')

    const { razorOrderId, paymentId, signature } = req.body;

        const secret = process.env.RAZORPAY_KEY_SECRET;
        const hash = crypto.createHmac('sha256', secret)
        .update(razorOrderId + "|" + paymentId)
        .digest('hex');

        if (hash === signature) {
            return res.status(200).json({status: true});
        }else {
            console.log('Payment verification failed');
            return res.redirect('/orderFailure');
        }

}catch (error) {
        console.error('Payment verification failed : ',error);
        res.redirect('/orderFailure');
    }
}

const topupWallet = async (req,res) => {
    try {
        const amount = req.body.amount
        const user = req.session.user;
        
        const wallet = await Wallet.findOne({userId:user._id})

        wallet.balance += amount
        wallet.transactions.push({
            transactionType: 'Topup',
            transactionId: adminHelper.generateTransactionId(),
            amount: amount,
            date: new Date(),
            description:'Wallet topup'
        });

        await wallet.save()

        res.json({success:true})

    } catch (error) {
        console.log(error);
        res.json({success:false})
    }
}



module.exports = {
    createRazorpayOrder,
    verifyPayment,
    topupWallet
}