const Offer = require('../../models/offerSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');


const loadOffers = async (req, res) => {
    try {

        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const result = await Offer.aggregate([
            {
                $facet: {
                    data: [
                        {
                            $match: {
                                title: { $regex: searchQuery, $options: 'i' }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ],
                    activeCount: [
                        { $match: { isActive: true } },
                        { $count: 'count' }
                    ],
                    expiredCount: [
                        { $match: { endDate: { $lt: new Date() } } },
                        { $count: 'count' }
                    ],
                    searchedCount: [
                        {
                            $match: {
                                title: { $regex: searchQuery, $options: 'i' }
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const offers = result[0];
        const totalCount = result[0].searchedCount[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        offers.data.forEach(offer => {
            const rawStart = new Date(offer.startDate);
            const rawEnd = new Date(offer.endDate);
            rawStart.setHours(0, 0, 0, 0);
            rawEnd.setHours(0, 0, 0, 0);
        
            const options = {
                year: 'numeric',
                month : 'long',
                day : 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            };
        
            offer.formattedStartDate = rawStart.toLocaleString('en-US', options);
            offer.formattedEndDate = rawEnd.toLocaleString('en-US', options);
        });

        res.render('offers', {
            offers : offers || [],
            currentPage: page,
            totalPages,
            searchQuery
        });
    } catch (error) {
        console.error("Error loading offers:", error);
        res.status(500).send("Internal Server Error");
        
    }
}

const createOffer = async (req, res) => {
    try {
        const { title, discount, type, start, end} = req.body;

        const newOffer = new Offer({
            title,
            discountPercentage: discount,
            startDate:start,
            endDate:end,
            applicableTo: type,
            products: [],
            categories:  [],
            users: [],
        });
        await newOffer.save();
        return res.json({success:true});
    } catch (error) {
        console.error("Error creating offer:", error);
        return res.status(500).json({success:false});
    }
}

const editOffer = async (req,res) => {
    try {
        const offerId = req.params.id;
        const { title, discount, type, start, end} = req.body;
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({success:false});
        }   
        offer.title = title;
        offer.discountPercentage = discount;
        offer.startDate = start;
        offer.endDate = end;
        offer.applicableTo = type;

        offer.save()
        return res.json({success:true});
    } catch (error) {
        console.error("Error editing offer:", error);
        return res.status(500).json({success:false});
        
    }
}

const deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const products = await Product.find({ offers: offerId });
        const categories = await Category.find({ offers: offerId }); 
        
        if(products && products.length > 0) {
            products.forEach(async (product) => {
                product.offers = product.offers.filter(offer => offer.toString() !== offerId);
                await product.save();
            });
        }
        
        if(categories && categories.length > 0) {
            categories.forEach(async (category) => {
                category.offers = category.offers.filter(offer => offer.toString() !== offerId);
                await category.save();
            });
        }

        await Offer.findByIdAndDelete(offerId);


        return res.json({success:true});
    } catch (error) {
        console.error("Error deleting offer:", error);
        return res.status(500).json({success:false});
        
    }
}

const unlistOffer = async (req, res) => {
    try {
        const offerId = req.query.id;
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        offer.isActive = false;
        await offer.save();

        const products = await Product.find({ offers: offerId });
        const categories = await Category.find({ offers: offerId });
        if (products && products.length > 0) {
            products.forEach(async (product) => {
                product.offers = product.offers.filter(offer => offer.toString() !== offerId);
                await product.save();
            });
        }

        if (categories && categories.length > 0) {
            categories.forEach(async (category) => {
                category.offers = category.offers.filter(offer => offer.toString() !== offerId);
                await category.save();
            });
        }
    
        return res.json({ success: true, message: "Offer unlisted successfully." });
    } catch (error) {
        console.error("Error unlisting offer:", error);
        return res.status(500).json({ success: false, message: "An error occurred while unlisting the offer." });
    }
}

const listOffer = async (req, res) => {
    try {
        const offerId = req.query.id;
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        offer.isActive = true;
        await offer.save();
    
        return res.json({ success: true, message: "Offer listed successfully." });
    } catch (error) {
        console.error("Error listing offer:", error);   
        return res.status(500).json({ success: false, message: "An error occurred while listing the offer." });
    }
}

const activateProductOffer = async (req, res) => {
    try {
        const { offerId, productId } = req.body;

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Check if the offer is already applied to this product
        const isAlreadyApplied = product.offers.includes(offerId);
        if (isAlreadyApplied) {
            return res.json({ success: true, message: "Offer already applied to this product." });
        }

        // If only one product offer is allowed, remove existing offers
        if (product.offers.length > 0) {
            for (const existingOfferId of product.offers) {
                const existingOffer = await Offer.findById(existingOfferId);
                if (existingOffer && existingOffer.applicableTo === "Product") {
                    existingOffer.products.pull(productId);
                    await existingOffer.save();

                    product.offers = product.offers.filter(id => id.toString() !== existingOfferId.toString()); 
                }
            }
           
        }

        // Add the new offer
        product.offers.push(offerId);
        await product.save();

        offer.products.push(productId);
        await offer.save();

        return res.json({ success: true, message: "Offer applied successfully." });

    } catch (error) {
        console.error("Error applying offer:", error);
        return res.status(500).json({ success: false, message: "An error occurred while applying the offer." });
    }
};


const deactivateProductOffer = async (req, res) => {
    try {
        const { productId, activeOfferId: offerId } = req.body;

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Remove the offer from the product
        product.offers = product.offers.filter(id => id.toString() !== offerId.toString());
        await product.save();

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }

        offer.products = offer.products.filter(id => id.toString() !== productId.toString());
        await offer.save();

        return res.json({ success: true, message: "Offer deactivated successfully." });
    } catch (error) {
        console.error("Error deactivating offer:", error);
        return res.status(500).json({ success: false, message: "An error occurred while deactivating the offer." });
    }
};

const activateCategoryOffer = async (req, res) => {
    try {
        const { offerId, categoryId } = req.body;

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        const products = await Product.find({ category: categoryId });
        if (!products) {
            return res.status(404).json({ success: false, message: "No products found for this category." });
        }

        const isAlreadyApplied = category.offers.includes(offerId);
        if (isAlreadyApplied) {
            return res.json({ success: true, message: "Offer already applied to this category." });
        }

        if (category.offers.length > 0) {
            for (const existingOfferId of category.offers) {
                const oldOffer = await Offer.findById(existingOfferId);
                if (oldOffer) {
                    oldOffer.products.pull(categoryId);
                    await oldOffer.save();
                }
            }
            category.offers = []; 
        }
        category.offers.push(offerId);
        await category.save();

        offer.categories.push(categoryId);
        await offer.save();

        for (const product of products) {
                product.offers.push(offerId);
                await product.save();
        }

        return res.json({ success: true, message: "Offer applied successfully." });

    } catch (error) {
        console.log("Error applying offer:", error);
        return res.status(500).json({ success: false, message: "An error occurred while applying the offer." });
    }
}

const deactivateCategoryOffer = async (req, res) => {
    try {
        const { categoryId, activeOfferId: offerId } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        category.offers = category.offers.filter(id => id.toString() !== offerId.toString());
        await category.save();

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        offer.categories = offer.categories.filter(id => id.toString() !== categoryId.toString());
        await offer.save();

        const products = await Product.find({ category: categoryId });
        if (!products) {
            return res.status(404).json({ success: false, message: "No products found for this category." });
        }

        for (const product of products) {
            product.offers.pull(offerId);
            await product.save();
        }

        return res.json({ success: true, message: "Offer deactivated successfully." });
    } catch (error) {
        console.error("Error deactivating offer:", error);
        return res.status(500).json({ success: false, message: "An error occurred while deactivating the offer." });
    }
}

module.exports = {
    loadOffers,
    createOffer,
    editOffer,
    deleteOffer,
    unlistOffer,
    listOffer,
    activateProductOffer,
    deactivateProductOffer,
    activateCategoryOffer,
    deactivateCategoryOffer
}