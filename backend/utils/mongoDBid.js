import { ApiError } from "./ApiError.js";
import mongoose from "mongoose";

export function monoIdIsValid(id) {
   if (!mongoose.Types.ObjectId.isValid(String(id))) {
      throw new ApiError(400, "the id you provide is invalid");
   }
}