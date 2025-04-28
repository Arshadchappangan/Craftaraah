const Category = require('../../models/categorySchema');
const Offer = require('../../models/offerSchema');



const categoryInfo = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit;

        const search = req.query.search || "";


        const categoryData = await Category.find({
            isDeleted : false,
            name:{$regex:'.*'+search+'.*',$options:'i'}
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments({
            isDeleted : false,
            name:{$regex:'.*'+search+'.*',$options:'i'}
        })

        const categoryOffers = await Offer.find({isActive:true,applicableTo:"Category"});

        const categoryIds = categoryData.map(category => category._id);
        
        const offersPerCategory = await Offer.find({
                applicableTo: 'Category',
                isActive: true,
                categories: { $in: categoryIds }
            }).lean();
        
        const activeOfferMap = {};
        
        offersPerCategory.forEach(offer => {
                offer.categories.forEach(categoryId => {
                    activeOfferMap[categoryId.toString()] = offer;
                });
            });

        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            category : categoryData,
            currentPage : page,
            totalPages : totalPages,
            totalCategories : totalCategories,
            categoryOffers : categoryOffers,
            activeOfferMap : activeOfferMap,
            searchQuery : search
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageError')
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp('^' + name + '$', 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const photoPath = req.file
            ? `/uploads/category-images/${req.file.filename}` 
            : null;


        const newCategory = new Category({
            name,
            description,
            photo: photoPath 
        });

        await newCategory.save();

        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json("Internal server error");
    }
};

const unlistCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect("/pageError")
    }
}

const listCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect("/pageError")
    }
}


const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description } = req.body;
        const photo = req.file ? req.file.path : null;

        const updateData = { name, description };
        if (photo) {
            updateData.photo = photo;
        }

        await Category.findByIdAndUpdate(categoryId, updateData);
        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update category' });
    }
}





const archiveCategory = async (req,res) =>{
    try {
        const id = req.query.id;
        const deleteCategory = await Category.findOneAndUpdate({_id:id},{$set:{isDeleted:true}})
        if(deleteCategory){
            res.redirect('/admin/category')
        }else{
            res.status(404).json({error:"Category not found"})
        }
    } catch (error) {
        console.error("Error in deleting category : ",error)
        res.redirect('/pageError')
    }
}

const archivedCategoryInfo = async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit;

        const search = req.query.search || "";


        const categoryData = await Category.find({
            isDeleted : true,
            name:{$regex:'.*'+search+'.*',$options:'i'}
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments({
            isDeleted : true,
            name:{$regex:'.*'+search+'.*',$options:'i'}
        })

        const totalPages = Math.ceil(totalCategories/limit);
        res.render('archivedCategories',{
            category : categoryData,
            currentPage : page,
            totalPages : totalPages,
            totalCategories : totalCategories,
            searchQuery : search
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pageError')
    }
}

const deleteCategory = async(req,res) => {
    try {
        const id = req.query.id;
        const deleteCategory = await Category.findByIdAndDelete(id)
        if(deleteCategory){
            res.redirect('/admin/archivedCategories')
        }else{
            res.status(404).json({error:"Category not found"})
        }
    } catch (error) {
        console.error("Error in deleting category : ",error)
        res.redirect('/pageError')
    }
}

const restoreCategory = async(req,res) => {
    try {
        const id = req.query.id;
        const restoreCategory = await Category.findOneAndUpdate({_id:id},{$set:{isDeleted:false}});
        if(restoreCategory){
            res.redirect('/admin/archivedCategories')
        }else{
            res.status(404).json({error:"Category not found"});
        }
        
    } catch (error) {
        console.error("Error in deleting category : ",error)
        res.redirect('/pageError')
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    editCategory,
    archiveCategory,
    archivedCategoryInfo,
    deleteCategory,
    restoreCategory
}