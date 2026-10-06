import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'placement_refresh_token';

/**
 * Generate short-lived access token
 */
export const generateAccessToken = (user) => {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    role: user.role,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Generate long-lived refresh token
 */
export const generateRefreshToken = (user) => {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    tokenVersion: user.tokenVersion || 0,
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    return null;
  }
};

/**
 * Set secure HTTP-only refresh token cookie
 */
export const setRefreshTokenCookie = (res, token) => {
  const isProduction = config.nodeEnv === 'production';

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear refresh token cookie on logout
 */
export const clearRefreshTokenCookie = (res) => {
  const isProduction = config.nodeEnv === 'production';

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
  });
};
