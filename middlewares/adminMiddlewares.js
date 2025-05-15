const Order = require('../models/orderSchema');

const returnRequest = async (req,res,next) => {
    try {
        const requests = await Order.countDocuments({ 'returnRequest.status': 'Requested' });
        res.locals.returnRequests = requests || 0;
        next();
    }
    catch (error) {
        console.error(error);
        res.redirect('/pageError');
    }
}

module.exports = {
    returnRequest
}