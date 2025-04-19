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

const loadSalesPage = async (req,res) => {
  try {
    const {range,startDate,endDate} = req.query;
    
    req.session.range = range;
    req.session.start = startDate;
    req.session.end = endDate;

    let filter = {}  
    filterbydate(filter,range,startDate,endDate)

    const orders = await Order.find(filter).populate('userId').sort({createdAt:-1})

    let totalRevenue = 0;
    let totalDiscount = 0;
    let couponDeduction = 0

    orders.forEach(order => {
      if(order.status !== 'Cancelled' && order.status !== 'Returned'){
        totalRevenue += order.finalAmount;
        totalDiscount += order.discount;
        couponDeduction += order.couponDiscount
      }
    });

    const dailyStatsMap = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('en-GB');
      if (!dailyStatsMap[date]) {
        dailyStatsMap[date] = {
          revenue: 0,
          orders: 0
        };
      }
    dailyStatsMap[date].revenue += order.finalAmount;
    dailyStatsMap[date].orders += 1;
  });
  const chartLabels = Object.keys(dailyStatsMap);
  const chartRevenue = chartLabels.map(date => dailyStatsMap[date].revenue);
  const chartOrders = chartLabels.map(date => dailyStatsMap[date].orders);


    res.render('salesReport',{
      orders,
      totalRevenue,
      totalDiscount,
      couponDeduction,
      range,
      startDate,
      endDate,
      chartLabels,
      chartOrders,
      chartRevenue
    })

  } catch (error) {
    console.error(error)
    res.redirect('/pageError')
  }
}


const downloadSalesPdf = async(req,res) => {
  try {
    const range = req.session.range;
    const startDate = req.session.start;
    const endDate = req.session.end;

    let filter = {};
    filterbydate(filter,range,startDate,endDate);

    const orders = await Order.find(filter).populate('userId').sort({createdAt:-1})

    let totalRevenue = 0;
    let totalDiscount = 0;
    let couponDeduction = 0

    orders.forEach(order => {
      if(order.status !== 'Cancelled' && order.status !== 'Returned'){
        totalRevenue += order.finalAmount;
        totalDiscount += order.discount;
        couponDeduction += order.couponDiscount
      }
    });

    const doc = new PDFDocument({margin:30,size:'A4'});
    res.setHeader('Content-type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename = sales_report.pdf');

    doc.pipe(res);

    doc.fontSize(18).text("Sales Report",{align:'center'});
    doc.moveDown();

    if(startDate && endDate){
      doc
      .fontSize(12)
      .text(`Report period  : ${new Date(startDate).toISOString().split('T')[0]} to ${new Date(endDate).toISOString().split('T')[0]}`)
    }else if(range){
      doc
      .fontSize(12)
      .text(`Report Range   : ${range.charAt(0).toUpperCase() + range.slice(1)}`)
    }else{
      doc
      .fontSize(12)
      .text(`Report Range   : Overall`)
    }

    doc
    .text(`Total Orders     : ${orders.length}`)
    .text(`Total Revenue    : ${totalRevenue}`)
    .text(`Total Discount   : ${totalDiscount}`)
    .text(`Coupon deduction : ${couponDeduction || 0}`)
    .moveDown();

    const table = {
      headers : [
        "Order ID",
        "Date",
        "Total price",
        "Discount",
        "Coupon Discount",
        "Final Amount"
      ],
      rows : orders.map((order) => [
        order.orderId,
        order.createdAt.toISOString().split("T")[0],
        order.totalPrice,
        order.discount,
        order.couponDiscount,
        order.finalAmount
      ])
    }

    await doc.table(table,{
      prepareHeader : () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow : (row,i) => doc.font('Helvetica').fontSize(10),
      columnSpacing : 5,
      padding : 5,
      columnsSize : [140,80,75,75,75,75]
    })

    doc.end()

  } catch (error) {
    console.error(error)
    res.redirect('pageError')
  }
}


const downloadSalesExcel = async (req,res) => {
  try {
    const range = req.session.range;
    const startDate = req.session.start;
    const endDate = req.session.end;

    let filter = {};
    filterbydate(filter,range,startDate,endDate);

    const orders = await Order.find(filter).populate('userId').sort({createdAt:-1})

    let totalRevenue = 0;
    let totalDiscount = 0;
    let couponDeduction = 0

    orders.forEach(order => {
      if(order.status !== 'Cancelled' && order.status !== 'Returned'){
        totalRevenue += order.finalAmount;
        totalDiscount += order.discount;
        couponDeduction += order.couponDiscount
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report')

    worksheet.columns = [
      {header:"Order ID",key:"orderId",width:30},
      {header:"Date",key:"date",width:25},
      {header:"Total price",key:"totalPrice",width:25},
      {header:"Discount",key:"discount",width:25},
      {header:"Coupon discount",key:"couponDiscount",width:25},
      {header:"Final amount",key:"finalAmount",width:25}
    ]

    orders.forEach((order) => {
      worksheet.addRow({
        orderId : order.orderId,
        date : order.createdAt.toISOString().split('T')[0],
        totalPrice : order.totalPrice,
        discount : order.discount,
        couponDiscount : order.couponDiscount || 0,
        finalAmount : order.finalAmount
      })
    })

    const totalRow = worksheet.addRow({
      date: "",
      orderId: "TOTAL",
      totalPrice: { formula: `SUM(C2:C${orders.length + 1})` },
      discount: { formula: `SUM(D2:D${orders.length + 1})` },
      couponDiscount: { formula: `SUM(E2:E${orders.length + 1})` },
      finalAmount: { formula: `SUM(F2:F${orders.length + 1})` },
    });
  
    // Style the total row
    totalRow.font = { bold: true };
    totalRow.getCell("B").alignment = { horizontal: "right" };
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "double" },
      };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error)
    res.redirect('/pageError')
  }
}


const salesOverviewData = async (req,res) => {
  try {
    const range = req.query.range || 'year';

    let match = {status:{$nin:['Cancelled','Returned']}};
    let dateFormat = null;

    if(range === 'week'){
      match.createdAt = {$gte:moment().startOf('week').toDate()};
      dateFormat = '%d %B';
    }else if(range === 'month'){
      match.createdAt = {$gte:moment().startOf('month').toDate()};
      dateFormat = '%d %B';
    }else if(range === 'year'){
      match.createdAt = { $gte: moment().startOf('year').toDate() };
      dateFormat = '%B %Y';
    }

    const data = await Order.aggregate([
      {$match:match},
      {$group:{
        _id:{$dateToString:{format:dateFormat,date:"$createdAt"}},
        revenue : {$sum:"$finalAmount"},
        salesCount : {$sum:1}
      }},
      {$sort:{_id:1}}
    ]);

    const labels = data.map(d => d._id);
    const revenues = data.map(d => d.revenue);
    const salesCount = data.map(d => d.salesCount);

    res.json({labels,revenues,salesCount})

  } catch (error) {
    console.error(error);
    res.status(500).json({error:"Something went wrong"})
  }
}
  
        


module.exports = {
    viewOrders,
    viewDetails,
    updateOrderStatus,
    viewReturns,
    approveReturn,
    rejectReturn,
    refund,
    loadSalesPage,
    downloadSalesPdf,
    downloadSalesExcel,
    salesOverviewData
}