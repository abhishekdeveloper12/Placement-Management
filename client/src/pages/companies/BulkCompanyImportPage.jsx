import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import companyImportService from '../../services/companyImport.service';
import superAdminService from '../../services/superAdmin.service';
import Badge from '../../components/common/Badge';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Building2,
  FileText,
  History,
  Check,
  AlertCircle,
  Loader2,
  Filter,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const TARGET_FIELDS = [
  { key: 'companyName', label: 'Company Name', required: true },
  { key: 'industry', label: 'Industry Sector', required: false },
  { key: 'website', label: 'Website URL', required: false },
  { key: 'linkedin', label: 'LinkedIn Profile', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'location', label: 'Location / Office Address', required: false },
  { key: 'remarks', label: 'Remarks / Notes', required: false },
  { key: 'hrName', label: 'HR Contact Name', required: false },
  { key: 'hrDesignation', label: 'HR Designation', required: false },
  { key: 'hrEmail', label: 'HR Email Address', required: false },
  { key: 'hrPhone', label: 'HR Phone / Mobile', required: false },
  { key: 'hrLinkedin', label: 'HR LinkedIn Profile', required: false },
];

export default function BulkCompanyImportPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'history'
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Mapping, 3: Validation, 4: Results

  // Super Admin target organization state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  // Step 1 State: File upload
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [templateFormat, setTemplateFormat] = useState('csv');

  // Step 2 State: Column Mapping
  const [rawHeaders, setRawHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // Step 3 State: Validation & Preview
  const [validationSummary, setValidationSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, VALID, DUPLICATE, INVALID
  const [validating, setValidating] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewLimit, setPreviewLimit] = useState(10);

  // Step 4 State: Execute Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Import History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Error alert
  const [error, setError] = useState(null);

  // Fetch organizations for Super Admin dropdown
  useEffect(() => {
    if (isSuperAdmin) {
      superAdminService
        .getOrganizations({ limit: 100, status: 'ACTIVE' })
        .then((res) => {
          if (res.success) setOrganizations(res.data);
        })
        .catch((err) => console.error('Failed to fetch organizations:', err));
    }
  }, [isSuperAdmin]);

  // Fetch Import History
  const fetchImportHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const response = await companyImportService.getImportHistory({
          page,
          limit: historyPagination.limit,
          organizationId: isSuperAdmin ? selectedOrgId : undefined,
        });
        if (response.success) {
          setHistoryList(response.data);
          setHistoryPagination((prev) => ({
            ...prev,
            page,
            total: response.meta?.total || response.data.length,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch import history:', err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyPagination.limit, isSuperAdmin, selectedOrgId]
  );

  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportHistory(1);
    }
  }, [activeTab, fetchImportHistory]);

  // Handle Download Template
  const handleDownloadTemplate = async (format) => {
    try {
      await companyImportService.downloadTemplate(format);
    } catch (err) {
      alert('Failed to download template file');
    }
  };

  // Drag & drop file handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setError(null);
    const validExts = ['.csv', '.xls', '.xlsx'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload a valid CSV, XLS, or XLSX spreadsheet file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selectedFile);
  };

  // Step 1 -> Step 2: Upload File & Parse Headers
  const handleUploadAndValidate = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (isSuperAdmin && !selectedOrgId) {
      setError('Please select a target organization for bulk import.');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const result = await companyImportService.uploadAndValidate(file, selectedOrgId, columnMapping);
      if (result.success) {
        setValidationSummary(result.data);
        setRawHeaders(result.data.rawHeaders || []);
        setColumnMapping(result.data.detectedMapping || {});
        setCurrentStep(3); // Go to Validation & Preview
      }
    } catch (err) {
      console.error('File validation error:', err);
      setError(err.response?.data?.error?.message || 'Failed to upload and parse file.');
    } finally {
      setValidating(false);
    }
  };

  // Update specific column mapping
  const handleMappingChange = (targetKey, headerName) => {
    setColumnMapping((prev) => ({
      ...prev,
      [targetKey]: headerName,
    }));
  };

  // Re-run validation with updated mapping
  const handleRevalidateWithMapping = async () => {
    if (!file) return;
    setValidating(true);
    setError(null);
    try {
      const result = await companyImportService.uploadAndValidate(file, selectedOrgId, columnMapping);
      if (result.success) {
        setValidationSummary(result.data);
        setCurrentStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to re-validate file mapping.');
    } finally {
      setValidating(false);
    }
  };

  // Step 3 -> Step 4: Execute Import of Valid Rows
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    const validRows = validationSummary.preview.filter((row) => row.status === 'VALID');
    if (validRows.length === 0) {
      alert('There are no valid rows to import in this file.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = await companyImportService.executeImport({
        organizationId: isSuperAdmin ? selectedOrgId : undefined,
        fileName: file.name,
        fileType: file.name.endsWith('.xlsx') ? 'XLSX' : file.name.endsWith('.xls') ? 'XLS' : 'CSV',
        rows: validRows,
      });

      if (result.success) {
        setImportResult(result.data);
        setCurrentStep(4); // Results step
      }
    } catch (err) {
      console.error('Import execution error:', err);
      setError(err.response?.data?.error?.message || 'Failed to execute bulk import.');
    } finally {
      setImporting(false);
    }
  };

  // Reset import wizard to start fresh
  const handleResetWizard = () => {
    setFile(null);
    setValidationSummary(null);
    setRawHeaders([]);
    setColumnMapping({});
    setImportResult(null);
    setError(null);
    setCurrentStep(1);
  };

  // Filter preview rows by status
  const filteredPreviewRows = validationSummary?.preview.filter((row) => {
    if (statusFilter === 'ALL') return true;
    return row.status === statusFilter;
  }) || [];

  const totalPreviewRows = filteredPreviewRows.length;
  const totalPreviewPages = Math.ceil(totalPreviewRows / previewLimit) || 1;
  const startRowIndex = (previewPage - 1) * previewLimit;
  const paginatedPreviewRows = filteredPreviewRows.slice(startRowIndex, startRowIndex + previewLimit);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bulk Company Import</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload CSV or Excel spreadsheets to import master company records and primary HR contacts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Import History
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-600 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* IMPORT WIZARD TAB */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Wizard Step Tracker */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  1
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Upload File
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  2
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Column Mapping
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

              {/* Step 3 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Validation & Preview
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 4 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

              {/* Step 4 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentStep >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  4
                </div>
                <span className={`text-xs font-semibold ${currentStep >= 4 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Import Results
                </span>
              </div>
            </div>
          </div>

          {/* STEP 1: DOWNLOAD TEMPLATE & FILE UPLOAD */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template Download Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">1. Download Template</h3>
                    <p className="text-xs text-slate-500">Get standard headers and example data.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">Supported Headers:</p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Company Name*, Industry, Website, LinkedIn, Country, State, City, Location, Remarks, HR Name, HR Designation, HR Email, HR Phone, HR LinkedIn
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleDownloadTemplate('csv')}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Download CSV Template</span>
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Download Excel (XLSX) Template</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">2. Select Spreadsheet File</h3>
                    <p className="text-xs text-slate-500">Upload `.csv`, `.xls`, or `.xlsx` (Max 10MB)</p>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Educational Organization <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select target organization...</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  {file ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB — Ready to parse
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
                      >
                        Remove file and select another
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Drag and drop your spreadsheet here
                        </p>
                        <p className="text-xs text-slate-400 mt-1">or click to browse from your computer</p>
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                        <FileText className="w-4 h-4" />
                        <span>Browse Files</span>
                        <input
                          type="file"
                          accept=".csv, .xls, .xlsx"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!file || validating || (isSuperAdmin && !selectedOrgId)}
                    onClick={handleUploadAndValidate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Parsing & Validating...</span>
                      </>
                    ) : (
                      <>
                        <span>Upload & Validate File</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & STEP 3: PREVIEW */}
          {currentStep === 3 && validationSummary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rows</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{validationSummary.totalRows}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Rows</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{validationSummary.validRowsCount}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Duplicates</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{validationSummary.duplicateRowsCount}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invalid Rows</span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{validationSummary.invalidRowsCount}</div>
                </div>
              </div>

              {/* Column Mapping Collapsible / Options */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-600" />
                    <span>Column Mapping Verification</span>
                  </h3>
                  <button
                    onClick={handleRevalidateWithMapping}
                    disabled={validating}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                    <span>Re-validate Mapping</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {TARGET_FIELDS.map((tf) => (
                    <div key={tf.key} className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {tf.label} {tf.required && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        value={columnMapping[tf.key] || ''}
                        onChange={(e) => handleMappingChange(tf.key, e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Unmapped --</option>
                        {rawHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row Validation Preview Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-sm font-bold text-slate-900">File Row Preview & Validation Results</h3>
                  <div className="flex items-center gap-1.5">
                    {['ALL', 'VALID', 'DUPLICATE', 'INVALID'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st);
                          setPreviewPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          statusFilter === st
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Row #</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Company Name</th>
                        <th className="px-4 py-3">Industry</th>
                        <th className="px-4 py-3">City / Location</th>
                        <th className="px-4 py-3">Primary HR Contact</th>
                        <th className="px-4 py-3">Validation Message / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paginatedPreviewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50/70 ${
                            row.status === 'INVALID'
                              ? 'bg-rose-50/30'
                              : row.status === 'DUPLICATE'
                              ? 'bg-amber-50/30'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-slate-500">#{row.rowNumber}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.status}>{row.status}</Badge>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.data.companyName || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{row.data.industry || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {[row.data.city, row.data.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.data.hrName ? (
                              <div>
                                <span>{row.data.hrName}</span>
                                {row.data.hrEmail && (
                                  <div className="text-[10px] text-slate-400 font-mono">{row.data.hrEmail}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.reasons && row.reasons.length > 0 ? (
                              <div className="text-[11px] font-semibold text-rose-600 space-y-0.5">
                                {row.reasons.map((reason, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Ready to import</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Preview Pagination Controls */}
                {totalPreviewRows > 0 && (
                  <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>
                        Showing <span className="font-semibold text-slate-900">{Math.min(startRowIndex + 1, totalPreviewRows)}</span> to{' '}
                        <span className="font-semibold text-slate-900">{Math.min(startRowIndex + previewLimit, totalPreviewRows)}</span> of{' '}
                        <span className="font-semibold text-slate-900">{totalPreviewRows}</span> rows
                      </span>
                      <span className="text-slate-300">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Rows per page:</span>
                        <select
                          value={previewLimit}
                          onChange={(e) => {
                            setPreviewLimit(Number(e.target.value));
                            setPreviewPage(1);
                          }}
                          className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <span className="font-medium text-slate-700 px-2">
                        Page {previewPage} of {totalPreviewPages}
                      </span>

                      <button
                        disabled={previewPage >= totalPreviewPages}
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to File Upload</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {validationSummary.validRowsCount} valid rows ready for bulk insertion
                  </span>
                  <button
                    disabled={validationSummary.validRowsCount === 0 || importing}
                    onClick={handleExecuteImport}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Importing Valid Rows...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Import ({validationSummary.validRowsCount} Rows)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT RESULTS */}
          {currentStep === 4 && importResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Bulk Import Completed!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Successfully imported company master records for your organization database.
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Processed</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">{importResult.totalRows}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase">Successfully Imported</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{importResult.importedRows}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-rose-600 uppercase">Skipped / Failed</span>
                  <div className="text-xl font-bold text-rose-600 mt-1">{importResult.failedRows}</div>
                </div>
              </div>

              {importResult.failedRows > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs text-left space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Skipped Rows Notice</span>
                  </div>
                  <p>
                    Some rows were skipped due to duplicates or invalid formats. You can download a detailed error report CSV to review.
                  </p>
                  <button
                    onClick={() => companyImportService.downloadErrorReport(importResult.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-white border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-700" />
                    <span>Download Error Report (CSV)</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetWizard}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  onClick={() => navigate(isSuperAdmin ? '/super-admin/companies' : '/pmo/companies')}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                >
                  View Master Directory
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMPORT HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Company Import Logs & History</span>
            </h3>
            <button
              onClick={() => fetchImportHistory(historyPagination.page)}
              className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">File Name</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Total Rows</th>
                  <th className="px-6 py-3.5">Imported</th>
                  <th className="px-6 py-3.5">Skipped / Failed</th>
                  <th className="px-6 py-3.5">Uploaded By</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {historyLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Loading import history...</span>
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No import history found</p>
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.fileName}</td>
                      <td className="px-6 py-4">
                        <Badge variant={item.status}>{item.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.totalRows}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{item.importedRows}</td>
                      <td className="px-6 py-4 text-rose-600 font-semibold">{item.failedRows}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {item.uploadedBy?.name || item.uploadedBy?.email || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.errorReport && item.errorReport.length > 0 ? (
                          <button
                            onClick={() => companyImportService.downloadErrorReport(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors cursor-pointer"
                            title="Download CSV Error Report"
                          >
                            <Download className="w-3 h-3" />
                            <span>Error Report</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">No Errors</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
