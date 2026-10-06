import superAdminAnalyticsService from '../services/superAdminAnalytics.service.js';
import { successResponse } from '../utils/apiResponse.js';

class SuperAdminAnalyticsController {
  /**
   * GET /api/super-admin/dashboard
   * Retrieve global platform-wide analytics across all organizations
   */
  async getGlobalDashboardAnalytics(req, res, next) {
    try {
      const { dateRange, startDate, endDate } = req.query;

      const data = await superAdminAnalyticsService.getGlobalDashboardAnalytics({
        dateRange,
        startDate,
        endDate,
      });

      return successResponse(
        res,
        200,
        'Global platform dashboard analytics retrieved successfully',
        data
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/organizations/:organizationId/analytics
   * Retrieve organization-scoped drill-down analytics for Super Admin
   */
  async getOrganizationAnalytics(req, res, next) {
    try {
      const { organizationId } = req.params;

      const data = await superAdminAnalyticsService.getOrganizationAnalytics(organizationId);

      return successResponse(
        res,
        200,
        'Organization drill-down analytics retrieved successfully',
        data
      );
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminAnalyticsController = new SuperAdminAnalyticsController();
export default superAdminAnalyticsController;
