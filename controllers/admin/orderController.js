const Order = require('../../models/orderSchema');


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

module.exports = {
    viewOrders,
    viewDetails,
    updateOrderStatus
}