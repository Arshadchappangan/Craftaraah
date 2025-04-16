const Cart = require('../models/cartSchema')


const verifyStock = async (req,res,next) => {
    try {
        console.log('verify stock 1')
        const user = req.session.user;
        let cart = await Cart.findOne({userId:user._id}).populate({
            path: 'items.productId',
            populate: {
              path: 'offers'
            }
          })

          for (const item of cart.items) {
            if (item.quantity > item.productId.stock) {
                console.log('verify stock 1')
                req.flash('error', `Only ${item.productId.stock} of "${item.productId.productName}" available`);
                return res.status(400).json({ error: req.flash('error') });
        }
    }

        next()
        
    } catch (error) {
       console.error(error)
       res.json({success:false,message:"Stock verification failed"}) 

    }
}

module.exports = {
    verifyStock
}