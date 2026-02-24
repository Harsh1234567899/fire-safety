import { Category } from "../models/Category.model.js";
import { gasSubCategory } from "../models/gasSubCategory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Seed initial categories if not exist
export const seedCategories = asyncHandler(async (req, res) => {

  const categories = [
    { name: "Fire Extinguishers" },
    { name: "Fire NOC" },
    { name: "AMC (Annual Maintenance Contract)" },
  ];

  for (const category of categories) {
    await Category.updateOne(
      { name: category.name },
      { $setOnInsert: category },
      { upsert: true }
    );
  }
  return res.status(201).json(new ApiResponse(201, {}, "Default categories seeded"));
});

// Get all categories with subcategories
export const getAllCategories = asyncHandler(async (req, res) => {

  const categories = await Category.find().lean();
  const result = await Promise.all(
    categories.map(async (cat) => {
      const subcats = await gasSubCategory.find({ category: { $in: [cat._id, String(cat._id)] } });
      return { ...cat, subcategories: subcats };
    })
  );
  res.status(200).json(new ApiResponse(200, result, 'all category fatcech'));

});
