import slugify from 'slugify'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Category } from '../models/Category.model.js'
import { gasSubCategory } from '../models/gasSubCategory.model.js'
import { monoIdIsValid } from '../utils/mongoDBid.js'


const addsubCatagory = asyncHandler(
    async (req, res) => {
        if (req.user.role !== 'admin') {
            throw new ApiError(403, 'you are not allowed to add category')
        }
        const { name, category, kgLiter, weight } = req.body
        if (!name || !category || !weight || !kgLiter) {
            throw new ApiError(400, "name, category, weight and kgLiter are required");
        }

        const slug = slugify(`${name}-${weight}${kgLiter}`, {
            lower: true,
            strict: true,
        });

        let categorys = await Category.findOne({ name: category.trim() });
        if (!categorys) {
            categorys = await Category.create({ name: category.trim() });
        }

        const exists = await gasSubCategory.findOne({
            name: slug,
            category: categorys._id,
        });
        if (exists) {
            throw new ApiError(409, "This cylinder already exists");
        }
        const subCategory = await gasSubCategory.create({
            name: slug,
            originalName: name,
            category: categorys._id,
            kgLiter: kgLiter,
            weight: weight,
        });

        return res.status(201).json(
            new ApiResponse(201, subCategory, "Cylinder added successfully")
        );
    }
)

const updateSubCategory = async (req, res) => {

    const { id } = req.params;
    const { name, kgLiter, weight } = req.body;
    if (req.user.role !== 'admin') {
        throw new ApiError(403, 'you are not allowed to add category')
    }
    monoIdIsValid(id)

    // Get current subcategory
    const current = await gasSubCategory.findById(id);
    if (!current) {
        throw new ApiError(404, "Subcategory not found")
    }

    // Validation
    if (
        (name === undefined || name === null || name === "") &&
        (kgLiter === undefined || kgLiter === null || kgLiter === "") &&
        (weight === undefined || weight === null || weight === "")
    ) {
        throw new ApiError(400, "At least one field must be provided")
    }

    // Helper function to generate slug
    const generateSlug = (name, weight, kgLiter) => {
        if (!name || !weight || !kgLiter) return name?.trim();
        const baseSlug = `${name}-${weight}${kgLiter}`;
        return slugify(baseSlug, { lower: true, strict: true });
    };

    // Only update if provided, else keep current
    const currentOriginalName = current.originalName || current.name.split('-')[0];
    const newName = name && name.trim() ? name.trim() : currentOriginalName;
    const newWeight = weight !== undefined && weight !== null && weight !== "" ? weight : current.weight;
    const newKgLiter = kgLiter && kgLiter.trim() ? kgLiter : current.kgLiter;

    // Generate new slug
    const slug = generateSlug(newName, newWeight, newKgLiter);

    // Check if new slug already exists (avoid duplicates)
    if (slug !== current.name) {
        const slugExists = await gasSubCategory.findOne({
            name: slug,
            category: current.category,
            _id: { $ne: id },
        });
        if (slugExists) {
            throw new ApiError(409, "This slug already exists for another subcategory")
        }
    }

    const updated = await gasSubCategory.findByIdAndUpdate(
        id,
        {
            name: slug,
            originalName: newName,
            kgLiter: newKgLiter,
            weight: newWeight,
        },
        { new: true }
    );

    res.status(200).json(new ApiResponse(200, updated, "Subcategory updated successfully"));

};

const deleteSubCategory = asyncHandler(
    async (req, res) => {
        const catgory = req.params.id
        if (req.user.role !== 'admin') {
            throw new ApiError(403, 'you are not allowed to delete category')
        }
        if (!catgory) {
            throw new ApiError(409, "cant find catgory id in params");
        }
        const subCategory = await gasSubCategory.findByIdAndDelete(catgory)
        if (!subCategory) {
            throw new ApiError(409, "problem in delteing the category");
        }
        return res.status(200).json(new ApiResponse(200, subCategory, 'category is deleted'))
    }
)



export {
    addsubCatagory,
    deleteSubCategory,
    updateSubCategory,

}