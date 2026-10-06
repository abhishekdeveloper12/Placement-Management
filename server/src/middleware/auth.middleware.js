import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * Validates JWT access token, checks user and tenant status, and sets req.user context
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication credentials were not provided', 'AUTHENTICATION_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 401, 'Authentication token missing', 'TOKEN_MISSING');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.id) {
      return errorResponse(res, 401, 'Authentication token is invalid or expired', 'TOKEN_INVALID');
    }

    // Retrieve active user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists', 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, 'User account is inactive. Please contact your administrator.', 'ACCOUNT_INACTIVE');
    }

    // If tenant user, verify organization is active
    if (user.role === 'PMO' || user.role === 'TEAM_MEMBER') {
      if (!user.organizationId) {
        return errorResponse(res, 403, 'User is not associated with an organization', 'TENANT_NOT_ASSIGNED');
      }

      const org = await Organization.findById(user.organizationId);
      if (!org || org.status !== 'ACTIVE') {
        return errorResponse(res, 403, 'Your organization account is inactive or suspended', 'ORGANIZATION_INACTIVE');
      }
    }

    // Attach immutable server-verified user identity
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return errorResponse(res, 500, 'Internal authentication verification error', 'AUTH_ERROR');
  }
};
