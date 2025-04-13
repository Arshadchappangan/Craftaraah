const Product = require('../../models/productSchema');



function calculateDiscount(productData) {
  const applyDiscount = (product) => {
      let maxDiscount = 0;
      let discountedPrice = product.price;

      if (product.offers && product.offers.length > 0) {
          product.offers.forEach(offer => {
              if (offer.isActive) {
                  const discount = offer.discountPercentage;
                  const offerPrice = product.price - (product.price * discount / 100);
                  if (discount > maxDiscount) {
                      maxDiscount = discount;
                      discountedPrice = Math.round(offerPrice);
                  }
              }
          });
      }

      product.maxDiscount = maxDiscount;
      product.discountedPrice = Math.max(discountedPrice, 0).toFixed(2);
  };

  if (Array.isArray(productData)) {
      productData.forEach(product => applyDiscount(product));
  } else {
      applyDiscount(productData);
  }
}


const loadInventory = async (req, res) => {
    try {
      const { filter, search } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      let query = { isBlocked: false, isDeleted: false };

      let allProducts = await Product.find(query);

  
      if (filter === 'in') {
        query.stock = { $gte: 10 };
      } else if (filter === 'low') {
        query.stock = { $gt: 0, $lt: 10 };
      } else if (filter === 'out') {
        query.stock = 0;
      }
  
      if (search) {
        const escapeRegex = (text) =>
          text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const safeSearch = escapeRegex(search);
        query.productName = { $regex: safeSearch, $options: 'i' };
      }
  
      const count = await Product.countDocuments(query);
  
      const products = await Product.find(query)
        .skip(skip)
        .limit(limit)
        .populate('offers');

        calculateDiscount(products)
      

      const totalStockAgg = await Product.aggregate([
        { $match: { isBlocked: false, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$stock' } } }
      ]);
      const totalStock = totalStockAgg[0]?.total || 0;
  

      const lowStockItems = await Product.find({
        stock: { $gt: 0, $lt: 10 },
        isBlocked: false,
        isDeleted: false
      });
  
      const outOfStockItems = await Product.find({
        stock: 0,
        isBlocked: false,
        isDeleted: false
      });
  

      const productNames = allProducts.map(p => p.productName);
      const productStocks = allProducts.map(p => p.stock);
  
      res.render('inventory', {
        productCount : allProducts.length,
        products,
        totalStock,
        lowStockItems,
        outOfStockItems,
        productNames,
        productStocks,
        filter,
        search,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading inventory");
    }
  };
  

const updateStock = async (req,res) => {
    try {
        const id = req.params.id
        const quantity = req.body.quantity;
        await Product.findByIdAndUpdate(id,{stock:quantity});
        res.json({success:true})
    } catch (error) {
        console.error(error);
        res.json({success:false})
    }
}

module.exports = {
    loadInventory,
    updateStock
}