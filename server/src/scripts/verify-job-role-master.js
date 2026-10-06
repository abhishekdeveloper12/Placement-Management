import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import JobRole from '../models/JobRole.js';
import AuditLog from '../models/AuditLog.js';
import jobRoleService from '../services/jobRole.service.js';
import interactionService from '../services/interaction.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_management';

async function runVerification() {
  console.log('=== STARTING JOB ROLE MASTER VERIFICATION TEST ===\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clean up existing test records
    await Organization.deleteMany({ code: { $in: ['TEST_ROLE_ORG_A', 'TEST_ROLE_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['pmo_role_a@test.com', 'pmo_role_b@test.com', 'tm_role_a@test.com'] } });
    await Company.deleteMany({ normalizedName: 'test-job-role-company-inc' });
    await JobRole.deleteMany({ isTestData: true });

    // 2. Create Test Organizations
    const orgA = await Organization.create({
      name: 'Test Job Role Org A',
      code: 'TEST_ROLE_ORG_A',
      email: 'org_a_role@test.com',
      isTestData: true,
    });
    const orgB = await Organization.create({
      name: 'Test Job Role Org B',
      code: 'TEST_ROLE_ORG_B',
      email: 'org_b_role@test.com',
      isTestData: true,
    });
    console.log('✓ Created Test Organizations Org A and Org B.');

    // 3. Create Users
    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO User A',
      email: 'pmo_role_a@test.com',
      passwordHash: '$2a$10$e8w.xL2pQ.55a2X45g2O.e/w.xL2pQ.55a2X45g2O.e/w.xL2pQ.',
      role: 'PMO',
      isTestData: true,
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO User B',
      email: 'pmo_role_b@test.com',
      passwordHash: '$2a$10$e8w.xL2pQ.55a2X45g2O.e/w.xL2pQ.55a2X45g2O.e/w.xL2pQ.',
      role: 'PMO',
      isTestData: true,
    });

    const tmUserA = await User.create({
      organizationId: orgA._id,
      name: 'Team Member A',
      email: 'tm_role_a@test.com',
      passwordHash: '$2a$10$e8w.xL2pQ.55a2X45g2O.e/w.xL2pQ.55a2X45g2O.e/w.xL2pQ.',
      role: 'TEAM_MEMBER',
      isTestData: true,
    });
    console.log('✓ Created PMO and Team Member users.');

    const contextPMO_A = { id: pmoUserA._id.toString(), role: 'PMO', organizationId: orgA._id.toString(), name: pmoUserA.name };
    const contextPMO_B = { id: pmoUserB._id.toString(), role: 'PMO', organizationId: orgB._id.toString(), name: pmoUserB.name };
    const contextTM_A = { id: tmUserA._id.toString(), role: 'TEAM_MEMBER', organizationId: orgA._id.toString(), name: tmUserA.name };

    // 4. Test Job Role Creation
    console.log('\n--- Test 1: PMO Job Role Creation ---');
    const roleA1 = await jobRoleService.createJobRole(contextPMO_A, {
      name: 'Software Engineer (MERN)',
      description: 'Full stack React and Node.js developer',
      isTestData: true,
    });
    const roleA1Id = roleA1.id || roleA1._id;
    console.log(`✓ Created Role A1: "${roleA1.name}" (ID: ${roleA1Id})`);

    const roleA2 = await jobRoleService.createJobRole(contextPMO_A, {
      name: 'Data Analyst Trainee',
      description: 'SQL, Python, and Tableau specialist',
      isTestData: true,
    });
    const roleA2Id = roleA2.id || roleA2._id;
    console.log(`✓ Created Role A2: "${roleA2.name}" (ID: ${roleA2Id})`);

    // 5. Test Duplicate Role Name Rejection (Same Org)
    console.log('\n--- Test 2: Duplicate Role Name Prevention ---');
    try {
      await jobRoleService.createJobRole(contextPMO_A, {
        name: 'software engineer (mern)', // normalized matching
        description: 'Duplicate check',
        isTestData: true,
      });
      console.error('❌ Failed: Duplicate role creation should have thrown an error!');
      process.exit(1);
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`✓ Duplicate role correctly rejected (409): ${err.message}`);
      } else {
        throw err;
      }
    }

    // 6. Test Same Role Name in Different Org (Tenant Isolation)
    console.log('\n--- Test 3: Tenant Isolation for Same Role Name ---');
    const roleB1 = await jobRoleService.createJobRole(contextPMO_B, {
      name: 'Software Engineer (MERN)',
      description: 'Org B role with same name',
      isTestData: true,
    });
    const roleB1Id = roleB1.id || roleB1._id;
    console.log(`✓ Org B successfully created role with identical name: "${roleB1.name}" (ID: ${roleB1Id})`);

    // 7. Test Updating Role & Status Toggle
    console.log('\n--- Test 4: Job Role Update & Status Invalidation ---');
    const updatedA2 = await jobRoleService.updateJobRoleStatus(contextPMO_A, roleA2Id, 'INACTIVE');
    console.log(`✓ Role A2 status updated to "${updatedA2.status}"`);

    const activeRolesOrgA = await jobRoleService.getActiveJobRoles(contextPMO_A);
    console.log(`✓ Active roles retrieved for Org A: ${activeRolesOrgA.map((r) => r.name).join(', ')}`);
    if (activeRolesOrgA.some((r) => (r.id || r._id).toString() === roleA2Id.toString())) {
      console.error('❌ Failed: Inactive role A2 returned in active list!');
      process.exit(1);
    }

    // Reactivate A2 for further testing if needed
    await jobRoleService.updateJobRoleStatus(contextPMO_A, roleA2Id, 'ACTIVE');

    // 8. Test Call Feedback Capture with Structured Job Roles
    console.log('\n--- Test 5: Call Feedback Capture with Structured Job Roles ---');
    const testCompany = await Company.create({
      organizationId: orgA._id,
      companyName: 'Test Job Role Company Inc',
      normalizedName: 'test-job-role-company-inc',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
      isTestData: true,
    });

    await Assignment.create({
      organizationId: orgA._id,
      companyId: testCompany._id,
      assignedTo: tmUserA._id,
      assignedBy: pmoUserA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    const callPayload = {
      hiringStatus: 'YES',
      jobRoleIds: [roleA1Id.toString()],
      candidateType: 'FRESHERS',
      openings: 5,
      opportunityType: 'FULL_TIME',
      hrResponse: 'Looking for MERN developers immediately',
      nextAction: 'FOLLOW_UP',
      followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      interactionDate: new Date().toISOString(),
    };

    const interactionResult = await interactionService.recordCallInteraction(contextTM_A, testCompany._id.toString(), callPayload);
    console.log('✓ Call interaction recorded successfully. Result:', interactionResult);

    const interId = interactionResult._id || interactionResult.id || interactionResult.interaction?._id || interactionResult.interaction?.id;
    console.log('Target Interaction ID:', interId);
    const recordedInteraction = await Interaction.findById(interId);
    console.log('Recorded interaction jobRoleSnapshots:', recordedInteraction.callDetails.jobRoleSnapshots);
    console.log('Recorded interaction profiles:', recordedInteraction.callDetails.profiles);

    if (
      !recordedInteraction.callDetails.jobRoleSnapshots ||
      recordedInteraction.callDetails.jobRoleSnapshots[0].name !== 'Software Engineer (MERN)'
    ) {
      console.error('❌ Failed: jobRoleSnapshots did not record exact role snapshot!');
      process.exit(1);
    }
    console.log('✓ jobRoleSnapshots accurately captured historical role name snapshot.');

    // 9. Test Inactive and Cross-Tenant Role Rejection
    console.log('\n--- Test 6: Inactive and Cross-Tenant Role Validation ---');
    // Set A2 inactive again
    await jobRoleService.updateJobRoleStatus(contextPMO_A, roleA2Id, 'INACTIVE');
    try {
      await interactionService.recordCallInteraction(contextTM_A, testCompany._id.toString(), {
        ...callPayload,
        jobRoleIds: [roleA2Id.toString()],
      });
      console.error('❌ Failed: Inactive role submission should have been rejected!');
      process.exit(1);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('inactive')) {
        console.log(`✓ Inactive role submission correctly rejected (400): ${err.message}`);
      } else {
        throw err;
      }
    }

    try {
      await interactionService.recordCallInteraction(contextTM_A, testCompany._id.toString(), {
        ...callPayload,
        jobRoleIds: [roleB1Id.toString()], // Org B role!
      });
      console.error('❌ Failed: Cross-tenant role submission should have been rejected!');
      process.exit(1);
    } catch (err) {
      if (err.statusCode === 400 && (err.message.includes('invalid') || err.message.includes('another organization'))) {
        console.log(`✓ Cross-tenant role submission correctly rejected (400): ${err.message}`);
      } else {
        throw err;
      }
    }

    // 10. Test Historical Snapshot Immutability
    console.log('\n--- Test 7: Historical Snapshot Immutability ---');
    await jobRoleService.updateJobRole(contextPMO_A, roleA1Id, {
      name: 'Senior Fullstack Software Engineer',
      description: 'Renamed role',
    });
    console.log('✓ Renamed Role A1 in Job Role Master to "Senior Fullstack Software Engineer"');

    const historicalInteraction = await Interaction.findById(interId);
    console.log('Historical call snapshot role name:', historicalInteraction.callDetails.jobRoleSnapshots[0].name);
    if (historicalInteraction.callDetails.jobRoleSnapshots[0].name !== 'Software Engineer (MERN)') {
      console.error('❌ Failed: Historical call record was mutated when role master was renamed!');
      process.exit(1);
    }
    console.log('✓ Historical call snapshot remained untouched ("Software Engineer (MERN)").');

    // 11. Cleanup test records
    console.log('\n--- Cleaning up test records ---');
    await Interaction.deleteMany({ companyId: testCompany._id });
    await Assignment.deleteMany({ companyId: testCompany._id });
    await Company.deleteMany({ _id: testCompany._id });
    await JobRole.deleteMany({ _id: { $in: [roleA1Id, roleA2Id, roleB1Id] } });
    await User.deleteMany({ _id: { $in: [pmoUserA._id, pmoUserB._id, tmUserA._id] } });
    await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    console.log('✓ Test records cleaned up.');
    console.log('✓ Test records cleaned up.');

    console.log('\n=== ALL JOB ROLE MASTER VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
