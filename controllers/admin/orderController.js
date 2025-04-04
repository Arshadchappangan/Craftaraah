const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema')
const { removeFromWishlist } = require('../user/productController');


const viewOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        // Extract filters and sorting options from the query parameters
        const { status, startDate, endDate, sort } = req.query;

        let filter = {};
        
        // Filter by Order Status
        if (status && status !== 'All') {
            filter.status = status;
        }

        // Filter by Date Range
        if (startDate && endDate) {
            filter.createdAt = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        } else if (startDate) {
            filter.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            filter.createdAt = { $lte: new Date(endDate) };
        }

        // Sorting options
        let sortOption = {};
        if (sort === 'date_asc') sortOption.createdAt = 1;
        else if (sort === 'date_desc') sortOption.createdAt = -1;
        else if (sort === 'amount_asc') sortOption.finalAmount = 1;
        else if (sort === 'amount_desc') sortOption.finalAmount = -1;
        else if (sort === 'items_asc') sortOption.orderedItems = 1;
        else if (sort === 'items_desc') sortOption.orderedItems = -1;
        else sortOption.createdAt = -1;  // Default: Newest first

        // Fetch orders with filters, sorting, and pagination
        const totalOrders = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('userId')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('orders', {
            orders,
            currentPage: page,
            totalPages,
            searchKeyword: '',
            status,
            startDate,
            endDate,
            sort
        });

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
};




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

const refund = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId);

        const userId = order.userId;
        let wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            let walletId = ''
            const p1 = Math.floor(1000 + Math.random() * 9000);
            const p2 = Math.floor(1000 + Math.random() * 9000);
            const p3 = Math.floor(1000 + Math.random() * 9000);
            const p4 = Math.floor(1000 + Math.random() * 9000);

            wallet = new Wallet({ 
                walletId : walletId+p1+' '+p2+' '+p3+' '+p4,
                userId:user._id, 
                balance: 0, 
                transactions: [] 
            });

            await wallet.save();
        }

        const refundAmount = order.finalAmount; 
        wallet.balance += refundAmount;
        wallet.transactions.push({
            transactionType: "Refund",
            amount: refundAmount,
            date: new Date(),
            description: `Refund for the order with order Id : ${orderId}`
        });

        await wallet.save();

        order.returnRequest.status = "Completed";
        order.status = "Returned";
        await order.save();
        
        res.status(200).json({success:true, message: "Refund processed successfully"});
    } catch (error) {
        console.error("Error processing refund:", error);
        res.status(500).json({success:false, message: "Internal server error"});
    }
};



  
        


module.exports = {
    viewOrders,
    viewDetails,
    updateOrderStatus,
    viewReturns,
    approveReturn,
    rejectReturn,
    refund
}