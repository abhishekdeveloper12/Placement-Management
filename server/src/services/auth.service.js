import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';

class AuthService {
  /**
   * Authenticate user with email and password
   *
   * @param {string} email - User email address
   * @param {string} password - Raw password
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: Object }>}
   */
  async login(email, password) {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Retrieve user including passwordHash for comparison
    const user = await User.findOne({ email: normalizedEmail })
      .select('+passwordHash')
      .populate('organizationId', 'name code status');

    // Generic error to prevent account enumeration
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verify password hash
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verify user account status
    if (user.status !== 'ACTIVE') {
      const error = new Error('Your account is inactive. Please contact your administrator.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // For tenant roles, verify organization active status
    if (user.role === 'PMO' || user.role === 'TEAM_MEMBER') {
      if (!user.organizationId || user.organizationId.status !== 'ACTIVE') {
        const error = new Error('Your organization account is inactive or suspended');
        error.statusCode = 403;
        error.code = 'ORGANIZATION_INACTIVE';
        throw error;
      }
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Format safe user payload
    const safeUser = this._formatUserResponse(user);

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  /**
   * Fetch current authenticated user's profile
   *
   * @param {string} userId - User ID from authenticated token
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .populate('organizationId', 'name code status');

    if (!user) {
      const error = new Error('User profile not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.status !== 'ACTIVE') {
      const error = new Error('Account is inactive');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    return this._formatUserResponse(user);
  }

  /**
   * Refresh expired access token using valid refresh token
   *
   * @param {string} refreshTokenString - Refresh token from cookie
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: Object }>}
   */
  async refreshAccessToken(refreshTokenString) {
    if (!refreshTokenString) {
      const error = new Error('Refresh token not provided');
      error.statusCode = 401;
      error.code = 'REFRESH_TOKEN_REQUIRED';
      throw error;
    }

    const decoded = verifyRefreshToken(refreshTokenString);
    if (!decoded || !decoded.id) {
      const error = new Error('Refresh token is invalid or expired');
      error.statusCode = 401;
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    const user = await User.findById(decoded.id).populate('organizationId', 'name code status');
    if (!user || user.status !== 'ACTIVE') {
      const error = new Error('User session is no longer active');
      error.statusCode = 401;
      error.code = 'SESSION_EXPIRED';
      throw error;
    }

    // Invalidate if tokenVersion mismatch (e.g. after password reset)
    if (decoded.tokenVersion !== user.tokenVersion) {
      const error = new Error('Session has been revoked. Please log in again.');
      error.statusCode = 401;
      error.code = 'SESSION_REVOKED';
      throw error;
    }

    // Generate fresh tokens (rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this._formatUserResponse(user),
    };
  }

  /**
   * Formats a User document into a safe user object for client responses
   */
  _formatUserResponse(user) {
    const userJson = user.toJSON();
    const result = {
      id: userJson.id,
      name: userJson.name,
      email: userJson.email,
      role: userJson.role,
      status: userJson.status,
      phone: userJson.phone || '',
      lastLoginAt: userJson.lastLoginAt,
    };

    if (user.role === 'SUPER_ADMIN') {
      result.organizationId = null;
      result.organization = null;
    } else {
      result.organizationId = user.organizationId ? (user.organizationId._id ? user.organizationId._id.toString() : user.organizationId.toString()) : null;
      if (user.organizationId && user.organizationId.name) {
        result.organization = {
          id: user.organizationId._id.toString(),
          name: user.organizationId.name,
          code: user.organizationId.code,
        };
      }
    }

    return result;
  }
}

export const authService = new AuthService();
export default authService;
