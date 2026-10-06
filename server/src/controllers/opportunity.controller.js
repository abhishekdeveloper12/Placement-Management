import fs from 'fs';
import opportunityService from '../services/opportunity.service.js';

class OpportunityController {
  /**
   * Create a new job opportunity
   */
  async createOpportunity(req, res, next) {
    try {
      const payload = req.body || {};
      // If companyId is passed in route params e.g. /companies/:companyId/opportunities
      if (req.params.companyId && !payload.companyId) {
        payload.companyId = req.params.companyId;
      }

      const result = await opportunityService.createOpportunity(req.user, payload);
      return res.status(201).json({
        success: true,
        message: 'Job opportunity created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of job opportunities
   */
  async getOpportunities(req, res, next) {
    try {
      const params = req.query || {};
      if (req.params.companyId) {
        params.companyId = req.params.companyId;
      }

      const result = await opportunityService.getOpportunities(req.user, params);
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single job opportunity details by ID
   */
  async getOpportunityById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await opportunityService.getOpportunityById(req.user, id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update job opportunity
   */
  async updateOpportunity(req, res, next) {
    try {
      const { id } = req.params;
      const result = await opportunityService.updateOpportunity(req.user, id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Job opportunity updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete or close job opportunity
   */
  async deleteOpportunity(req, res, next) {
    try {
      const { id } = req.params;
      const result = await opportunityService.deleteOpportunity(req.user, id);
      return res.status(200).json({
        success: true,
        message: 'Job opportunity closed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload or replace JD document
   */
  async uploadOrReplaceJD(req, res, next) {
    try {
      const { id } = req.params;
      const file = req.file;
      const result = await opportunityService.uploadOrReplaceJD(req.user, id, file);
      return res.status(200).json({
        success: true,
        message: 'JD document uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove attached JD document
   */
  async deleteJD(req, res, next) {
    try {
      const { id } = req.params;
      const result = await opportunityService.deleteJD(req.user, id);
      return res.status(200).json({
        success: true,
        message: 'JD document removed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Securely stream/download JD document
   */
  async downloadJD(req, res, next) {
    try {
      const { id } = req.params;
      const { document, filePath } = await opportunityService.getJDFileForDownload(req.user, id);

      if (!fs.existsSync(filePath)) {
        const error = new Error('Physical file not found on server storage');
        error.statusCode = 404;
        error.code = 'FILE_NOT_FOUND';
        throw error;
      }

      const encodedName = encodeURIComponent(document.originalFileName);
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Shortlist, unshortlist, or update review note for a job opportunity (PMO & SUPER_ADMIN only)
   */
  async shortlistOpportunity(req, res, next) {
    try {
      const { id } = req.params;
      const result = await opportunityService.shortlistOpportunity(req.user, id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Opportunity shortlist status updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const opportunityController = new OpportunityController();
export default opportunityController;
