const User = require('../../models/userSchema');


const customerInfo = async(req,res) => {
    try {
        let search = req.query.search || '';
        let page = req.query.page || 1
        const limit = 10;

    const results = await User.aggregate([
    {
        $facet: {
        // 1. Paginated search results
        data: [
            {
            $match: {
                isAdmin: false,
                $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
                ]
            }
            },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ],

        // 2. Total customers count
        totalCount: [
            { $match: { isAdmin: false } },
            { $count: 'count' }
        ],

        // 3. Blocked customers count
        blockedCount: [
            { $match: { isAdmin: false, isBlocked: true } },
            { $count: 'count' }
        ],

        // 4. New customers (last 7 days)
        newCustomersCount: [
            {
            $match: {
                isAdmin: false,
                createdAt: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
            }
            },
            { $count: 'count' }
        ],

        // 5. Searched customers count
        searchedCount: [
            {
            $match: {
                isAdmin: false,
                $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
                ]
            }
            },
            { $count: 'count' }
        ],

        // 6. Active customers (with orders)
        activeCustomersCount: [
            { $match: { isAdmin: false } },
            {
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'userId',
                as: 'orders'
            }
            },
            {
            $match: {
                'orders.0': { $exists: true }
            }
            },
            { $count: 'count' }
        ]
        }
    }
    ]);

                  

        res.render('customers', { 
            data: results,  // Fix: Passing the users array
            totalPages: Math.ceil(results[0].searchedCount[0]?.count / limit),
            currentPage: page,
            searchQuery: search
        });
    } catch (error) {
        
    }
}

const blockCustomer = async (req,res) => {
    try {
        let id = req.query.id;
        req.session.user = false;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageError')
    }
}

const unblockCustomer = async (req,res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageError')
    }
}


module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
}