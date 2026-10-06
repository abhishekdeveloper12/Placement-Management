import pmoAnalyticsService from '../services/pmoAnalytics.service.js';
import { successResponse } from '../utils/apiResponse.js';

class PMOAnalyticsController {
  /**
   * GET /api/pmo/dashboard
   * Retrieve organization-level PMO dashboard metrics, team performance, and charts
   */
  async getDashboardAnalytics(req, res, next) {
    try {
      const { dateRange, startDate, endDate, teamMemberId } = req.query;

      const data = await pmoAnalyticsService.getDashboardAnalytics(req.user, {
        dateRange,
        startDate,
        endDate,
        teamMemberId,
      });

      return successResponse(
        res,
        200,
        'PMO dashboard analytics retrieved successfully',
        data
      );
    } catch (error) {
      next(error);
    }
  }
}

export const pmoAnalyticsController = new PMOAnalyticsController();
export default pmoAnalyticsController;
