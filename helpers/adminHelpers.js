const Order = require('../models/orderSchema')

// function to generate transaction id for wallet transactions
const generateTransactionId = () => {
    const timestamp = Date.now(); // current time in ms
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    return `TXN-${timestamp}-${random}`;
  };


  //function to filter according to the range 
  function filterRange(filter) {
    const matchStage = {};
  
    if (filter?.startDate && filter?.endDate) {
      matchStage.createdAt = {
        $gte: new Date(filter.startDate),
        $lte: new Date(filter.endDate),
      };
    } else if (filter?.type === 'week' && filter?.week) {
      const today = new Date(filter.week);
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: today };
  
    } else if (filter?.type === 'month' && filter?.month) {
        const year = filter.month.getFullYear();
        const month = filter.month.getMonth();

        const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
      matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
  
    } else if (filter?.type === 'year' && filter?.year) {
      const start = new Date(filter.year, 0, 1);
      const end = new Date(filter.year + 1, 0, 0, 23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: end };
    }
  
    return matchStage;
  }  


  //function to find the product wise sale count 
  async function saleCountProducts(matchStage) {

    return await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
            $group: {
                _id: "$orderedItems.product",
                totalQuantitySold: { $sum: "$orderedItems.quantity" },
                totalPrice: {
                    $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] }
                }
            }
        },
        { $sort: { totalQuantitySold: -1 } },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: "$productDetails" },
        {
            $lookup: {
                from: 'categories',
                localField: 'productDetails.category',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        { $unwind: "$categoryDetails" },
        {
            $project: {
                _id: 0,
                name: "$productDetails.productName",
                photo: { $arrayElemAt: ["$productDetails.productImage", 0] },
                totalQuantitySold: 1,
                totalPrice : 1,
                category: "$categoryDetails.name"
            }
        },
    ]);
}


//function to find the category wise sale count
async function saleCountCategories(matchStage) {
    return await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
            $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $group: {
                _id: "$productDetails.category",
                totalQuantitySold: { $sum: "$orderedItems.quantity" },
                totalPrice: {
                    $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] }
                }
            }
        },
        { $sort: { totalQuantitySold: -1 } },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        { $unwind: "$categoryDetails" },
        {
            $project: {
                _id: 0,
                category: "$categoryDetails.name",
                description: "$categoryDetails.description",
                totalQuantitySold: 1,
                totalPrice:1
            }
        }
    ]);
}

async function getCounts(current,past){
    let currentProductCount = await saleCountProducts(current);
    let currentCategoryCount = await saleCountCategories(current);
    let pastProductCount = await saleCountProducts(past);
    let pastCategoryCount = await saleCountCategories(past); 

    return {
        currentProductCount,
        currentCategoryCount,
        pastProductCount,
        pastCategoryCount
    }
}


function formatAmount(amount) {
    return amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


module.exports = {
    generateTransactionId,
    filterRange,
    saleCountProducts,
    saleCountCategories,
    getCounts,
    formatAmount
}