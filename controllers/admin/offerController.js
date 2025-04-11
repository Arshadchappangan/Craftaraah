const Offer = require('../../models/offerSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

const loadOffers = async (req, res) => {
    try {
        const offers = await Offer.find({ isActive: true }).populate('products').populate('categories');
        const categories = await Category.find({ isListed: true });
        const products = await Product.find({ isListed: true });
        const users = await User.find({ isBlocked: false });

        offers.forEach(offer => {
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
            categories,
            products,
            users
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
            products.save();
        }
        
        if(categories && categories.length > 0) {
            categories.forEach(async (category) => {
                category.offers = category.offers.filter(offer => offer.toString() !== offerId);
                await category.save();
            });
            categories.save();
        }

        await Offer.findByIdAndDelete(offerId);


        return res.json({success:true});
    } catch (error) {
        console.error("Error deleting offer:", error);
        return res.status(500).json({success:false});
        
    }
}

const applyProductOffer = async (req, res) => {
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

        const existingOffer = product.offers.find(existingOfferId => existingOfferId.toString() !== offerId.toString());
        
        if (existingOffer) {
            product.offers.pull(existingOffer);
            await product.save();
            
            const oldOffer = await Offer.findById(existingOffer);
            oldOffer.products.pull(productId);
            await oldOffer.save();
        }

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



module.exports = {
    loadOffers,
    createOffer,
    editOffer,
    deleteOffer,
    applyProductOffer,
}