import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  // Known / expected errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.error ?? []
    });
  }

  // Unknown / programming / DB errors
  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
};

export { errorHandler };
