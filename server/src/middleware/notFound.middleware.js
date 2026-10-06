import { errorResponse } from '../utils/apiResponse.js';

export const notFoundMiddleware = (req, res) => {
  return errorResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND');
};
