const Wallet = require('../../models/walletSchema')
const adminHelpers = require('../../helpers/adminHelpers')

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
        ],
        totalCredit: [
        {
          $match: {
          "transaction.transactionType": { $in: ["Topup", "Debit"] }
          }
        },
        {
          $group: {
          _id: null,
          totalCredit: { $sum: "$transaction.amount" }
          }
        }
        ],
        totalDebit: [
        {
          $match: {
          "transaction.transactionType": { $in: ["Refund", "Cashback"] }
          }
        },
        {
          $group: {
          _id: null,
          totalDebit: { $sum: "$transaction.amount" }
          }
        }
        ]
      }
      }
    ]);

    const wallets = walletData[0].paginatedResults;
    const totalCount = walletData[0].totalCount[0]?.count || 0;
    const totalCredit = walletData[0].totalCredit[0]?.totalCredit || 0;
    const totalDebit = walletData[0].totalDebit[0]?.totalDebit || 0;
    const totalWallets = await Wallet.countDocuments();
    const walletBalance = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" }
        }
      }
    ]);
    const totalBalance = walletBalance[0]?.totalBalance || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('wallets', {
      wallet: wallets,
      currentPage: page,
      totalPages,
      totalCount,
      totalCredit : adminHelpers.formatAmount(totalCredit),
      totalDebit : adminHelpers.formatAmount(totalDebit),
      totalBalance : adminHelpers.formatAmount(totalBalance),
      totalWallets,
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