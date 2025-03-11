const Category = require('../../models/categorySchema');


const categoryInfo = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit;

        const searchQuery = req.query.search || "";

        let filter = {};
        if (searchQuery) {
            filter.name = { $regex: searchQuery, $options: "i" }; // Case-insensitive search
        }

        const categoryData = await Category.find(filter)
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments(filter)
        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            category : categoryData,
            currentPage : page,
            totalPages : totalPages,
            totalCategories : totalCategories,
            searchQuery : searchQuery
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageError')
    }
}

const addCategory = async (req,res) => {
    const {name,description} = req.body;
    try {
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"});
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"});
    } catch (error) {
        return res.status(500).json("Internal server error")
    }
}


module.exports = {
    categoryInfo,
    addCategory
}