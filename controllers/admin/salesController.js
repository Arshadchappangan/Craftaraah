const Order = require('../../models/orderSchema');
const adminHelper = require('../../helpers/adminHelpers')
const moment = require('moment');
const ExcelJS = require('exceljs')

const loadSalesPage = async (req,res) => {
    try {

      let {startDate,endDate,range,pageProduct = 1,pageCategory = 1} = req.query;

      let limit = 5;

      pageProduct = parseInt(pageProduct);
      pageCategory = parseInt(pageCategory);

      const productSkip = (pageProduct - 1) * limit;
      const categorySkip = (pageCategory - 1) * limit;

        const orders = await Order.find({})

        let currentMatchStage = null;
        let pastMatchStage = null;
        let saleCount = null;

        if(!range) range = 'year'

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffTime = end.getTime() - start.getTime();
          const pastStart = new Date(start.getTime() - diffTime);
          const pastEnd = new Date(start); 
        
          currentMatchStage = adminHelper.filterRange({ startDate: start, endDate: end });
          pastMatchStage = adminHelper.filterRange({ startDate: pastStart, endDate: pastEnd });
        
          saleCount = await adminHelper.getCounts(currentMatchStage, pastMatchStage);
        } else if(range === 'year'){

          currentMatchStage = adminHelper.filterRange({type:'year',year: new Date().getFullYear()});
          pastMatchStage = adminHelper.filterRange({type:'year',year:new Date().getFullYear() - 1});
          saleCount = await adminHelper.getCounts(currentMatchStage,pastMatchStage);
        } else if (range === 'month') {
          const now = new Date();
          const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);  
        
          currentMatchStage = adminHelper.filterRange({ type: 'month', month: currentMonth });
          pastMatchStage = adminHelper.filterRange({ type: 'month', month: lastMonth });
        
          saleCount = await adminHelper.getCounts(currentMatchStage, pastMatchStage);
        } else if(range === 'week'){
          currentMatchStage = adminHelper.filterRange({type:'week',week: new Date()});
          pastMatchStage = adminHelper.filterRange({type:'week',week: new Date(new Date().setDate(new Date().getDate() - 6))
          });
          saleCount = await adminHelper.getCounts(currentMatchStage,pastMatchStage)
        }

        let saleGrowthProduct = [];
        let saleGrowthCategory = [];
        let revenueGrowthProduct = [];
        let revenueGrowthCategory = [];

        for (let i = 0; i < saleCount.currentProductCount.length; i++) {
          const currentSale = saleCount.currentProductCount[i]?.totalQuantitySold || 0;
          const pastSale = saleCount.pastProductCount[i]?.totalQuantitySold || 0;
          const currentRevenue = saleCount.currentProductCount[i]?.totalPrice || 0;
          const pastRevenue = saleCount.pastProductCount[i]?.totalPrice || 0;
          saleGrowthProduct[i] = currentSale - pastSale;
          revenueGrowthProduct[i] = currentRevenue - pastRevenue;
        }

        for(let i=0; i<saleCount.currentCategoryCount.length;i++){
          const currentSale = saleCount.currentCategoryCount[i]?.totalQuantitySold || 0;
          const pastSale = saleCount.pastCategoryCount[i]?.totalQuantitySold || 0;
          const currentRevenue = saleCount.currentCategoryCount[i]?.totalPrice || 0;
          const pastRevenue = saleCount.pastCategoryCount[i]?.totalPrice || 0;
          saleGrowthCategory[i] = currentSale - pastSale;
          revenueGrowthCategory[i] = currentRevenue - pastRevenue;
        }
        
        saleCount.saleGrowthProduct = saleGrowthProduct;
        saleCount.saleGrowthCategory = saleGrowthCategory;
        saleCount.revenueGrowthProduct = revenueGrowthProduct;
        saleCount.revenueGrowthCategory = revenueGrowthCategory;

        let chart = {}
        chart.productNames = saleCount.currentProductCount.map(item => item.name)
        chart.productSales = saleCount.currentProductCount.map(item => item.totalQuantitySold);
        chart.productRevenue = saleCount.currentProductCount.map(item => item.totalPrice);
        chart.categoryNames = saleCount.currentCategoryCount.map(item => item.category);
        chart.categorySales = saleCount.currentCategoryCount.map(item => item.totalQuantitySold);
        chart.categoryRevenue = saleCount.currentCategoryCount.map(item => item.totalPrice);


        let totalProductPages = Math.ceil(saleCount.currentProductCount.length / limit);
        saleCount.currentProductCount = saleCount.currentProductCount.slice(productSkip, pageProduct * limit);
        saleCount.saleGrowthProduct = saleCount.saleGrowthProduct.slice(productSkip, pageProduct * limit);
        saleCount.revenueGrowthProduct = saleCount.revenueGrowthProduct.slice(productSkip, pageProduct * limit);
        
        let totalCategoryPages = Math.ceil(saleCount.currentCategoryCount.length / limit);
        saleCount.currentCategoryCount = saleCount.currentCategoryCount.slice(categorySkip, pageCategory * limit);
        saleCount.saleGrowthCategory = saleCount.saleGrowthCategory.slice(categorySkip, pageCategory * limit);
        saleCount.revenueGrowthCategory = saleCount.revenueGrowthCategory.slice(categorySkip, pageCategory * limit);

        
      res.render('salesReport',{
        orders,
        saleCount,
        range,
        startDate,
        endDate,
        totalProductPages,
        totalCategoryPages,
        pageProduct,
        pageCategory,
        chart
      })

    } catch (error) {
      console.error(error)
      res.redirect('/pageError')
    }
  }
  
  
  const downloadSalesPdf = async (req, res) => {
    try {
      const range = req.session.range || 'year';
      const startDate = req.session.start;
      const endDate = req.session.end;
  
      let currentMatchStage = null;
      let pastMatchStage = null;
  
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const pastStart = new Date(start.getTime() - diffTime);
        const pastEnd = new Date(start);
  
        currentMatchStage = adminHelper.filterRange({ startDate: start, endDate: end });
        pastMatchStage = adminHelper.filterRange({ startDate: pastStart, endDate: pastEnd });
      } else if (range === 'year') {
        currentMatchStage = adminHelper.filterRange({ type: 'year', year: new Date().getFullYear() });
        pastMatchStage = adminHelper.filterRange({ type: 'year', year: new Date().getFullYear() - 1 });
      } else if (range === 'month') {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
        currentMatchStage = adminHelper.filterRange({ type: 'month', month: currentMonth });
        pastMatchStage = adminHelper.filterRange({ type: 'month', month: lastMonth });
      } else if (range === 'week') {
        currentMatchStage = adminHelper.filterRange({ type: 'week', week: new Date() });
        pastMatchStage = adminHelper.filterRange({ type: 'week', week: new Date(new Date().setDate(new Date().getDate() - 6)) });
      }
  
      const saleCount = await adminHelper.getCounts(currentMatchStage, pastMatchStage);
  
      const filter = {};
      // filterbydate(filter, range, startDate, endDate);
  
      const orders = await Order.find(filter).populate('userId');
  
      let totalRevenue = 0;
      let totalDiscount = 0;
      let couponDeduction = 0;
  
      orders.forEach(order => {
        if (order.status !== 'Cancelled' && order.status !== 'Returned') {
          totalRevenue += order.finalAmount;
          totalDiscount += order.discount;
          couponDeduction += order.couponDiscount;
        }
      });
  
      const PDFDocument = require('pdfkit-table');
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
      doc.pipe(res);
  
      // Header
      doc.fontSize(18).text("Sales Report", { align: 'center' }).moveDown();
  
      if (startDate && endDate) {
        doc.fontSize(12).text(`Report Period   : ${new Date(startDate).toISOString().split('T')[0]} to ${new Date(endDate).toISOString().split('T')[0]}`);
      } else {
        doc.fontSize(12).text(`Report Range    : ${range.charAt(0).toUpperCase() + range.slice(1)}`);
      }
  
      doc.text(`Total Orders     : ${orders.length}`);
      doc.text(`Total Revenue    : ₹${totalRevenue}`);
      doc.text(`Total Discount   : ₹${totalDiscount}`);
      doc.text(`Coupon Deduction : ₹${couponDeduction}`);
      doc.moveDown();
  
      // Product Sales Table
      const productTable = {
        title: "Product Sales Summary",
        headers: ["Product", "Current Qty", "Past Qty", "Growth"],
        rows: saleCount.currentProductCount.map((product, index) => {
          const name = product.name || `Product ${index + 1}`;
          const currentQty = product.totalQuantitySold || 0;
          const pastQty = saleCount.pastProductCount[index]?.totalQuantitySold || 0;
          const growth = currentQty - pastQty;
          return [name, currentQty, pastQty, growth];
        })
      };
  
      await doc.table(productTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10),
        columnSpacing: 5,
        padding: 5,
        columnsSize: [150, 100, 100, 100]
      });
  
      doc.moveDown();
  
      // Category Sales Table
      const categoryTable = {
        title: "Category Sales Summary",
        headers: ["Category", "Current Qty", "Past Qty", "Growth"],
        rows: saleCount.currentCategoryCount.map((category, index) => {
          const name = saleCount.currentCategoryCount[index].category || `Category ${index + 1}`;
          const currentQty = category.totalQuantitySold || 0;
          const pastQty = saleCount.pastCategoryCount[index]?.totalQuantitySold || 0;
          const growth = currentQty - pastQty;
          return [name, currentQty, pastQty, growth];
        })
      };
  
      await doc.table(categoryTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10),
        columnSpacing: 5,
        padding: 5,
        columnsSize: [150, 100, 100, 100]
      });
  
      doc.end();
  
    } catch (error) {
      console.error(error);
      res.redirect('/pageError');
    }
  };
  
  
  
  
  const downloadSalesExcel = async (req, res) => {
    try {
      const { startDate, endDate, range } = req.session;
  
      // Prepare match stages for current & past period
      let currentMatchStage, pastMatchStage;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end - start;
        const pastStart = new Date(start.getTime() - diffTime);
        const pastEnd = new Date(start);
  
        currentMatchStage = adminHelper.filterRange({ startDate: start, endDate: end });
        pastMatchStage = adminHelper.filterRange({ startDate: pastStart, endDate: pastEnd });
      } else if (range === 'year') {
        currentMatchStage = adminHelper.filterRange({ type: 'year', year: new Date().getFullYear() });
        pastMatchStage = adminHelper.filterRange({ type: 'year', year: new Date().getFullYear() - 1 });
      } else if (range === 'month') {
        const now = new Date();
        currentMatchStage = adminHelper.filterRange({ type: 'month', month: now });
        pastMatchStage = adminHelper.filterRange({ type: 'month', month: new Date(now.getFullYear(), now.getMonth() - 1) });
      } else {
        currentMatchStage = adminHelper.filterRange({ type: 'week', week: new Date() });
        pastMatchStage = adminHelper.filterRange({ type: 'week', week: new Date(new Date().setDate(new Date().getDate() - 6)) });
      }
  
      const saleCount = await adminHelper.getCounts(currentMatchStage, pastMatchStage);
  
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');
  
      // === HEADER INFO ===
      sheet.addRow(['Report Range', `: ${range || 'All'}`]);
      sheet.addRow(['Total Orders', `: ${saleCount.totalOrderCount}`]);
      sheet.addRow(['Total Revenue', `: ${saleCount.totalRevenue}`]);
      sheet.addRow(['Total Discount', `: ${saleCount.totalDiscount}`]);
      sheet.addRow(['Coupon Deduction', `: ${saleCount.totalCouponDeduction}`]);
      sheet.addRow([]); // empty row for spacing
  
      // === PRODUCT SALES SUMMARY ===
      sheet.addRow(['Product Sales Summary']);
      sheet.addRow(['Product', 'Current Qty', 'Past Qty', 'Growth']);
      saleCount.currentProductCount.forEach((item, i) => {
        const currentQty = item.totalQuantitySold || 0;
        const pastQty = saleCount.pastProductCount[i]?.totalQuantitySold || 0;
        sheet.addRow([
          item.productName,
          currentQty,
          pastQty,
          currentQty - pastQty
        ]);
      });
  
      sheet.addRow([]); // spacing row
  
      // === CATEGORY SALES SUMMARY ===
      sheet.addRow(['Category Sales Summary']);
      sheet.addRow(['Category', 'Current Qty', 'Past Qty', 'Growth']);
      saleCount.currentCategoryCount.forEach((item, i) => {
        const currentQty = item.totalQuantitySold || 0;
        const pastQty = saleCount.pastCategoryCount[i]?.totalQuantitySold || 0;
        sheet.addRow([
          item.categoryName,
          currentQty,
          pastQty,
          currentQty - pastQty
        ]);
      });
  
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
  
    } catch (err) {
      console.log(err);
      res.redirect('/pageError');
    }
  };
  
  
  
  
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
    loadSalesPage,
    downloadSalesPdf,
    downloadSalesExcel,
    salesOverviewData,

  }