import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import Company, { normalizeCompanyName, normalizeWebsite } from '../models/Company.js';
import Contact from '../models/Contact.js';
import Organization from '../models/Organization.js';
import CompanyImport from '../models/CompanyImport.js';
import auditService from './audit.service.js';

// Synonyms for auto-detecting headers
const HEADER_SYNONYMS = {
  companyName: ['company name', 'company', 'organization', 'name', 'company_name', 'organization name'],
  industry: ['industry', 'sector', 'domain', 'field', 'business type'],
  website: ['website', 'site', 'url', 'company website', 'web', 'domain url'],
  linkedin: ['linkedin', 'linkedin url', 'company linkedin', 'company linkedin url'],
  country: ['country', 'nation'],
  state: ['state', 'province', 'region'],
  city: ['city', 'town'],
  location: ['location', 'address', 'office location', 'street address'],
  remarks: ['remarks', 'notes', 'comments', 'description'],
  hrName: ['hr name', 'contact name', 'hr contact', 'hr', 'contact', 'primary contact name'],
  hrDesignation: ['hr designation', 'designation', 'role', 'contact designation', 'title', 'job title'],
  hrEmail: ['hr email', 'email', 'contact email', 'hr email address', 'email address'],
  hrPhone: ['hr phone', 'phone', 'contact phone', 'mobile', 'contact mobile', 'phone number'],
  hrLinkedin: ['hr linkedin', 'contact linkedin', 'hr linkedin url'],
};

class CompanyImportService {
  /**
   * Resolve target organization ID based on user context and explicit target
   */
  async resolveTargetOrg(userContext, explicitOrgId) {
    if (userContext.role === 'PMO') {
      return userContext.organizationId;
    }

    if (userContext.role === 'SUPER_ADMIN') {
      if (!explicitOrgId || !mongoose.Types.ObjectId.isValid(explicitOrgId)) {
        const error = new Error('Target organization ID is required for Super Admin import');
        error.statusCode = 400;
        error.code = 'ORGANIZATION_REQUIRED';
        throw error;
      }
      const org = await Organization.findById(explicitOrgId);
      if (!org) {
        const error = new Error('Target organization does not exist');
        error.statusCode = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
      }
      if (org.status !== 'ACTIVE') {
        const error = new Error('Cannot import companies for an inactive organization');
        error.statusCode = 400;
        error.code = 'ORGANIZATION_INACTIVE';
        throw error;
      }
      return explicitOrgId;
    }

    const error = new Error('Unauthorized to perform bulk import');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  /**
   * Generate downloadable template in CSV or XLSX format
   */
  generateTemplate(format = 'csv') {
    const headers = [
      'Company Name',
      'Industry',
      'Website',
      'LinkedIn',
      'Country',
      'State',
      'City',
      'Location',
      'Remarks',
      'HR Name',
      'HR Designation',
      'HR Email',
      'HR Phone',
      'HR LinkedIn',
    ];

    const sampleRows = [
      [
        'Google India',
        'Technology',
        'https://google.com',
        'https://linkedin.com/company/google',
        'India',
        'Karnataka',
        'Bengaluru',
        'Outer Ring Road',
        'Key enterprise client',
        'Sundar Pichai',
        'CEO',
        'hr@google.com',
        '+91-9876543210',
        'https://linkedin.com/in/sundarpichai',
      ],
      [
        'Microsoft India',
        'Information Technology',
        'https://microsoft.com',
        'https://linkedin.com/company/microsoft',
        'India',
        'Telangana',
        'Hyderabad',
        'HITEC City',
        'Priority campus recruiter',
        'Satya Nadella',
        'CEO',
        'hr@microsoft.com',
        '+91-9876543211',
        'https://linkedin.com/in/satyanadella',
      ],
    ];

    const worksheetData = [headers, ...sampleRows];
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Company Import Template');

    if (format.toLowerCase() === 'xlsx') {
      return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    // Default CSV
    return xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });
  }

  /**
   * Parse uploaded file buffer and perform row validation and mapping
   */
  async parseAndValidate(userContext, fileBuffer, fileName = 'import.csv', explicitOrgId = null, customMapping = {}) {
    const targetOrgId = await this.resolveTargetOrg(userContext, explicitOrgId);

    let workbook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (err) {
      const error = new Error('Invalid or corrupted spreadsheet file. Unable to parse.');
      error.statusCode = 400;
      error.code = 'INVALID_FILE_FORMAT';
      throw error;
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      const error = new Error('Spreadsheet file contains no worksheets');
      error.statusCode = 400;
      error.code = 'EMPTY_FILE';
      throw error;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      const error = new Error('Spreadsheet is empty');
      error.statusCode = 400;
      error.code = 'EMPTY_FILE';
      throw error;
    }

    // Identify header row (first non-empty row)
    let headerRowIndex = 0;
    while (headerRowIndex < rawRows.length && (!rawRows[headerRowIndex] || rawRows[headerRowIndex].length === 0 || rawRows[headerRowIndex].every((cell) => !cell.toString().trim()))) {
      headerRowIndex++;
    }

    if (headerRowIndex >= rawRows.length) {
      const error = new Error('No column headers found in spreadsheet');
      error.statusCode = 400;
      error.code = 'NO_HEADERS_FOUND';
      throw error;
    }

    const rawHeaders = rawRows[headerRowIndex].map((h) => h.toString().trim());

    // Detect column mapping
    const detectedMapping = {};
    const usedHeaders = new Set();

    Object.keys(HEADER_SYNONYMS).forEach((fieldKey) => {
      if (customMapping[fieldKey]) {
        detectedMapping[fieldKey] = customMapping[fieldKey];
        usedHeaders.add(customMapping[fieldKey]);
        return;
      }

      const synonyms = HEADER_SYNONYMS[fieldKey];
      const matchedHeader = rawHeaders.find((h) => synonyms.includes(h.toLowerCase()));
      if (matchedHeader) {
        detectedMapping[fieldKey] = matchedHeader;
        usedHeaders.add(matchedHeader);
      } else {
        detectedMapping[fieldKey] = '';
      }
    });

    // Extract data rows
    const dataRows = rawRows.slice(headerRowIndex + 1).filter((row) => row && row.some((cell) => cell.toString().trim() !== ''));

    if (dataRows.length === 0) {
      const error = new Error('Spreadsheet contains headers but no data rows to import');
      error.statusCode = 400;
      error.code = 'NO_DATA_ROWS';
      throw error;
    }

    // Pre-fetch existing companies for duplicate checks
    const existingCompanies = await Company.find({ organizationId: targetOrgId }, 'companyName normalizedName website');
    const dbNormalizedNames = new Set(existingCompanies.map((c) => c.normalizedName));
    const dbWebsites = new Set(existingCompanies.map((c) => normalizeWebsite(c.website)).filter(Boolean));

    const fileNormalizedNames = new Set();
    const fileWebsites = new Set();

    const preview = [];
    let validRowsCount = 0;
    let invalidRowsCount = 0;
    let duplicateRowsCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    dataRows.forEach((row, index) => {
      const rowNumber = headerRowIndex + 2 + index; // 1-indexed Excel row number

      // Extract row data using mapping
      const getCellValue = (fieldKey) => {
        const headerName = detectedMapping[fieldKey];
        if (!headerName) return '';
        const colIdx = rawHeaders.indexOf(headerName);
        if (colIdx === -1 || !row[colIdx]) return '';
        return row[colIdx].toString().trim();
      };

      const companyData = {
        companyName: getCellValue('companyName'),
        industry: getCellValue('industry'),
        website: getCellValue('website'),
        linkedin: getCellValue('linkedin'),
        country: getCellValue('country') || 'India',
        state: getCellValue('state'),
        city: getCellValue('city'),
        location: getCellValue('location'),
        remarks: getCellValue('remarks'),
        hrName: getCellValue('hrName'),
        hrDesignation: getCellValue('hrDesignation'),
        hrEmail: getCellValue('hrEmail'),
        hrPhone: getCellValue('hrPhone'),
        hrLinkedin: getCellValue('hrLinkedin'),
      };

      const reasons = [];
      let status = 'VALID';

      // 1. Required field check: Company Name
      if (!companyData.companyName) {
        reasons.push('Company Name is required');
        status = 'INVALID';
      }

      // 2. Email format check (if HR Email provided)
      if (companyData.hrEmail && !emailRegex.test(companyData.hrEmail)) {
        reasons.push(`Invalid HR email format "${companyData.hrEmail}"`);
        status = 'INVALID';
      }

      // Duplicate detection if companyName is present
      if (companyData.companyName) {
        const normName = normalizeCompanyName(companyData.companyName);
        const normWeb = normalizeWebsite(companyData.website);

        // Check in-file duplicate
        let isFileDuplicate = false;
        if (fileNormalizedNames.has(normName)) {
          reasons.push(`Duplicate company name "${companyData.companyName}" within this file`);
          isFileDuplicate = true;
        } else if (normWeb && fileWebsites.has(normWeb)) {
          reasons.push(`Duplicate website "${companyData.website}" within this file`);
          isFileDuplicate = true;
        }

        // Check database duplicate
        let isDbDuplicate = false;
        if (dbNormalizedNames.has(normName)) {
          reasons.push(`Company "${companyData.companyName}" already exists in the organization database`);
          isDbDuplicate = true;
        } else if (normWeb && dbWebsites.has(normWeb)) {
          reasons.push(`Company website "${companyData.website}" already exists in the organization database`);
          isDbDuplicate = true;
        }

        if (isFileDuplicate || isDbDuplicate) {
          status = 'DUPLICATE';
        } else if (status === 'VALID') {
          // Register in file sets for subsequent rows
          fileNormalizedNames.add(normName);
          if (normWeb) fileWebsites.add(normWeb);
        }
      }

      if (status === 'VALID') validRowsCount++;
      else if (status === 'INVALID') invalidRowsCount++;
      else if (status === 'DUPLICATE') duplicateRowsCount++;

      preview.push({
        rowNumber,
        status,
        reasons,
        data: companyData,
      });
    });

    return {
      organizationId: targetOrgId.toString(),
      fileName,
      rawHeaders,
      detectedMapping,
      totalRows: dataRows.length,
      validRowsCount,
      invalidRowsCount,
      duplicateRowsCount,
      preview,
    };
  }

  /**
   * Execute actual import of valid rows
   */
  async executeImport(userContext, { explicitOrgId = null, fileName = 'import.csv', fileType = 'CSV', rows = [] }) {
    const targetOrgId = await this.resolveTargetOrg(userContext, explicitOrgId);

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      const error = new Error('No rows provided for import');
      error.statusCode = 400;
      error.code = 'NO_ROWS_PROVIDED';
      throw error;
    }

    // Audit Log start
    await auditService.logAction({
      organizationId: targetOrgId,
      performedBy: userContext.id,
      action: 'COMPANY_IMPORT_STARTED',
      entityType: 'CompanyImport',
      metadata: { fileName, totalRowsSubmitted: rows.length },
    });

    let importedCount = 0;
    let failedCount = 0;
    const errorReport = [];

    for (const item of rows) {
      const rowData = item.data || item;
      const rowNum = item.rowNumber || importedCount + failedCount + 1;

      if (!rowData || !rowData.companyName) {
        failedCount++;
        errorReport.push({
          rowNumber: rowNum,
          companyName: rowData?.companyName || 'N/A',
          status: 'FAILED',
          reason: 'Company Name missing',
        });
        continue;
      }

      try {
        const normName = normalizeCompanyName(rowData.companyName);

        // Final safety check against race conditions
        const existing = await Company.findOne({
          organizationId: targetOrgId,
          normalizedName: normName,
        });

        if (existing) {
          failedCount++;
          errorReport.push({
            rowNumber: rowNum,
            companyName: rowData.companyName,
            status: 'DUPLICATE',
            reason: 'Company with similar name already exists',
          });
          continue;
        }

        const company = await Company.create({
          organizationId: targetOrgId,
          companyName: rowData.companyName.trim(),
          normalizedName: normName,
          industry: rowData.industry?.trim() || '',
          website: rowData.website?.trim().toLowerCase() || '',
          linkedin: rowData.linkedin?.trim() || '',
          country: rowData.country?.trim() || 'India',
          state: rowData.state?.trim() || '',
          city: rowData.city?.trim() || '',
          location: rowData.location?.trim() || '',
          remarks: rowData.remarks?.trim() || '',
          status: 'ACTIVE',
          createdBy: userContext.id,
        });

        if (rowData.hrName && rowData.hrName.trim()) {
          await Contact.create({
            organizationId: targetOrgId,
            companyId: company._id,
            name: rowData.hrName.trim(),
            designation: rowData.hrDesignation?.trim() || '',
            email: rowData.hrEmail?.trim().toLowerCase() || '',
            phone: rowData.hrPhone?.trim() || '',
            linkedin: rowData.hrLinkedin?.trim() || '',
            isPrimary: true,
          });
        }

        importedCount++;
      } catch (err) {
        failedCount++;
        errorReport.push({
          rowNumber: rowNum,
          companyName: rowData.companyName,
          status: 'FAILED',
          reason: err.message || 'Database creation failure',
        });
      }
    }

    const overallStatus =
      failedCount === 0 ? 'COMPLETED' : importedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'FAILED';

    const companyImportRecord = await CompanyImport.create({
      organizationId: targetOrgId,
      uploadedBy: userContext.id,
      fileName,
      fileType: fileType.toUpperCase(),
      totalRows: rows.length,
      validRows: importedCount,
      invalidRows: 0,
      duplicateRows: 0,
      importedRows: importedCount,
      failedRows: failedCount,
      status: overallStatus,
      errorReport,
    });

    // Audit Log completion
    await auditService.logAction({
      organizationId: targetOrgId,
      performedBy: userContext.id,
      action: 'COMPANY_IMPORT_COMPLETED',
      entityType: 'CompanyImport',
      entityId: companyImportRecord._id,
      metadata: {
        fileName,
        importedCount,
        failedCount,
        status: overallStatus,
      },
    });

    return companyImportRecord.toJSON();
  }

  /**
   * Get list of import history records for an organization
   */
  async getImportHistory(userContext, { explicitOrgId = null, page = 1, limit = 20 } = {}) {
    const targetOrgId = await this.resolveTargetOrg(userContext, explicitOrgId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [imports, total] = await Promise.all([
      CompanyImport.find({ organizationId: targetOrgId })
        .populate('uploadedBy', 'name email')
        .populate('organizationId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CompanyImport.countDocuments({ organizationId: targetOrgId }),
    ]);

    return {
      data: imports.map((imp) => imp.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single import details with error report
   */
  async getImportById(userContext, importId) {
    if (!mongoose.Types.ObjectId.isValid(importId)) {
      const error = new Error('Invalid import ID format');
      error.statusCode = 400;
      error.code = 'INVALID_IMPORT_ID';
      throw error;
    }

    const importRecord = await CompanyImport.findById(importId)
      .populate('uploadedBy', 'name email')
      .populate('organizationId', 'name code');

    if (!importRecord) {
      const error = new Error('Import record not found');
      error.statusCode = 404;
      error.code = 'IMPORT_NOT_FOUND';
      throw error;
    }

    // Access check
    const orgIdStr = (importRecord.organizationId._id || importRecord.organizationId).toString();
    if (userContext.role === 'PMO' && orgIdStr !== userContext.organizationId.toString()) {
      const error = new Error('Import record not found');
      error.statusCode = 404;
      error.code = 'IMPORT_NOT_FOUND';
      throw error;
    }

    return importRecord.toJSON();
  }

  /**
   * Generate CSV content for skipped/failed error report download
   */
  async generateErrorReportCSV(userContext, importId) {
    const importRecord = await this.getImportById(userContext, importId);

    const headers = ['Row Number', 'Company Name', 'Status', 'Failure Reason'];
    const rows = (importRecord.errorReport || []).map((err) => [
      err.rowNumber,
      `"${(err.companyName || '').replace(/"/g, '""')}"`,
      err.status,
      `"${(err.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  }
}

export const companyImportService = new CompanyImportService();
export default companyImportService;
