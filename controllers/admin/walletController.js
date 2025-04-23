const Wallet = require('../../models/walletSchema')

const loadWallets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 8; 
    const skip = (page - 1) * limit;

    const walletData = await Wallet.aggregate([
      { $unwind: "$transactions" },
      { $sort: { "transactions.date": -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 0,
          walletId: 1,
          transaction: "$transactions",
          user: {
            name: "$userDetails.name",
            email: "$userDetails.email",
            photo: "$userDetails.photo",
            _id: "$userDetails._id"
          }
        }
      },
      {
        $facet: {
          paginatedResults: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const wallets = walletData[0].paginatedResults;
    const totalCount = walletData[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('wallets', {
      wallet: wallets,
      currentPage: page,
      totalPages,
      totalCount,
      limit
    });

  } catch (error) {
    console.error(error);
    res.redirect('/pageError');
  }
};


module.exports = {
    loadWallets
}