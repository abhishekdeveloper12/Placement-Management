/**
 * Standardized API response utilities conforming to DEVELOPMENT_RULES.md
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = {}, meta = null) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', code = 'SERVER_ERROR', details = []) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};
