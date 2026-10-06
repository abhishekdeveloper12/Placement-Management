import api from './api';

/**
 * Trigger browser file download from Blob
 */
const triggerFileDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const companyImportService = {
  /**
   * Download sample import template (CSV or XLSX)
   */
  async downloadTemplate(format = 'csv') {
    const response = await api.get(`/companies/import/template?format=${format}`, {
      responseType: 'blob',
    });
    const filename = `company_import_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    triggerFileDownload(response, filename);
  },

  /**
   * Upload file and receive column mapping & preview validation
   */
  async uploadAndValidate(file, organizationId = null, columnMapping = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (organizationId) {
      formData.append('organizationId', organizationId);
    }
    if (columnMapping) {
      formData.append('columnMapping', JSON.stringify(columnMapping));
    }

    const response = await api.post('/companies/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  /**
   * Execute actual bulk insertion of valid rows
   */
  async executeImport(payload) {
    const response = await api.post('/companies/import/execute', payload);
    return response;
  },

  /**
   * Get list of import history records
   */
  async getImportHistory(params = {}) {
    const response = await api.get('/companies/import/history', { params });
    return response;
  },

  /**
   * Get single import details by ID
   */
  async getImportDetail(id) {
    const response = await api.get(`/companies/import/history/${id}`);
    return response;
  },

  /**
   * Download CSV error report for a given import ID
   */
  async downloadErrorReport(id) {
    const response = await api.get(`/companies/import/history/${id}/error-report`, {
      responseType: 'blob',
    });
    const filename = `import_error_report_${id}.csv`;
    triggerFileDownload(response, filename);
  },
};

export default companyImportService;
