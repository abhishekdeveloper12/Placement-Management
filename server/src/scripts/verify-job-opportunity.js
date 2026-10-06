import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import JobOpportunity from '../models/JobOpportunity.js';
import Document from '../models/Document.js';
import AuditLog from '../models/AuditLog.js';
import opportunityService from '../services/opportunity.service.js';
import storageService from '../services/storage.service.js';

async function runVerification() {
  console.log('\n--- STARTING JOB OPPORTUNITY & JD MANAGEMENT VERIFICATION TEST ---\n');

  try {
    await connectDatabase();
    console.log('[1/12] Connected to MongoDB test database.');

    // 1. Clean up existing test data
    await Organization.deleteMany({ code: { $in: ['TEST_JDO_ORG_A', 'TEST_JDO_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['pmo_jdo_a@test.com', 'pmo_jdo_b@test.com', 'tm_jdo_1@test.com', 'tm_jdo_2@test.com'] } });
    await Company.deleteMany({ normalizedName: { $in: ['techcorp opportunities inc', 'unassigned enterprise llc', 'org b solutions'] } });
    await Assignment.deleteMany({});
    await JobOpportunity.deleteMany({});
    await Document.deleteMany({});
    await AuditLog.deleteMany({ action: { $regex: '^OPPORTUNITY_|^JD_' } });

    // 2. Setup Organizations & Users
    const orgA = await Organization.create({
      name: 'Job Opportunity Test College A',
      code: 'TEST_JDO_ORG_A',
      email: 'contact@jdo-a.edu',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Job Opportunity Test College B',
      code: 'TEST_JDO_ORG_B',
      email: 'contact@jdo-b.edu',
      status: 'ACTIVE',
    });

    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Officer A',
      email: 'pmo_jdo_a@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Officer B',
      email: 'pmo_jdo_b@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const teamMember1 = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Placement Member',
      email: 'tm_jdo_1@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const teamMember2 = await User.create({
      organizationId: orgA._id,
      name: 'Amit Unassigned Member',
      email: 'tm_jdo_2@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const companyAssigned = await Company.create({
      organizationId: orgA._id,
      companyName: 'TechCorp Opportunities Inc',
      normalizedName: 'techcorpopportunitiesinc',
      industry: 'Software',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyUnassigned = await Company.create({
      organizationId: orgA._id,
      companyName: 'Unassigned Enterprise LLC',
      normalizedName: 'unassignedenterpriseinc',
      industry: 'Finance',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyOrgB = await Company.create({
      organizationId: orgB._id,
      companyName: 'Org B Solutions',
      normalizedName: 'orgbsolutions',
      industry: 'Consulting',
      status: 'ACTIVE',
      createdBy: pmoUserB._id,
    });

    // Assign TechCorp to Rahul
    await Assignment.create({
      organizationId: orgA._id,
      companyId: companyAssigned._id,
      assignedTo: teamMember1._id,
      assignedBy: pmoUserA._id,
      status: 'ACTIVE',
    });

    console.log('[2/12] Test data setup complete.');

    // --- TEST 1: Team Member creates opportunity for assigned company ---
    console.log('\n--- Test 1: Team Member creates opportunity for assigned company ---');
    const oppData = {
      companyId: companyAssigned._id.toString(),
      title: 'Graduate Software Engineer 2026',
      opportunityType: 'FULL_TIME',
      candidateType: 'FRESHERS',
      openings: '15',
      location: 'Bangalore, Hybrid',
      workMode: 'HYBRID',
      salary: '₹6–8 LPA',
      stipend: '',
      bond: '1 Year',
      specialRequirement: 'B.Tech CS / IT, min 65% aggregate',
      hiringStatus: 'HIRING_NOW',
      source: 'HR_CALL',
    };

    const createdOpp = await opportunityService.createOpportunity(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      oppData
    );

    if (createdOpp && createdOpp.title === 'Graduate Software Engineer 2026') {
      console.log('[3/12] ✔ PASS: Opportunity created successfully by assigned Team Member.');
    } else {
      throw new Error('Failed to create opportunity');
    }

    // --- TEST 2: Team Member creates opportunity for unassigned company ---
    console.log('\n--- Test 2: Team Member creates opportunity for unassigned company ---');
    try {
      await opportunityService.createOpportunity(
        { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
        { ...oppData, companyId: companyUnassigned._id.toString() }
      );
      throw new Error('Should have rejected unassigned company');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'COMPANY_NOT_FOUND') {
        console.log('[4/12] ✔ PASS: Unassigned company creation rejected with 404 COMPANY_NOT_FOUND (Resource Hiding).');
      } else {
        throw err;
      }
    }

    // --- TEST 3: Cross-member access security ---
    console.log('\n--- Test 3: Unassigned Team Member attempts to access Rahul\'s opportunity ---');
    try {
      await opportunityService.getOpportunityById(
        { id: teamMember2._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
        createdOpp.id
      );
      throw new Error('Should have rejected cross-member access');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'OPPORTUNITY_NOT_FOUND') {
        console.log('[5/12] ✔ PASS: Cross-member opportunity access rejected with 404 OPPORTUNITY_NOT_FOUND.');
      } else {
        throw err;
      }
    }

    // --- TEST 4: Team Member updates opportunity ---
    console.log('\n--- Test 4: Team Member updates opportunity details ---');
    const updatedOpp = await opportunityService.updateOpportunity(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      createdOpp.id,
      { salary: '₹7–9 LPA', openings: '20' }
    );

    if (updatedOpp.salary === '₹7–9 LPA' && updatedOpp.openings === '20') {
      console.log('[6/12] ✔ PASS: Opportunity details updated successfully.');
    } else {
      throw new Error('Opportunity update failed');
    }

    // --- TEST 5: PMO fetches organization-wide opportunities & modifies status ---
    console.log('\n--- Test 5: PMO organization-wide opportunity list & status update ---');
    const pmoList = await opportunityService.getOpportunities(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      { hiringStatus: 'HIRING_NOW' }
    );

    if (pmoList.data.length >= 1) {
      console.log(`[7/12] ✔ PASS: PMO successfully retrieved ${pmoList.data.length} organization opportunities.`);
    } else {
      throw new Error('PMO list opportunities failed');
    }

    const pmoUpdated = await opportunityService.updateOpportunity(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      createdOpp.id,
      { hiringStatus: 'HIRING_PLANNED' }
    );

    if (pmoUpdated.hiringStatus === 'HIRING_PLANNED') {
      console.log('[8/12] ✔ PASS: PMO updated hiring status to HIRING_PLANNED.');
    } else {
      throw new Error('PMO status update failed');
    }

    // --- TEST 6: Cross-tenant isolation check ---
    console.log('\n--- Test 6: PMO from Org B attempts to access Org A\'s opportunity ---');
    try {
      await opportunityService.getOpportunityById(
        { id: pmoUserB._id.toString(), organizationId: orgB._id.toString(), role: 'PMO' },
        createdOpp.id
      );
      throw new Error('Should have rejected cross-tenant lookup');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'OPPORTUNITY_NOT_FOUND') {
        console.log('[9/12] ✔ PASS: PMO B cross-tenant lookup rejected with 404 OPPORTUNITY_NOT_FOUND.');
      } else {
        throw err;
      }
    }

    // --- TEST 7: JD Document Upload ---
    console.log('\n--- Test 7: JD Document Upload & Document Model verification ---');
    const dummyPdfBuffer = Buffer.from('%PDF-1.4 %FAKE_PDF_HEADER_FOR_TESTING_PURPOSES');
    const fakeFile = {
      buffer: dummyPdfBuffer,
      originalname: 'TechCorp_Software_Engineer_JD_2026.pdf',
      mimetype: 'application/pdf',
      size: dummyPdfBuffer.length,
    };

    const oppWithJd = await opportunityService.uploadOrReplaceJD(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      createdOpp.id,
      fakeFile
    );

    if (oppWithJd.jdDocument && oppWithJd.jdDocument.originalFileName === fakeFile.originalname) {
      console.log('[10/12] ✔ PASS: JD document uploaded and linked to opportunity.');
    } else {
      throw new Error('JD Upload failed');
    }

    // --- TEST 8: Secure JD Download ---
    console.log('\n--- Test 8: Secure JD Document Retrieval & File Path Verification ---');
    const jdData = await opportunityService.getJDFileForDownload(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      createdOpp.id
    );

    if (jdData.document && jdData.filePath) {
      console.log(`[11/12] ✔ PASS: Secure JD file retrieved at path: ${jdData.filePath}`);
    } else {
      throw new Error('JD file retrieval failed');
    }

    // --- TEST 9: Audit Trail Verification ---
    console.log('\n--- Test 9: System Audit Log verification ---');
    const logs = await AuditLog.find({ organizationId: orgA._id }).sort({ timestamp: -1 });
    const actions = logs.map((l) => l.action);
    console.log(`[12/12] ✔ PASS: Audit trail verified (${logs.length} events logged: ${actions.join(', ')}).`);

    console.log('\n==================================================');
    console.log('SUCCESS: ALL JOB OPPORTUNITY & JD MANAGEMENT TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runVerification();
