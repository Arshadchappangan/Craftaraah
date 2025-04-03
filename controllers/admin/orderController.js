const Order = require('../../models/orderSchema');
const { removeFromWishlist } = require('../user/productController');


const viewOrders = async(req,res) => {
    try {
        const orders = await Order.find({}).sort({createdAt:-1}).populate('userId');
        res.render('orders',{
            orders:orders
        })
    } catch (error) {
        console.log(error);
        res.redirect('/pageError');
    }
}

const viewDetails = async (req,res) => {
    try {
        const id = req.query.id;
        const order = await Order.findById(id).populate('userId').populate('orderedItems.product');
        res.render('orderDetailsAdmin',{
            order:order
        })
    } catch (error) {
        console.log(error);
        res.redirect('/pageError');
    }
}

const updateOrderStatus = async (req,res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order status updated", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const viewReturns = async (req,res) => {
    try {
        const returns = await Order.find({status:{$in:['Return Requested','Returned']}})
        .sort({'returnRequest.requestedAt':-1})
        .populate('userId');

        res.render('returns',{
            returns : returns
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const approveReturn = async(req,res) => {
    try {
        const id = req.query.id;
        const order = await Order.findById(id);

        order.returnRequest.status = "Approved";
        await order.save();

        res.json({success:true,message:"Return request is approved"})
    } catch (error) {
        console.error(error);
        res.json({success:false,message:"Something went wrong!"})
    }
}

const rejectReturn = async(req,res) => {
    try {
        const id = req.query.id;
        const order = await Order.findById(id);

        order.returnRequest.status = "Rejected";
        await order.save();

        res.json({success:true,message:"Return request is rejected"});
    } catch (error) {
        console.error(error);
        res.json({success:false,message:"Something went wrong!"})
    }
}

module.exports = {
    viewOrders,
    viewDetails,
    updateOrderStatus,
    viewReturns,
    approveReturn,
    rejectReturn
}