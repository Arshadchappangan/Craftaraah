const mongoose = require('mongoose');
const category = require('./categorySchema');
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
    brand : {
        type : String,
        required : false,
    },
    category : {
        type : Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },
    regularPrice : {
        type : Number,
        required : true
    },
    salePrice : {
        type : Number,
        required : true
    },
    productOffer : {
        type : Number,
        default : 0
    },
    quantity : {
        type : Number,
        required : true
    },
    productImage : {
        type : [{type : String}],
        required : true
    },
    isBlocked : {
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