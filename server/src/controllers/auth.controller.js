import { authService } from '../services/auth.service.js';
import { successResponse } from '../utils/apiResponse.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/token.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Set HTTP-only cookie for secure refresh token storage
    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 200, 'Login successful', {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return successResponse(res, 200, 'User profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearRefreshTokenCookie(res);
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const result = await authService.refreshAccessToken(token);

    // Rotate refresh token cookie
    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};
