import interactionService from '../services/interaction.service.js';

class InteractionController {
  /**
   * Record a Quick HR Call Interaction (Team Member only)
   * POST /api/team-member/companies/:companyId/interactions
   */
  async recordCallInteraction(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { companyId } = req.params;
      const result = await interactionService.recordCallInteraction(userContext, companyId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Call record saved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get interactions for an assigned company (Team Member view)
   * GET /api/team-member/companies/:companyId/interactions
   */
  async getTeamMemberCompanyInteractions(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { companyId } = req.params;
      const result = await interactionService.getCompanyInteractions(userContext, companyId, req.query);

      return res.status(200).json({
        success: true,
        message: 'Interactions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lightweight outreach summary card data for a company
   * GET /api/team-member/companies/:companyId/outreach-summary
   */
  async getCompanyOutreachSummary(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { companyId } = req.params;
      const summary = await interactionService.getCompanyOutreachSummary(userContext, companyId);

      return res.status(200).json({
        success: true,
        message: 'Outreach summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Team Member outreach stats & KPI metrics
   * GET /api/team-member/outreach/stats
   */
  async getTeamMemberOutreachStats(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const stats = await interactionService.getTeamMemberOutreachStats(userContext);

      return res.status(200).json({
        success: true,
        message: 'Outreach statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Team Member's own logged interactions list
   * GET /api/team-member/interactions
   */
  async getTeamMemberInteractions(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const result = await interactionService.getTeamMemberInteractions(userContext, req.query);

      return res.status(200).json({
        success: true,
        message: 'Interactions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get interaction detail by ID
   * GET /api/team-member/interactions/:id & GET /api/pmo/interactions/:id
   */
  async getInteractionById(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { id } = req.params;
      const result = await interactionService.getInteractionById(userContext, id);

      return res.status(200).json({
        success: true,
        message: 'Interaction details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization-wide interactions (PMO & Super Admin)
   * GET /api/pmo/interactions
   */
  async getPMOInteractions(req, res, next) {
    try {
      const userContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const result = await interactionService.getOrganizationInteractions(userContext, req.query);

      return res.status(200).json({
        success: true,
        message: 'PMO interactions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get interactions for a company (PMO / Super Admin view)
   * GET /api/companies/:companyId/interactions
   */
  async getCompanyInteractions(req, res, next) {
    try {
      const userContext = {
        id: req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId,
      };

      const { companyId } = req.params;
      const result = await interactionService.getCompanyInteractions(userContext, companyId, req.query);

      return res.status(200).json({
        success: true,
        message: 'Company interactions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new InteractionController();
