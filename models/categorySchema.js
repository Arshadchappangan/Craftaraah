const mongoose = require('mongoose');
const {Schema} = mongoose;

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    description : {
        type : String,
        required : true,
    },
    isListed : {
        type : Boolean,
        default : true
    },
    isDeleted : {
        type : Boolean,
        required : true,
        default : false
    },
    offers : {
        type : [{
            type : Schema.Types.ObjectId,
            ref : "Offer",
        }]
    },
    createdAt : {
        type : Date,
        default : Date.now
    }
})

const category = mongoose.model("Category",categorySchema);
module.exports = category;