const Product = require('../../models/productSchema');

const loadInventory = async (req, res) => {
    try {
      const { filter, search } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      let query = { isBlocked: false, isDeleted: false };

      let allProducts = await Product.find(query);

  
      if (filter === 'in') {
        query.quantity = { $gte: 10 };
      } else if (filter === 'low') {
        query.quantity = { $gt: 0, $lt: 10 };
      } else if (filter === 'out') {
        query.quantity = 0;
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
        .limit(limit);
  

      const totalStockAgg = await Product.aggregate([
        { $match: { isBlocked: false, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      const totalStock = totalStockAgg[0]?.total || 0;
  

      const lowStockItems = await Product.find({
        quantity: { $gt: 0, $lt: 10 },
        isBlocked: false,
        isDeleted: false
      });
  
      const outOfStockItems = await Product.find({
        quantity: 0,
        isBlocked: false,
        isDeleted: false
      });
  

      const productNames = allProducts.map(p => p.productName);
      const productStocks = allProducts.map(p => p.quantity);
  
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
        await Product.findByIdAndUpdate(id,{quantity});
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