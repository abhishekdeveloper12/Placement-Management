import companyImportService from '../services/companyImport.service.js';

class CompanyImportController {
  /**
   * GET /api/companies/import/template
   * Download import template file
   */
  async getTemplate(req, res, next) {
    try {
      const format = (req.query.format || 'csv').toLowerCase();
      const buffer = companyImportService.generateTemplate(format);

      const filename = `company_import_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      const contentType =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/companies/import/upload
   * Upload file, parse columns, perform row validation & preview
   */
  async uploadAndValidate(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Please upload a CSV, XLS, or XLSX file',
          },
        });
      }

      const explicitOrgId = req.body.organizationId || null;
      let customMapping = {};
      if (req.body.columnMapping) {
        try {
          customMapping =
            typeof req.body.columnMapping === 'string'
              ? JSON.parse(req.body.columnMapping)
              : req.body.columnMapping;
        } catch (e) {
          // ignore invalid json mapping
        }
      }

      const validationSummary = await companyImportService.parseAndValidate(
        req.user,
        req.file.buffer,
        req.file.originalname,
        explicitOrgId,
        customMapping
      );

      return res.status(200).json({
        success: true,
        message: 'File parsed and validated successfully',
        data: validationSummary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/companies/import/execute
   * Execute actual batch insertion of valid rows
   */
  async executeImport(req, res, next) {
    try {
      const { organizationId, fileName, fileType, rows } = req.body;

      const result = await companyImportService.executeImport(req.user, {
        explicitOrgId: organizationId || null,
        fileName: fileName || 'import.csv',
        fileType: fileType || 'CSV',
        rows: rows || [],
      });

      return res.status(200).json({
        success: true,
        message: `Import completed. ${result.importedRows} companies successfully imported.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies/import/history
   * Retrieve company import history
   */
  async getImportHistory(req, res, next) {
    try {
      const { organizationId, page, limit } = req.query;

      const history = await companyImportService.getImportHistory(req.user, {
        explicitOrgId: organizationId || null,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        message: 'Import history retrieved successfully',
        data: history.data,
        meta: history.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies/import/history/:id
   * Retrieve import record details
   */
  async getImportDetail(req, res, next) {
    try {
      const importRecord = await companyImportService.getImportById(req.user, req.params.id);

      return res.status(200).json({
        success: true,
        message: 'Import details retrieved successfully',
        data: importRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies/import/history/:id/error-report
   * Download CSV error report for an import job
   */
  async downloadErrorReport(req, res, next) {
    try {
      const csvContent = await companyImportService.generateErrorReportCSV(req.user, req.params.id);

      const filename = `import_error_report_${req.params.id}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

export const companyImportController = new CompanyImportController();
export default companyImportController;
