import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Dedicated Test Data Generator Script
 * 
 * - Generates explicitly marked test data records (isTestData = true).
 * - NEVER mutates or deletes real production data (isTestData = false).
 * - Can be safely run in development/testing environments.
 */
export const seedTestData = async () => {
  console.log('[Seed:TestData] Starting test data generation...');

  await connectDatabase();

  // 1. Create or retrieve Test Organization
  let testOrg = await Organization.findOne({ code: 'APEX-TEST' });
  if (!testOrg) {
    testOrg = await Organization.create({
      name: 'Apex Test Institute',
      code: 'APEX-TEST',
      email: 'pmo@apex-test.edu',
      phone: '+91 9876543210',
      address: 'Test Tech Park, Block B',
      status: 'ACTIVE',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Organization: ${testOrg.name} (${testOrg.id})`);
  } else {
    console.log(`[Seed:TestData] Test Organization already exists: ${testOrg.name}`);
  }

  // 2. Create Test PMO User
  let testPmo = await User.findOne({ email: 'testpmo@apex-test.edu' });
  if (!testPmo) {
    const passwordHash = await User.hashPassword('Password@123');
    testPmo = await User.create({
      organizationId: testOrg._id,
      name: 'Test PMO Administrator',
      email: 'testpmo@apex-test.edu',
      passwordHash,
      role: 'PMO',
      phone: '+91 9876543211',
      status: 'ACTIVE',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test PMO: ${testPmo.email}`);
  }

  // 3. Create Test Team Member User
  let testMember = await User.findOne({ email: 'testmember@apex-test.edu' });
  if (!testMember) {
    const passwordHash = await User.hashPassword('Password@123');
    testMember = await User.create({
      organizationId: testOrg._id,
      name: 'Test Outreach Member',
      email: 'testmember@apex-test.edu',
      passwordHash,
      role: 'TEAM_MEMBER',
      phone: '+91 9876543212',
      status: 'ACTIVE',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Team Member: ${testMember.email}`);
  }

  // 4. Create Test Companies
  let company1 = await Company.findOne({ organizationId: testOrg._id, normalizedName: 'acmetestcorp' });
  if (!company1) {
    company1 = await Company.create({
      organizationId: testOrg._id,
      companyName: 'Acme Test Corp',
      industry: 'Software & Cloud Services',
      website: 'www.acmetest.com',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      status: 'ACTIVE',
      createdBy: testPmo._id,
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Company: ${company1.companyName}`);
  }

  let company2 = await Company.findOne({ organizationId: testOrg._id, normalizedName: 'betatestholdings' });
  if (!company2) {
    company2 = await Company.create({
      organizationId: testOrg._id,
      companyName: 'Beta Test Holdings',
      industry: 'Financial Technology',
      website: 'www.betatest.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      status: 'ACTIVE',
      createdBy: testPmo._id,
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Company: ${company2.companyName}`);
  }

  // 5. Create Test Contact
  let contact1 = await Contact.findOne({ companyId: company1._id, email: 'hr@acmetest.com' });
  if (!contact1) {
    contact1 = await Contact.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      name: 'Sarah Test HR',
      designation: 'Head of Talent Acquisition',
      email: 'hr@acmetest.com',
      phone: '+91 9988776655',
      isPrimary: true,
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test HR Contact: ${contact1.name}`);
  }

  // 6. Create Test Assignment
  let assignment1 = await Assignment.findOne({ organizationId: testOrg._id, companyId: company1._id, status: 'ACTIVE' });
  if (!assignment1) {
    assignment1 = await Assignment.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      assignedTo: testMember._id,
      assignedBy: testPmo._id,
      status: 'ACTIVE',
      reason: 'Initial test outreach assignment',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Assignment for ${company1.companyName}`);
  }

  // 7. Create Test Interaction
  let interaction1 = await Interaction.findOne({ organizationId: testOrg._id, companyId: company1._id });
  if (!interaction1) {
    interaction1 = await Interaction.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      contactId: contact1._id,
      userId: testMember._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Test outreach call confirmed 5 campus openings for Full Stack Software Engineers.',
      nextAction: 'FOLLOW_UP',
      followUpDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      callDetails: {
        hiringStatus: 'YES',
        profiles: ['Full Stack Engineer', 'Backend Developer'],
        candidateType: 'FRESHERS',
        openings: 5,
        opportunityType: 'FULL_TIME',
        workMode: 'HYBRID',
        location: 'Bangalore',
        salaryOrStipend: '8-10 LPA',
      },
      isTestData: true,
    });
    console.log(`[Seed:TestData] Logged Test Interaction for ${company1.companyName}`);
  }

  // 8. Create Test FollowUp
  let followUp1 = await FollowUp.findOne({ organizationId: testOrg._id, companyId: company1._id });
  if (!followUp1) {
    followUp1 = await FollowUp.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      assignedTo: testMember._id,
      interactionId: interaction1._id,
      dueDate: new Date(Date.now() + 86400000 * 3),
      reason: 'Send campus hiring brochure & request formal Job Description PDF',
      status: 'PENDING',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Follow-up task`);
  }

  // 9. Create Test Job Opportunity
  let opp1 = await JobOpportunity.findOne({ organizationId: testOrg._id, companyId: company1._id });
  if (!opp1) {
    opp1 = await JobOpportunity.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      title: 'Full Stack Software Engineer',
      opportunityType: 'FULL_TIME',
      candidateType: 'FRESHERS',
      openings: '5',
      location: 'Bangalore',
      workMode: 'HYBRID',
      salary: '8-10 LPA',
      hiringStatus: 'HIRING_NOW',
      source: 'HR_CALL',
      interactionId: interaction1._id,
      createdBy: testMember._id,
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Job Opportunity: ${opp1.title}`);
  }

  // 10. Create Test Document
  let doc1 = await Document.findOne({ organizationId: testOrg._id, companyId: company1._id });
  if (!doc1) {
    doc1 = await Document.create({
      organizationId: testOrg._id,
      companyId: company1._id,
      opportunityId: opp1._id,
      uploadedBy: testMember._id,
      originalFileName: 'Acme_Software_Engineer_JD.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024500,
      storageKey: `test_jds/${opp1._id}/sample.pdf`,
      storageProvider: 'LOCAL',
      documentType: 'JOB_DESCRIPTION',
      isTestData: true,
    });
    opp1.jdDocumentId = doc1._id;
    await opp1.save();
    console.log(`[Seed:TestData] Uploaded Test Document: ${doc1.originalFileName}`);
  }

  // 11. Create Test Notification
  let notif1 = await Notification.findOne({ recipientId: testMember._id, deduplicationKey: 'test_notif_1' });
  if (!notif1) {
    notif1 = await Notification.create({
      organizationId: testOrg._id,
      recipientId: testMember._id,
      type: 'FOLLOW_UP_DUE',
      title: 'Test Follow-Up Reminder',
      message: `Follow-up due for ${company1.companyName}: Send campus hiring brochure.`,
      entity: 'FollowUp',
      entityId: followUp1._id,
      deduplicationKey: 'test_notif_1',
      isTestData: true,
    });
    console.log(`[Seed:TestData] Created Test Notification`);
  }

  // 12. Create Test AuditLog
  await AuditLog.create({
    organizationId: testOrg._id,
    performedBy: testPmo._id,
    action: 'TEST_DATA_GENERATED',
    entityType: 'TEST_SUITE',
    entityId: testOrg._id,
    metadata: { note: 'Generated via npm run seed:test-data' },
    isTestData: true,
  });

  console.log('==================================================');
  console.log('SUCCESS: TEST DATA GENERATION COMPLETE!');
  console.log('All created records were explicitly marked with isTestData = true');
  console.log('==================================================');

  return {
    organization: testOrg,
    pmo: testPmo,
    teamMember: testMember,
    company: company1,
  };
};

// Execute if run directly from CLI
if (process.argv[1].endsWith('seedTestData.js')) {
  seedTestData()
    .then(() => {
      console.log('[Seed:TestData] Execution finished cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed:TestData Error]', err);
      process.exit(1);
    });
}
