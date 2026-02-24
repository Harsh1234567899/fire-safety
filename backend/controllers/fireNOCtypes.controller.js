import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { monoIdIsValid } from '../utils/mongoDBid.js';
import { NOCType } from '../models/fireNOCTypes.model.js';

const getAllFireNoctypes =asyncHandler( async (req, res) => {
    const types = await NOCType.find().sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200,types,'all types fatcched'));

});

const createFireNoctype =asyncHandler( async (req, res) => {
  const { type } = req.body;
  if (!type || typeof type !== "string" || !type.trim())
    throw new ApiError(400,"Type is required for update") 

    const newType = new NOCType({ type: type.trim() });
    await newType.save();
    return res.status(201).json(new ApiResponse(201,newType,'new type added'));

});

const updateFireNoctype =asyncHandler( async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  monoIdIsValid(id)

  if (type !== undefined && (typeof type !== "string" || !type.trim()))
    throw new ApiError(400, "If provided, type must be a non-empty string")

    const updated = await NOCType.findByIdAndUpdate(
      id,
      { type , updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updated) throw new ApiError(404, "Not found" );

    return res.status(200).json(new ApiResponse(200,updated,'NOC updated'))

});

const deleteFireNoctype =asyncHandler( async (req, res) => {
  const { id } = req.params;
  monoIdIsValid(id)

    const deleted = await NOCType.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(503,'unable to delete please try again')
    return res.status(200).json(new ApiResponse(200,"Deleted successfully" ));

});

export{
    deleteFireNoctype,
    createFireNoctype,
    updateFireNoctype,
    getAllFireNoctypes
}
