import organizationService from '../services/organization.service.js';
import pmoService from '../services/pmo.service.js';
import { successResponse } from '../utils/apiResponse.js';

class SuperAdminController {
  /**
   * GET /api/super-admin/dashboard/stats
   * Fetch aggregate platform statistics for Super Admin dashboard
   */
  async getDashboardStats(req, res, next) {
    try {
      const stats = await organizationService.getDashboardStats();
      return successResponse(res, 200, 'Platform dashboard statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/organizations
   * List organizations with pagination, search, status filtering, and sorting
   */
  async listOrganizations(req, res, next) {
    try {
      const { page, limit, search, status, sortBy, sortOrder } = req.query;
      const result = await organizationService.getOrganizations({
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });

      return successResponse(
        res,
        200,
        'Organizations retrieved successfully',
        result.data,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/organizations/:id
   * Retrieve organization details, associated PMO, and entity counts
   */
  async getOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const organization = await organizationService.getOrganizationById(id);
      return successResponse(res, 200, 'Organization details retrieved successfully', organization);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/organizations
   * Create a new organization
   */
  async createOrganization(req, res, next) {
    try {
      const { name, code, email, phone, address, status } = req.body;
      const performedByUserId = req.user.id;

      const organization = await organizationService.createOrganization(
        { name, code, email, phone, address, status },
        performedByUserId
      );

      return successResponse(res, 201, 'Organization registered successfully', organization);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/super-admin/organizations/:id
   * Update organization details
   */
  async updateOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, phone, address } = req.body;
      const performedByUserId = req.user.id;

      const updated = await organizationService.updateOrganization(
        id,
        { name, email, phone, address },
        performedByUserId
      );

      return successResponse(res, 200, 'Organization updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/super-admin/organizations/:id/status
   * Activate or deactivate an organization
   */
  async updateOrganizationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const performedByUserId = req.user.id;

      const updated = await organizationService.updateOrganizationStatus(
        id,
        status,
        performedByUserId
      );

      return successResponse(res, 200, `Organization status updated to ${updated.status}`, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/super-admin/organizations/:id
   * Permanently delete an organization and all its associated operational data
   */
  async deleteOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const performedByUserId = req.user.id;

      const result = await organizationService.deleteOrganization(id, performedByUserId);
      return successResponse(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/organizations/:organizationId/pmo
   * Retrieve the primary PMO for an organization
   */
  async getOrganizationPmo(req, res, next) {
    try {
      const { organizationId } = req.params;
      const pmo = await pmoService.getOrganizationPmo(organizationId);

      return successResponse(
        res,
        200,
        pmo ? 'PMO details retrieved successfully' : 'No PMO assigned to this organization',
        pmo
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/organizations/:organizationId/pmo
   * Onboard initial primary PMO for an organization
   */
  async createOrganizationPmo(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { name, email, phone, password, status } = req.body;
      const performedByUserId = req.user.id;

      const pmo = await pmoService.createOrganizationPmo(
        organizationId,
        { name, email, phone, password, status },
        performedByUserId
      );

      return successResponse(res, 201, 'PMO provisioned successfully', pmo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/super-admin/organizations/:organizationId/pmo
   * Update PMO details or credentials
   */
  async updateOrganizationPmo(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { name, phone, password, status } = req.body;
      const performedByUserId = req.user.id;

      const updatedPmo = await pmoService.updateOrganizationPmo(
        organizationId,
        { name, phone, password, status },
        performedByUserId
      );

      return successResponse(res, 200, 'PMO details updated successfully', updatedPmo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/super-admin/organizations/:organizationId/pmo/status
   * Activate or deactivate PMO
   */
  async updateOrganizationPmoStatus(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { status } = req.body;
      const performedByUserId = req.user.id;

      const updatedPmo = await pmoService.updateOrganizationPmoStatus(
        organizationId,
        status,
        performedByUserId
      );

      return successResponse(res, 200, `PMO status updated to ${updatedPmo.status}`, updatedPmo);
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();
export default superAdminController;
