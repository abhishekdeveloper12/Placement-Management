import companyService from '../services/company.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Get company metrics / statistics
 */
export const getCompanyStats = async (req, res, next) => {
  try {
    const stats = await companyService.getCompanyStats(req.user);
    return successResponse(res, 200, 'Company statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated list of companies
 */
export const getCompanies = async (req, res, next) => {
  try {
    const result = await companyService.getCompanies(req.user, req.query);
    return successResponse(
      res,
      200,
      'Companies retrieved successfully',
      result.data,
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Export companies to Excel (.xlsx)
 */
export const exportCompanies = async (req, res, next) => {
  try {
    const result = await companyService.exportCompanies(req.user, req.query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single company details
 */
export const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.user, req.params.id);
    return successResponse(res, 200, 'Company details retrieved successfully', company);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new company
 */
export const createCompany = async (req, res, next) => {
  try {
    const company = await companyService.createCompany(req.user, req.body);
    return successResponse(res, 201, 'Company created successfully', company);
  } catch (error) {
    next(error);
  }
};

/**
 * Update company details
 */
export const updateCompany = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.user, req.params.id, req.body);
    return successResponse(res, 200, 'Company details updated successfully', company);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle company status (ACTIVE / INACTIVE)
 */
export const updateCompanyStatus = async (req, res, next) => {
  try {
    const company = await companyService.updateCompanyStatus(
      req.user,
      req.params.id,
      req.body.status
    );
    return successResponse(res, 200, 'Company status updated successfully', company);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete single company
 */
export const deleteCompany = async (req, res, next) => {
  try {
    const result = await companyService.deleteCompany(req.user, req.params.id);
    return successResponse(
      res,
      200,
      `Company "${result.companyName}" deleted successfully`,
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete selected companies
 */
export const bulkDeleteCompanies = async (req, res, next) => {
  try {
    const result = await companyService.bulkDeleteCompanies(req.user, req.body.companyIds);
    return successResponse(
      res,
      200,
      `Successfully deleted ${result.deletedCount} company records`,
      result
    );
  } catch (error) {
    next(error);
  }
};
