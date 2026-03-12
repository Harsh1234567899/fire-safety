import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { clientProduct } from '../models/clientProduct.model.js'
import { monoIdIsValid } from '../utils/mongoDBid.js'
import mongoose from 'mongoose'

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

    // We store products from a single purchase event in its own document
    const productsToInsert = products.map(p => ({
        productId: p.product || p.productId,
        quantity: p.quantity
    }));

    const createdClientProduct = await clientProduct.create({
        clientId,
        products: productsToInsert,
        createdBy
    });

    return res.status(200).json(new ApiResponse(200, createdClientProduct, 'Client products saved successfully'));
});

// Used to get all products for a specific client profile view
const getClientProducts = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    if (!clientId) throw new ApiError(400, 'clientId is required');
    monoIdIsValid(clientId);

    const clientProductDocs = await clientProduct.find({ clientId })
        .populate('products.productId', 'productName productDescription productImages')
        .sort({ createdAt: -1 });

    // Generate a flat list of products with their specific purchase dates
    const allProducts = [];
    clientProductDocs.forEach(doc => {
        if (!doc.products) return;
        doc.products.forEach(p => {
            // Use sub-item timestamp if available (from bug-merged docs), else parent doc createdAt
            let pDate = doc.createdAt;
            if (p._id) {
                try {
                    // Safe conversion for lean string IDs
                    pDate = new mongoose.Types.ObjectId(String(p._id)).getTimestamp();
                } catch (e) {
                    pDate = doc.createdAt;
                }
            }

            allProducts.push({
                productId: p.productId?._id || p.productId,
                quantity: p.quantity,
                details: p.productId, // Populated object from .populate()
                purchasedAt: pDate,
                createdAt: doc.createdAt,
                id: p._id || String(Math.random())
            });
        });
    });

    const products = allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(new ApiResponse(200, products, 'Products fetched successfully'));
});

const deleteClientProducts = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    if (!clientId) throw new ApiError(400, 'clientId is required');
    monoIdIsValid(clientId);
    const clientProductDocs = await clientProduct.find({ clientId });
    if (!clientProductDocs) throw new ApiError(404, 'Client products not found');
    await clientProductDocs.forEach(doc => doc.remove());
    return res.status(200).json(new ApiResponse(200, 'Client products deleted successfully'));
});

export {
    createClientProducts,
    getClientProducts,
    deleteClientProducts
}
