import { connectDatabase } from '../config/db.js';
import { seedSuperAdmin } from '../services/seedSuperAdmin.js';
import { seedTestData } from './seedTestData.js';
import DataManagementService from '../services/dataManagement.service.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const runVerification = async () => {
  console.log('==================================================');
  console.log('STARTING SAFE TEST DATA MANAGEMENT VERIFICATION');
  console.log('==================================================\n');

  await connectDatabase();

  // Step 1: Ensure Super Admin bootstrap account exists (isTestData: false)
  console.log('[1/7] Initializing permanent Super Admin account...');
  const { user: superAdmin } = await seedSuperAdmin();
  if (!superAdmin) throw new Error('Super Admin creation failed');
  console.log(`✔ Super Admin bootstrap account verified: ${superAdmin.email} (isTestData: ${superAdmin.isTestData || false})`);

  // Step 2: Create a Real Operational Organization (isTestData: false)
  console.log('\n[2/7] Creating real operational organization (isTestData = false)...');
  let realOrg = await Organization.findOne({ code: 'REAL-PROD-01' });
  if (!realOrg) {
    realOrg = await Organization.create({
      name: 'Real Production Academy',
      code: 'REAL-PROD-01',
      email: 'pmo@realprod.edu',
      phone: '+91 9123456789',
      status: 'ACTIVE',
      isTestData: false,
    });
  }

  const pmoPasswordHash = await User.hashPassword('Password@123');
  let realPmo = await User.findOne({ email: 'realpmo@realprod.edu' });
  if (!realPmo) {
    realPmo = await User.create({
      organizationId: realOrg._id,
      name: 'Real Operational PMO',
      email: 'realpmo@realprod.edu',
      passwordHash: pmoPasswordHash,
      role: 'PMO',
      status: 'ACTIVE',
      isTestData: false,
    });
  }
  console.log(`✔ Real operational organization created: ${realOrg.name} (${realOrg.code}) with PMO ${realPmo.email}`);

  // Step 3: Seed explicit Test Data (isTestData: true)
  console.log('\n[3/7] Generating explicit test data via seedTestData()...');
  const testDataResult = await seedTestData();
  console.log(`✔ Test data generated cleanly for organization: ${testDataResult.organization.name}`);

  // Step 4: Verify Data Summary Breakdown (Real Data vs Test Data)
  console.log('\n[4/7] Verifying Data Summary API metrics (Real vs Test Data)...');
  const summary = await DataManagementService.getDataSummary();

  console.log('Summary Breakdown:', JSON.stringify(summary, null, 2));

  if (summary.realData.organizations < 1) {
    throw new Error('FAILED: Real organizations count is 0');
  }
  if (summary.testData.organizations < 1) {
    throw new Error('FAILED: Test organizations count is 0');
  }
  console.log(`✔ Data Summary Verified: Real Orgs = ${summary.realData.organizations}, Test Orgs = ${summary.testData.organizations}`);

  // Step 5: Verify RBAC Protection (PMO user denied test data deletion)
  console.log('\n[5/7] Testing Security & RBAC Enforcement...');
  try {
    await DataManagementService.deleteTestData({ target: 'ALL' }, realPmo);
    throw new Error('FAILED: PMO user was able to execute test data deletion!');
  } catch (err) {
    if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
      console.log(`✔ PASS: Non-Super-Admin user rejected with 403 Forbidden.`);
    } else {
      throw err;
    }
  }

  // Step 6: Execute Safe Test Data Deletion as Super Admin
  console.log('\n[6/7] Executing Safe Test Data Cleanup as Super Admin...');
  const deleteResult = await DataManagementService.deleteTestData({ target: 'ALL' }, superAdmin);
  console.log(`Deletion Result:`, JSON.stringify(deleteResult, null, 2));

  // Step 7: Post-Deletion Verification — Real Data Untouched & Test Data Deleted
  console.log('\n[7/7] Verifying database state post-deletion...');
  const postSummary = await DataManagementService.getDataSummary();

  console.log('Post-Deletion Summary:', JSON.stringify(postSummary, null, 2));

  // Assert Test Data is 0
  if (postSummary.testData.organizations !== 0) {
    throw new Error(`FAILED: Test organizations remaining: ${postSummary.testData.organizations}`);
  }
  if (postSummary.testData.users !== 0) {
    throw new Error(`FAILED: Test users remaining: ${postSummary.testData.users}`);
  }
  if (postSummary.testData.companies !== 0) {
    throw new Error(`FAILED: Test companies remaining: ${postSummary.testData.companies}`);
  }

  // Assert Real Data is UNTOUCHED
  const checkRealOrg = await Organization.findById(realOrg._id);
  const checkRealPmo = await User.findById(realPmo._id);
  const checkSuperAdmin = await User.findById(superAdmin._id);

  if (!checkRealOrg) throw new Error('CRITICAL FAILURE: Real organization was deleted!');
  if (!checkRealPmo) throw new Error('CRITICAL FAILURE: Real PMO user was deleted!');
  if (!checkSuperAdmin) throw new Error('CRITICAL FAILURE: Super Admin account was deleted!');

  console.log(`✔ Verified: Real Organization (${checkRealOrg.name}) remains intact.`);
  console.log(`✔ Verified: Real PMO User (${checkRealPmo.email}) remains intact.`);
  console.log(`✔ Verified: Super Admin Account (${checkSuperAdmin.email}) remains intact.`);

  // Verify Audit Log Entry for Deletion
  const auditLog = await AuditLog.findOne({ action: 'TEST_DATA_DELETED' });
  if (!auditLog) {
    throw new Error('FAILED: Deletion audit log missing');
  }
  console.log(`✔ Verified Deletion Audit Log created: action=${auditLog.action}, isTestData=${auditLog.isTestData}`);

  // Cleanup temporary real objects created for test run
  await User.deleteOne({ _id: realPmo._id });
  await Organization.deleteOne({ _id: realOrg._id });
  await AuditLog.deleteOne({ _id: auditLog._id });

  console.log('\n==================================================');
  console.log('SUCCESS: ALL SAFE TEST DATA MANAGEMENT TESTS PASSED!');
  console.log('==================================================');

  process.exit(0);
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
