const mongoose = require('mongoose');
const {Schema} = mongoose;

const walletSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId,
        ref: 'User' 
    },
    walletId: {
        type : String,
        unique : true
    },
    balance: { 
        type: Number, 
        default: 0 
    },
    transactions: [{
        transactionType: { 
            type: String, 
            enum: ['Topup', 'Debit', 'Refund', 'Cashback'] 
        },
        amount: Number,
        date: { 
            type: Date, 
            default: Date.now 
        },
        description: {
            type : String
        }
    }]
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;

