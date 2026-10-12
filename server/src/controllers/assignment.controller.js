import assignmentService from '../services/assignment.service.js';

class AssignmentController {
  /**
   * POST /api/pmo/assignments
   * Assign or reassign a single company to a Team Member
   */
  async assignCompany(req, res, next) {
    try {
      const { companyId, assignedTo, reason } = req.body;
      const result = await assignmentService.assignCompany(req.user, {
        companyId,
        assignedTo,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: result.alreadyAssigned
          ? result.message
          : 'Company assignment completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/bulk
   * Bulk assign multiple companies to a target Team Member
   */
  async assignBulkCompanies(req, res, next) {
    try {
      const { companyIds, assignedTo, reason } = req.body;
      const result = await assignmentService.assignBulkCompanies(req.user, {
        companyIds,
        assignedTo,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Bulk assignment processed: ${result.assigned} assigned, ${result.reassigned} reassigned, ${result.alreadyAssigned} already assigned, ${result.failed} failed.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/matching-company-ids
   * PMO: Retrieve all matching company IDs and summaries for current search/filters
   */
  async getMatchingCompanyIds(req, res, next) {
    try {
      const filterParams = req.body || {};
      const result = await assignmentService.getMatchingCompanyIds(req.user, filterParams);

      return res.status(200).json({
        success: true,
        message: 'Matching companies retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/preview-quantity
   * PMO: Preview assignment of N companies to a single Team Member
   */
  async previewQuantityAssignment(req, res, next) {
    try {
      const { quantity, assignedTo, unassignedOnly, sortOrder, filterParams } = req.body;
      const preview = await assignmentService.previewQuantityAssignment(req.user, {
        quantity,
        assignedTo,
        unassignedOnly,
        sortOrder,
        filterParams,
      });

      return res.status(200).json({
        success: true,
        message: 'Assignment preview generated successfully',
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/assign-quantity
   * PMO: Assign N companies to a single Team Member
   */
  async assignByQuantity(req, res, next) {
    try {
      const { quantity, assignedTo, unassignedOnly, sortOrder, filterParams, reason } = req.body;
      const result = await assignmentService.assignByQuantity(req.user, {
        quantity,
        assignedTo,
        unassignedOnly,
        sortOrder,
        filterParams,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Successfully assigned ${result.assigned + result.reassigned} companies to ${result.targetMember?.name || 'team member'}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/preview-distribution
   * PMO: Preview distribution plan across multiple Team Members
   */
  async previewDistribution(req, res, next) {
    try {
      const {
        totalQuantity,
        teamMemberIds,
        manualAllocations,
        unassignedOnly,
        sortOrder,
        filterParams,
        distributionType,
      } = req.body;

      const preview = await assignmentService.previewDistribution(req.user, {
        totalQuantity,
        teamMemberIds,
        manualAllocations,
        unassignedOnly,
        sortOrder,
        filterParams,
        distributionType,
      });

      return res.status(200).json({
        success: true,
        message: 'Distribution preview calculated successfully',
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pmo/assignments/execute-distribution
   * PMO: Execute distribution across multiple Team Members
   */
  async executeDistribution(req, res, next) {
    try {
      const { allocations, reason } = req.body;
      const result = await assignmentService.executeDistribution(req.user, {
        allocations,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Distribution completed: assigned ${result.grandTotalAssigned + result.grandTotalReassigned} companies across ${result.totalMembers} team members`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/assignments/:companyId/reassign
   * Reassign a company to another Team Member
   */
  async reassignCompany(req, res, next) {
    try {
      const { assignedTo, reason } = req.body;
      const result = await assignmentService.assignCompany(req.user, {
        companyId: req.params.companyId,
        assignedTo,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: 'Company reassigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/pmo/assignments/:companyId/unassign
   * Unassign a company (ends active assignment)
   */
  async unassignCompany(req, res, next) {
    try {
      const { reason } = req.body;
      const result = await assignmentService.unassignCompany(req.user, req.params.companyId, {
        reason,
      });

      return res.status(200).json({
        success: true,
        message: 'Company unassigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pmo/companies/:companyId/assignments
   * Retrieve chronological assignment history for a company
   */
  async getCompanyAssignmentHistory(req, res, next) {
    try {
      const history = await assignmentService.getCompanyAssignmentHistory(
        req.user,
        req.params.companyId
      );

      return res.status(200).json({
        success: true,
        message: 'Company assignment history retrieved successfully',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/team-member/companies
   * Retrieve only companies currently assigned to authenticated Team Member
   */
  async getTeamMemberAssignedCompanies(req, res, next) {
    try {
      const { page, limit, search, industry, city, outreachStatus, sortBy, sortOrder } = req.query;
      const result = await assignmentService.getTeamMemberAssignedCompanies(req.user, {
        page,
        limit,
        search,
        industry,
        city,
        outreachStatus,
        sortBy,
        sortOrder,
      });

      return res.status(200).json({
        success: true,
        message: 'Assigned companies retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/team-member/companies/:id
   * Retrieve single assigned company detail by ID
   */
  async getTeamMemberAssignedCompanyDetail(req, res, next) {
    try {
      const company = await assignmentService.getTeamMemberAssignedCompanyById(
        req.user,
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message: 'Assigned company details retrieved successfully',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const assignmentController = new AssignmentController();
export default assignmentController;
