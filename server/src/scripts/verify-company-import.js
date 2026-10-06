import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import CompanyImport from '../models/CompanyImport.js';
import AuditLog from '../models/AuditLog.js';
import companyImportService from '../services/companyImport.service.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management_test';

async function runVerification() {
  console.log('--- STARTING BULK COMPANY IMPORT VERIFICATION TEST ---\n');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[1/9] Connected to test database.');

    // Cleanup previous test data
    await Organization.deleteMany({ code: { $in: ['IMPORT_ORG_A', 'IMPORT_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['import_super@test.com', 'import_pmo_a@test.com', 'import_pmo_b@test.com', 'import_tm@test.com'] } });
    await CompanyImport.deleteMany({});
    await AuditLog.deleteMany({ action: { $in: ['COMPANY_IMPORT_STARTED', 'COMPANY_IMPORT_COMPLETED'] } });

    // 1. Setup Test Organizations and Users
    const orgA = await Organization.create({
      name: 'Import Test University A',
      code: 'IMPORT_ORG_A',
      email: 'orga@test.com',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Import Test University B',
      code: 'IMPORT_ORG_B',
      email: 'orgb@test.com',
      status: 'ACTIVE',
    });

    const superAdmin = await User.create({
      name: 'Import Super Admin',
      email: 'import_super@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'SUPER_ADMIN',
      organizationId: null,
      status: 'ACTIVE',
    });

    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Org A User',
      email: 'import_pmo_a@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Org B User',
      email: 'import_pmo_b@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const tmUser = await User.create({
      organizationId: orgA._id,
      name: 'Team Member User',
      email: 'import_tm@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    // Create 1 existing company in Org A to test DB duplicate detection
    const existingCompany = await Company.create({
      organizationId: orgA._id,
      companyName: 'Acme Corporation',
      normalizedName: 'acmecorporation',
      industry: 'Manufacturing',
      website: 'https://acme.com',
      createdBy: pmoUserA._id,
    });

    console.log('[2/9] Setup organizations, users, and pre-existing company for DB duplicate tests.');

    // 2. Test Template Generation
    const csvTemplate = companyImportService.generateTemplate('csv');
    const xlsxTemplate = companyImportService.generateTemplate('xlsx');

    if (!csvTemplate || csvTemplate.length === 0) throw new Error('CSV Template generation failed');
    if (!xlsxTemplate || xlsxTemplate.length === 0) throw new Error('XLSX Template generation failed');
    console.log('[3/9] Template generation verified (CSV and XLSX buffers created).');

    // 3. Construct Test CSV File Buffer
    const csvContent = [
      'Company Name,Industry,Website,LinkedIn,Country,State,City,Location,Remarks,HR Name,HR Designation,HR Email,HR Phone,HR LinkedIn',
      'TechCorp Global,Software,https://techcorp.com,https://linkedin.com/company/techcorp,India,Karnataka,Bengaluru,Electronic City,Top Recruiter,Alice Smith,Director HR,alice@techcorp.com,+91-9876543210,https://linkedin.com/in/alicesmith',
      'Innovate Soft,IT Services,https://innovate.io,,India,Maharashtra,Pune,Hinjewadi,Freshers hiring,Bob Johnson,Talent Lead,bob@innovate.io,+91-9876543211,',
      'Acme Corporation,Manufacturing,https://acme.com,,India,Delhi,New Delhi,Connaught Place,Duplicate DB test,,,invalid-email-format,,',
      'TechCorp Global,Software,https://techcorp.com,,India,Karnataka,Bengaluru,In-file duplicate test,,,,,,',
      ',Finance,https://noname.com,,India,Tamil Nadu,Chennai,Guindy,Missing company name test,,,,,,',
    ].join('\n');

    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    // 4. Test File Parse & Validation
    const userContextA = {
      id: pmoUserA._id.toString(),
      role: pmoUserA.role,
      organizationId: pmoUserA.organizationId.toString(),
    };

    const validationResult = await companyImportService.parseAndValidate(
      userContextA,
      csvBuffer,
      'test_import.csv'
    );

    console.log(`[4/9] File Validation Summary: Total=${validationResult.totalRows}, Valid=${validationResult.validRowsCount}, Invalid=${validationResult.invalidRowsCount}, Duplicate=${validationResult.duplicateRowsCount}`);

    if (validationResult.totalRows !== 5) throw new Error(`Expected 5 total rows, got ${validationResult.totalRows}`);
    if (validationResult.validRowsCount !== 2) throw new Error(`Expected 2 valid rows, got ${validationResult.validRowsCount}`);
    if (validationResult.duplicateRowsCount !== 2) throw new Error(`Expected 2 duplicate rows, got ${validationResult.duplicateRowsCount}`);
    if (validationResult.invalidRowsCount !== 1) throw new Error(`Expected 1 invalid row, got ${validationResult.invalidRowsCount}`);

    // Verify row-level preview statuses
    const row1 = validationResult.preview[0]; // TechCorp Global
    const row2 = validationResult.preview[1]; // Innovate Soft
    const row3 = validationResult.preview[2]; // Acme Corporation (DB Duplicate)
    const row4 = validationResult.preview[3]; // TechCorp Global (In-file Duplicate)
    const row5 = validationResult.preview[4]; // Missing company name

    if (row1.status !== 'VALID') throw new Error(`Row 1 should be VALID, got ${row1.status}`);
    if (row2.status !== 'VALID') throw new Error(`Row 2 should be VALID, got ${row2.status}`);
    if (row3.status !== 'DUPLICATE') throw new Error(`Row 3 should be DUPLICATE, got ${row3.status}`);
    if (row4.status !== 'DUPLICATE') throw new Error(`Row 4 should be DUPLICATE, got ${row4.status}`);
    if (row5.status !== 'INVALID') throw new Error(`Row 5 should be INVALID, got ${row5.status}`);

    console.log('[5/9] Detailed preview validation matched expectations (Valid, Duplicate, Invalid categorization).');

    // 5. Test Batch Execution (Import Valid Rows)
    const validRowsToImport = validationResult.preview.filter((r) => r.status === 'VALID');

    const importExecResult = await companyImportService.executeImport(userContextA, {
      fileName: 'test_import.csv',
      fileType: 'CSV',
      rows: validRowsToImport,
    });

    if (importExecResult.importedRows !== 2) throw new Error(`Expected 2 imported rows, got ${importExecResult.importedRows}`);
    if (importExecResult.status !== 'COMPLETED') throw new Error(`Expected status COMPLETED, got ${importExecResult.status}`);

    console.log('[6/9] Batch execution succeeded. 2 valid rows imported.');

    // 6. Verify Created Company & Contact Records in MongoDB
    const createdTechCorp = await Company.findOne({ organizationId: orgA._id, normalizedName: 'techcorpglobal' });
    const createdInnovate = await Company.findOne({ organizationId: orgA._id, normalizedName: 'innovatesoft' });

    if (!createdTechCorp || createdTechCorp.city !== 'Bengaluru') throw new Error('TechCorp Global record missing or invalid');
    if (!createdInnovate || createdInnovate.city !== 'Pune') throw new Error('Innovate Soft record missing or invalid');

    const contactTechCorp = await Contact.findOne({ companyId: createdTechCorp._id, isPrimary: true });
    if (!contactTechCorp || contactTechCorp.name !== 'Alice Smith' || contactTechCorp.email !== 'alice@techcorp.com') {
      throw new Error('TechCorp primary contact creation failed');
    }

    console.log('[7/9] Verified imported Company and Contact records in database.');

    // 7. Test Audit Logs & Import History
    const auditLogs = await AuditLog.find({
      organizationId: orgA._id,
      action: { $in: ['COMPANY_IMPORT_STARTED', 'COMPANY_IMPORT_COMPLETED'] },
    });
    if (auditLogs.length !== 2) throw new Error(`Expected 2 audit log entries, found ${auditLogs.length}`);

    const history = await companyImportService.getImportHistory(userContextA);
    if (history.data.length !== 1 || history.data[0].importedRows !== 2) {
      throw new Error('Import history lookup failed');
    }

    // Test Error Report CSV Generation
    const errorReportCSV = await companyImportService.generateErrorReportCSV(userContextA, importExecResult.id);
    if (!errorReportCSV || !errorReportCSV.includes('Row Number')) {
      throw new Error('Error report CSV generation failed');
    }

    console.log('[8/9] Verified Audit Log entries, Import History, and Error Report CSV export.');

    // 8. Test RBAC & Multi-Tenant Isolation
    const tmUserContext = {
      id: tmUser._id.toString(),
      role: tmUser.role,
      organizationId: tmUser.organizationId.toString(),
    };

    try {
      await companyImportService.parseAndValidate(tmUserContext, csvBuffer, 'test.csv');
      throw new Error('TEAM_MEMBER should be blocked from company import');
    } catch (err) {
      if (err.statusCode !== 403) throw new Error(`Expected 403 for TEAM_MEMBER, got ${err.statusCode}`);
    }

    // PMO Org B trying to import into Org A explicitly -> should be overridden to Org B
    const userContextB = {
      id: pmoUserB._id.toString(),
      role: pmoUserB.role,
      organizationId: pmoUserB.organizationId.toString(),
    };

    const pmoBValidation = await companyImportService.parseAndValidate(userContextB, csvBuffer, 'test.csv', orgA._id.toString());
    if (pmoBValidation.organizationId !== orgB._id.toString()) {
      throw new Error('PMO tenant isolation breached! Target org was not overridden to PMO org.');
    }

    // Super Admin explicitly targeting Org B
    const superAdminContext = {
      id: superAdmin._id.toString(),
      role: superAdmin.role,
    };
    const superAdminValidation = await companyImportService.parseAndValidate(superAdminContext, csvBuffer, 'test.csv', orgB._id.toString());
    if (superAdminValidation.organizationId !== orgB._id.toString()) {
      throw new Error('Super Admin explicit target organization selection failed');
    }

    console.log('[9/9] RBAC & Multi-Tenant Security tests passed (TEAM_MEMBER forbidden, PMO restricted to own org, Super Admin explicit org selection).');

    // Cleanup
    await Organization.deleteMany({ code: { $in: ['IMPORT_ORG_A', 'IMPORT_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['import_super@test.com', 'import_pmo_a@test.com', 'import_pmo_b@test.com', 'import_tm@test.com'] } });
    await Company.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await Contact.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await CompanyImport.deleteMany({});
    await AuditLog.deleteMany({ action: { $in: ['COMPANY_IMPORT_STARTED', 'COMPANY_IMPORT_COMPLETED'] } });

    console.log('\n==================================================');
    console.log('SUCCESS: ALL BULK COMPANY IMPORT VERIFICATION TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
