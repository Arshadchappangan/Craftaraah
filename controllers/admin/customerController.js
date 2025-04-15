const User = require('../../models/userSchema');


const customerInfo = async(req,res) => {
    try {
        let search = req.query.search || '';
        let page = req.query.page || 1
        const limit = 10;

        const userData = await User.find({              //searching suitable data for search from User collection
            isAdmin : false,
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                {email:{$regex:'.*'+search+'.*',$options:'i'}},
                {phone:{$regex:'.*'+search+'.*',$options:'i'}}
            ]
        })
        .sort({createdAt:-1})
        .limit(limit)
        .skip((page-1)*limit)                           // to apply pagination
        .exec();

        const count = await User.find({
            isAdmin : false,
            $or:[
                {name:{$regex:'.*'+search+'.*'}},
                {email:{$regex:'.*'+search+'.*'}}
            ]
        })
        .countDocuments();                              // get count of documents

        res.render('customers', { 
            data: userData,  // Fix: Passing the users array
            totalPages: Math.ceil(count / limit),
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