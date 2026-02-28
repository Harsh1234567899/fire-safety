import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { clientProduct } from '../models/clientProduct.model.js'
import { monoIdIsValid } from '../utils/mongoDBid.js'

const createClientProducts = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'godown-manager') {
        throw new ApiError(403, 'You are not allowed to add products to a client');
    }

    const { clientId, products } = req.body;

    if (!clientId) {
        throw new ApiError(400, 'clientId is required');
    }
    monoIdIsValid(clientId);

    if (!Array.isArray(products) || products.length === 0) {
        throw new ApiError(400, 'products array is required and must not be empty');
    }

    const createdBy = req.user._id;

    // We store all products for a client in a single document
    const productsToInsert = products.map(p => ({
        productId: p.product,
        quantity: p.quantity
    }));

    const updatedClientProduct = await clientProduct.findOneAndUpdate(
        { clientId },
        {
            clientId,
            products: productsToInsert,
            createdBy
        },
        { new: true, upsert: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedClientProduct, 'Client products saved successfully'));
});

// Used to get all products for a specific client profile view
const getClientProducts = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    if (!clientId) throw new ApiError(400, 'clientId is required');
    monoIdIsValid(clientId);

    const clientProductDoc = await clientProduct.findOne({ clientId })
        .populate('products.productId', 'productName productDescription productImages');

    // If we wanted to keep the old shape where each item is returned in an array
    const products = clientProductDoc ? clientProductDoc.products.map(p => ({
        _id: clientProductDoc._id, // Share the same wrapper ID
        productId: p.productId,
        quantity: p.quantity,
        createdAt: clientProductDoc.createdAt,
        updatedAt: clientProductDoc.updatedAt
    })) : [];

    return res.status(200).json(new ApiResponse(200, products, 'Client products fetched successfully'));
});

export {
    createClientProducts,
    getClientProducts
}
