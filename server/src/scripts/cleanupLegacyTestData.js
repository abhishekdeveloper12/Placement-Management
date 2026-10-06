import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectDatabase } = await import('../config/db.js');
const { config } = await import('../config/env.js');
const Organization = (await import('../models/Organization.js')).default;
const User = (await import('../models/User.js')).default;
const Company = (await import('../models/Company.js')).default;
const Contact = (await import('../models/Contact.js')).default;
const Assignment = (await import('../models/Assignment.js')).default;
const Interaction = (await import('../models/Interaction.js')).default;
const FollowUp = (await import('../models/FollowUp.js')).default;
const JobOpportunity = (await import('../models/JobOpportunity.js')).default;
const Document = (await import('../models/Document.js')).default;
const Notification = (await import('../models/Notification.js')).default;
const AuditLog = (await import('../models/AuditLog.js')).default;

// Explicit Target Lists of Legacy Test Seed / Automated Test Data
const KNOWN_TEST_ORG_CODES = [
  'APEX',
  'BEACON',
  'COBALT',
  'APEX-TEST',
  'JDO_ORG_A',
  'JDO_ORG_B',
  'TEST_DASH_ORG_A',
  'TEST_DASH_ORG_B',
  'GLOBAL_TEST_ORG_1',
  'GLOBAL_TEST_ORG_2',
  'TEST_COMPANY_ORG_A',
  'TEST_COMPANY_ORG_B',
  'OUT_ORG_A',
  'OUT_ORG_B',
  'MGT_ORG_A',
  'MGT_ORG_B',
];

const KNOWN_TEST_USER_EMAILS = [
  'pmo@apex.edu',
  'member@apex.edu',
  'inactive@apex.edu',
  'pmo@beacon.edu',
  'user@cobalt.edu',
  'pmo@apex-test.edu',
  'testpmo@apex-test.edu',
  'testmember@apex-test.edu',
  'sa_global@test.com',
  'superadmin@companytest.edu',
  'pmo_jdo_a@test.com',
  'pmo_jdo_b@test.com',
  'tm_jdo_1@test.com',
  'tm_jdo_2@test.com',
  'pmo_dash_a@test.com',
  'pmo_dash_b@test.com',
  'tm_dash_1@test.com',
  'tm_dash_2@test.com',
  'pmo_g1@test.com',
  'pmo_g2@test.com',
  'tm_g1@test.com',
  'pmoa@companytest.edu',
  'pmob@companytest.edu',
  'membera@companytest.edu',
  'pmo@out-a.edu',
  'rahul@out-a.edu',
  'amit@out-a.edu',
  'pmo@out-b.edu',
  'pmo@mgt-a.edu',
  'rahul@mgt-a.edu',
  'amit@mgt-a.edu',
  'pmo@mgt-b.edu',
];

export const cleanupLegacyTestData = async () => {
  const isConfirmed = process.argv.includes('--confirm');

  await connectDatabase();

  console.log('\n==================================================');
  console.log('  LEGACY TEST DATA CLEANUP SYSTEM                 ');
  console.log('==================================================\n');

  const superAdminEmail = (config.superAdmin.email || 'superadmin@placementmanagement.local').toLowerCase().trim();

  // 1. Identify Target Test Organizations
  const targetTestOrgs = await Organization.find({
    $or: [
      { code: { $in: KNOWN_TEST_ORG_CODES } },
      { code: { $regex: /^TEST_/i } },
      { name: { $regex: /Security Test|Dashboard Test|JD Test|Global Test|Company Test|Outreach Org|Management Org/i } },
      { isTestData: true },
    ],
  }).lean();

  const testOrgIds = targetTestOrgs.map((o) => o._id);

  // 2. Identify Target Test Users (belonging to test orgs or known test emails)
  const targetTestUsersRaw = await User.find({
    $or: [
      { organizationId: { $in: testOrgIds } },
      { email: { $in: KNOWN_TEST_USER_EMAILS } },
    ],
  }).lean();

  // STRICT PROTECTION: Filter out Permanent Super Admin from deletion list!
  const targetTestUsers = targetTestUsersRaw.filter(
    (u) => u.email.toLowerCase().trim() !== superAdminEmail
  );
  const testUserIds = targetTestUsers.map((u) => u._id);

  // 3. Identify Dependent Records for Target Test Organizations
  const testCompanies = await Company.find({ organizationId: { $in: testOrgIds } }).lean();
  const testContacts = await Contact.find({ organizationId: { $in: testOrgIds } }).lean();
  const testAssignments = await Assignment.find({ organizationId: { $in: testOrgIds } }).lean();
  const testInteractions = await Interaction.find({ organizationId: { $in: testOrgIds } }).lean();
  const testFollowUps = await FollowUp.find({ organizationId: { $in: testOrgIds } }).lean();
  const testOpportunities = await JobOpportunity.find({ organizationId: { $in: testOrgIds } }).lean();
  const testDocuments = await Document.find({ organizationId: { $in: testOrgIds } }).lean();
  const testNotifications = await Notification.find({
    $or: [
      { organizationId: { $in: testOrgIds } },
      { recipientId: { $in: testUserIds } },
    ],
  }).lean();
  const testAuditLogs = await AuditLog.find({ organizationId: { $in: testOrgIds } }).lean();

  // 4. Identify Real Data to Preserve
  const preservedSuperAdmin = await User.findOne({ email: superAdminEmail }).lean();
  const preservedOrgs = await Organization.find({ _id: { $nin: testOrgIds } }).lean();
  const preservedUsers = await User.find({ _id: { $nin: testUserIds } }).lean();
  const preservedCompanies = await Company.find({ organizationId: { $nin: testOrgIds } }).lean();

  // 5. Display Cleanup Summary Report
  console.log('--- OLD TEST DATA IDENTIFIED FOR DELETION ---');
  console.log(`- Organizations:      ${targetTestOrgs.length}`);
  console.log(`- Users:              ${targetTestUsers.length}`);
  console.log(`- Companies:          ${testCompanies.length}`);
  console.log(`- Contacts:           ${testContacts.length}`);
  console.log(`- Assignments:        ${testAssignments.length}`);
  console.log(`- Interactions:       ${testInteractions.length}`);
  console.log(`- Follow-ups:         ${testFollowUps.length}`);
  console.log(`- Job Opportunities:  ${testOpportunities.length}`);
  console.log(`- Documents/JDs:      ${testDocuments.length}`);
  console.log(`- Notifications:      ${testNotifications.length}`);
  console.log(`- Audit Logs:         ${testAuditLogs.length}\n`);

  console.log('--- REAL DATA TO PRESERVE ---');
  console.log(`- Super Admin Account: ${preservedSuperAdmin ? `YES (${preservedSuperAdmin.email})` : 'NO (ERROR: Super Admin missing!)'}`);
  console.log(`- Real Organizations: ${preservedOrgs.length}`);
  console.log(`- Real Users:         ${preservedUsers.length}`);
  console.log(`- Real Companies:     ${preservedCompanies.length}\n`);

  // Check confirmation flag
  if (!isConfirmed) {
    console.log('==================================================');
    console.log('  SAFETY CHECK: Cleanup Confirmation Required     ');
    console.log('==================================================');
    console.log('  Refusing to delete data.\n');
    console.log('  To execute the cleanup, run with the --confirm flag:');
    console.log('  npm run cleanup:legacy-test-data -- --confirm\n');
    console.log('==================================================\n');
    return {
      success: false,
      confirmed: false,
      message: 'Refusing to delete data. Confirmation flag --confirm is required.',
      counts: {
        toDelete: {
          organizations: targetTestOrgs.length,
          users: targetTestUsers.length,
          companies: testCompanies.length,
        },
        preserved: {
          superAdmin: !!preservedSuperAdmin,
          organizations: preservedOrgs.length,
          users: preservedUsers.length,
          companies: preservedCompanies.length,
        },
      },
    };
  }

  // 6. Execute Ordered Deletion
  console.log('[Cleanup] Confirmed --confirm flag present. Executing deletion...\n');

  await Document.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testDocuments.length} test Documents`);

  await JobOpportunity.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testOpportunities.length} test Job Opportunities`);

  await FollowUp.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testFollowUps.length} test FollowUps`);

  await Interaction.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testInteractions.length} test Interactions`);

  await Assignment.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testAssignments.length} test Assignments`);

  await Contact.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testContacts.length} test Contacts`);

  await Company.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testCompanies.length} test Companies`);

  await Notification.deleteMany({
    $or: [
      { organizationId: { $in: testOrgIds } },
      { recipientId: { $in: testUserIds } },
    ],
  });
  console.log(`✔ Deleted ${testNotifications.length} test Notifications`);

  await AuditLog.deleteMany({ organizationId: { $in: testOrgIds } });
  console.log(`✔ Deleted ${testAuditLogs.length} test Audit Logs`);

  await User.deleteMany({ _id: { $in: testUserIds } });
  console.log(`✔ Deleted ${targetTestUsers.length} test Users`);

  await Organization.deleteMany({ _id: { $in: testOrgIds } });
  console.log(`✔ Deleted ${targetTestOrgs.length} test Organizations`);

  // Record Immutable Audit Log Entry
  if (preservedSuperAdmin) {
    await AuditLog.create({
      organizationId: null,
      performedBy: preservedSuperAdmin._id,
      action: 'LEGACY_TEST_DATA_CLEANUP',
      entityType: 'SYSTEM',
      metadata: {
        deletedOrganizationsCount: targetTestOrgs.length,
        deletedUsersCount: targetTestUsers.length,
        deletedCompaniesCount: testCompanies.length,
        deletedInteractionsCount: testInteractions.length,
        timestamp: new Date(),
      },
    });
    console.log('✔ Logged system AuditLog entry for LEGACY_TEST_DATA_CLEANUP');
  }

  console.log('\n==================================================');
  console.log('  SUCCESS: LEGACY TEST DATA CLEANUP COMPLETE!     ');
  console.log('==================================================\n');

  return {
    success: true,
    confirmed: true,
    deleted: {
      organizations: targetTestOrgs.length,
      users: targetTestUsers.length,
      companies: testCompanies.length,
      contacts: testContacts.length,
      assignments: testAssignments.length,
      interactions: testInteractions.length,
      followUps: testFollowUps.length,
      opportunities: testOpportunities.length,
      documents: testDocuments.length,
      notifications: testNotifications.length,
      auditLogs: testAuditLogs.length,
    },
    preserved: {
      superAdmin: !!preservedSuperAdmin,
      superAdminEmail,
      organizations: preservedOrgs.length,
      users: preservedUsers.length,
      companies: preservedCompanies.length,
    },
  };
};

// Execute if run directly from CLI
if (process.argv[1].endsWith('cleanupLegacyTestData.js')) {
  cleanupLegacyTestData()
    .then((result) => {
      process.exit(result.success ? 0 : 0);
    })
    .catch((err) => {
      console.error('[Cleanup Error]', err);
      process.exit(1);
    });
}
