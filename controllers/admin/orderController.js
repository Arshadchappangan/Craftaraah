const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema')
const PDFDocument = require('pdfkit-table');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { removeFromWishlist } = require('../user/productController');
const adminHelpers = require('../../helpers/adminHelpers');
const moment = require('moment')



const isValidDate = (d) => d instanceof Date && !isNaN(d);

function filterbydate(filter,range,startDate,endDate){
  const today = new Date();
if(range === 'today'){
  const start = new Date(today.setHours(0,0,0,0));
  const end = new Date(today.setHours(23,59,59,999));
  filter.createdAt = {$gte:start,$lte:end};
}else if(range === 'week'){
  const start = new Date(today);
  start.setDate(start.getDate()-6);
  filter.createdAt = {$gte:start,$lte:new Date()}
}else if(range === 'month'){
  const start = new Date(today.getFullYear(),today.getMonth(),1);
  const end = new Date(today.getFullYear(),today.getMonth()+1,0);
  filter.createdAt = {$gte:start,$lte:end};
}else if(startDate && endDate){
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (isValidDate(start) && isValidDate(end)) {
  filter.createdAt = { $gte: start, $lte: end };
  }
}
}


const viewOrders = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 8;
      const skip = (page - 1) * limit;
  
      const { status, startDate, endDate, sort, search } = req.query;
  
      const matchStage = {};
  
      if (status && status !== 'All') {
        matchStage.status = status;
      }
  
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }
  
      const searchStage = [];
      if (typeof search === 'string' && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        searchStage.push({
          $match: {
            $or: [
              { orderId: searchRegex },
              { 'user.name': searchRegex }
            ]
          }
        });
      }
  
      const sortStage = {};
      if (sort === 'date_asc') sortStage.createdAt = 1;
      else if (sort === 'date_desc') sortStage.createdAt = -1;
      else if (sort === 'amount_asc') sortStage.finalAmount = 1;
      else if (sort === 'amount_desc') sortStage.finalAmount = -1;
      else if (sort === 'items_asc') sortStage['orderedItems.length'] = 1;
      else if (sort === 'items_desc') sortStage['orderedItems.length'] = -1;
      else sortStage.createdAt = -1;
  
      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        ...searchStage,
        {
          $addFields: {
            'orderedItems.length': { $size: '$orderedItems' } // for sorting by number of items
          }
        },
        { $sort: sortStage },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: skip }, { $limit: limit }]
          }
        }
      ];
  
      const result = await Order.aggregate(pipeline);
  
      const orders = result[0].data;
      const totalOrders = result[0].metadata[0]?.total || 0;
      const totalPages = Math.ceil(totalOrders / limit);
  
      res.render('orders', {
        orders,
        currentPage: page,
        totalPages,
        searchKeyword: search || '',
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
            transactionId: adminHelpers.generateTransactionId(),
            transactionType: "Refund",
            amount: refundAmount,
            date: new Date(),
            order : orderId,
            description: `Refund for the order with order Id : ${order.orderId}`
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