const Wallet = require('../../models/walletSchema')

const loadWallets = async (req,res) => {
    try {
        const wallet = await Wallet.aggregate([
            {
              $unwind: "$transactions" 
            },
            {
              $sort: { "transactions.date": -1 } 
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
              }
            },
            {
              $unwind: "$userDetails" 
            },
            {
              $project: {
                _id: 0,
                walletId : 1,
                transaction: "$transactions",
                user: {
                  name: "$userDetails.name",     
                  email: "$userDetails.email",
                  photo: "$userDetails.photo",
                  _id: "$userDetails._id"
                }
              }
            }
          ])

          console.log(wallet)
          
        res.render('wallets',{
            wallet
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageError')
    }
} 

module.exports = {
    loadWallets
}