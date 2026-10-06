import jobRoleService from '../services/jobRole.service.js';
import { successResponse } from '../utils/apiResponse.js';

class JobRoleController {
  /**
   * GET /api/pmo/job-roles
   * List paginated job roles for PMO's organization
   */
  async getJobRoles(req, res, next) {
    try {
      const { page, limit, search, status, sortBy, sortOrder } = req.query;

      const result = await jobRoleService.getJobRoles(req.user, {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });

      return successResponse(res, 200, 'Job roles retrieved successfully', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/job-roles/active
   * Retrieve active job roles for selection in feedback form (Organization-scoped)
   */
  async getActiveJobRoles(req, res, next) {
    try {
      const roles = await jobRoleService.getActiveJobRoles(req.user);
      return successResponse(res, 200, 'Active job roles retrieved successfully', roles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/job-roles
   * Create a new job role in PMO's organization
   */
  async createJobRole(req, res, next) {
    try {
      const { name, description, status } = req.body;
      const role = await jobRoleService.createJobRole(req.user, { name, description, status });
      return successResponse(res, 201, 'Job role created successfully', role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/job-roles/:id
   * Update job role details
   */
  async updateJobRole(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;

      const role = await jobRoleService.updateJobRole(req.user, id, { name, description, status });
      return successResponse(res, 200, 'Job role updated successfully', role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/job-roles/:id/status
   * Toggle job role status (ACTIVE / INACTIVE)
   */
  async updateJobRoleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const role = await jobRoleService.updateJobRoleStatus(req.user, id, status);
      return successResponse(res, 200, 'Job role status updated successfully', role);
    } catch (error) {
      next(error);
    }
  }
}

export const jobRoleController = new JobRoleController();
export default jobRoleController;
