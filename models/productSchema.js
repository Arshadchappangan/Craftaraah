const mongoose = require('mongoose');
const category = require('./categorySchema');
const { array } = require('../middlewares/multer');
const {Schema} = mongoose;

const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    specifications : {
        type : Array,
        required : true
    },
    category : {
        type : Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0
    },
    stock : {
        type : Number,
        default : 0
    },
    productImage : {
        type : [{type : String}],
        required : true
    },
    productRating : {
        type : Number,
    },
    isBlocked : {
        type : Boolean,
        required : true,
        default : false
    },
    isDeleted : {
        type : Boolean,
        required : true,
        default : false
    },
    status : {
        type : String,
        enum : ["Available","Out of stock","Discontinued"],
        required : true,
        default : "Available"
    }
},{timestamps:true})


const Product = mongoose.model('Product',productSchema);
module.exports = Product;