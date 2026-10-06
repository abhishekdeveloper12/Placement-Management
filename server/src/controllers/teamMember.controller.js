import teamMemberService from '../services/teamMember.service.js';
import { successResponse } from '../utils/apiResponse.js';

class TeamMemberController {
  /**
   * GET /api/pmo/dashboard/stats
   * Retrieve team member summary statistics for the authenticated PMO's organization
   */
  async getDashboardStats(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const stats = await teamMemberService.getTeamMemberStats(organizationId);

      return successResponse(
        res,
        200,
        'Team member statistics retrieved successfully',
        stats
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pmo/team-members
   * List team members with pagination, search, and status filtering
   */
  async listTeamMembers(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const { page, limit, search, status, sortBy, sortOrder } = req.query;

      const result = await teamMemberService.getTeamMembers(organizationId, {
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
        'Team members retrieved successfully',
        result.data,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pmo/team-members/:id
   * Retrieve single team member details
   */
  async getTeamMember(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const { id } = req.params;

      const member = await teamMemberService.getTeamMemberById(organizationId, id);

      return successResponse(
        res,
        200,
        'Team member details retrieved successfully',
        member
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/team-members
   * Create a new operational team member in the PMO's organization
   */
  async createTeamMember(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const performedByUserId = req.user.id;
      const { name, email, phone, password, status } = req.body;

      const member = await teamMemberService.createTeamMember(
        organizationId,
        { name, email, phone, password, status },
        performedByUserId
      );

      return successResponse(
        res,
        201,
        'Team member created successfully',
        member
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/team-members/:id
   * Update team member details
   */
  async updateTeamMember(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const performedByUserId = req.user.id;
      const { id } = req.params;
      const { name, email, phone, status, password } = req.body;

      const updated = await teamMemberService.updateTeamMember(
        organizationId,
        id,
        { name, email, phone, status, password },
        performedByUserId
      );

      return successResponse(
        res,
        200,
        'Team member updated successfully',
        updated
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/team-members/:id/status
   * Toggle team member status (ACTIVE / INACTIVE)
   */
  async updateTeamMemberStatus(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const performedByUserId = req.user.id;
      const { id } = req.params;
      const { status } = req.body;

      const updated = await teamMemberService.updateTeamMemberStatus(
        organizationId,
        id,
        status,
        performedByUserId
      );

      return successResponse(
        res,
        200,
        `Team member status updated to ${updated.status}`,
        updated
      );
    } catch (error) {
      next(error);
    }
  }
}

export const teamMemberController = new TeamMemberController();
export default teamMemberController;
