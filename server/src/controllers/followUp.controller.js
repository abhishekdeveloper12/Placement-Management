import followUpService from '../services/followUp.service.js';

class FollowUpController {
  /**
   * Create a manual follow-up task (Team Member)
   * POST /api/team-member/follow-ups
   */
  async createFollowUp(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const result = await followUpService.createFollowUp(userContext, req.body);

      return res.status(201).json({
        success: true,
        message: 'Follow-up task created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get team member assigned follow-ups list
   * GET /api/team-member/follow-ups
   */
  async getTeamMemberFollowUps(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const result = await followUpService.getTeamMemberFollowUps(userContext, req.query);

      return res.status(200).json({
        success: true,
        message: 'Follow-ups retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow-up detail by ID (Team Member)
   * GET /api/team-member/follow-ups/:id
   */
  async getFollowUpById(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { id } = req.params;
      const result = await followUpService.getFollowUpById(userContext, id);

      return res.status(200).json({
        success: true,
        message: 'Follow-up detail retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a follow-up task (Team Member)
   * PATCH /api/team-member/follow-ups/:id/complete
   */
  async completeFollowUp(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { id } = req.params;
      const result = await followUpService.completeFollowUp(userContext, id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Follow-up completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a follow-up task (Team Member)
   * PATCH /api/team-member/follow-ups/:id/cancel
   */
  async cancelFollowUp(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { id } = req.params;
      const result = await followUpService.cancelFollowUp(userContext, id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Follow-up cancelled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization-wide follow-ups (PMO & Super Admin)
   * GET /api/pmo/follow-ups
   */
  async getPMOFollowUps(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const result = await followUpService.getPMOFollowUps(userContext, req.query);

      return res.status(200).json({
        success: true,
        message: 'PMO follow-ups retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get PMO follow-up detail by ID
   * GET /api/pmo/follow-ups/:id
   */
  async getPMOFollowUpById(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { id } = req.params;
      const result = await followUpService.getFollowUpById(userContext, id);

      return res.status(200).json({
        success: true,
        message: 'PMO follow-up detail retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow-up operational statistics (Team Member & PMO)
   * GET /api/team-member/follow-ups/stats & GET /api/pmo/follow-ups/stats
   */
  async getFollowUpStats(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const stats = await followUpService.getFollowUpStats(userContext);

      return res.status(200).json({
        success: true,
        message: 'Follow-up statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FollowUpController();
