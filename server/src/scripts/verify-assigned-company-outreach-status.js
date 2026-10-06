import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import { assignmentService } from '../services/assignment.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const runVerification = async () => {
  console.log('--- STARTING ASSIGNED COMPANY OUTREACH STATUS VERIFICATION ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', mongoUri.split('@').pop());

  let testOrg, testPmo, testTm, compA, compB, compC;

  try {
    const timestamp = Date.now().toString().slice(-8);
    // 1. Create Test Organization
    testOrg = await Organization.create({
      name: 'VERIFY_OUTREACH_STATUS_ORG',
      code: `VOS_${timestamp}`,
      email: `vos_org_${timestamp}@test.com`,
      isTest: true,
      status: 'ACTIVE',
    });

    // 2. Create Test PMO & Team Member
    testPmo = await User.create({
      name: 'VOS PMO User',
      email: `vos_pmo_${timestamp}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'PMO',
      organizationId: testOrg._id,
      isTest: true,
    });

    testTm = await User.create({
      name: 'VOS Team Member',
      email: `vos_tm_${timestamp}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'TEAM_MEMBER',
      organizationId: testOrg._id,
      isTest: true,
    });

    // 3. Create 3 Companies
    compA = await Company.create({
      companyName: 'VOS Company A',
      industry: 'Technology',
      organizationId: testOrg._id,
      createdBy: testPmo._id,
      isTest: true,
    });

    compB = await Company.create({
      companyName: 'VOS Company B',
      industry: 'Finance',
      organizationId: testOrg._id,
      createdBy: testPmo._id,
      isTest: true,
    });

    compC = await Company.create({
      companyName: 'VOS Company C',
      industry: 'Healthcare',
      organizationId: testOrg._id,
      createdBy: testPmo._id,
      isTest: true,
    });

    // 4. Assign all 3 companies to Team Member
    await Assignment.create({
      companyId: compA._id,
      assignedTo: testTm._id,
      assignedBy: testPmo._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      isTest: true,
    });

    await Assignment.create({
      companyId: compB._id,
      assignedTo: testTm._id,
      assignedBy: testPmo._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      isTest: true,
    });

    await Assignment.create({
      companyId: compC._id,
      assignedTo: testTm._id,
      assignedBy: testPmo._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      isTest: true,
    });

    console.log('Created test organization, users, 3 companies, and 3 assignments.');

    // 5. Initial check (all 3 should be TO_CONTACT)
    const tmUserContext = {
      id: testTm._id.toString(),
      _id: testTm._id,
      name: testTm.name,
      email: testTm.email,
      role: testTm.role,
      organizationId: testOrg._id,
    };

    let res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'TO_CONTACT',
    });

    if (res.meta.counts.toContact !== 3 || res.meta.counts.contacted !== 0 || res.meta.counts.followUpDue !== 0 || res.meta.counts.all !== 3) {
      throw new Error(`Initial counts mismatch! Got: ${JSON.stringify(res.meta.counts)}`);
    }
    if (res.data.length !== 3) {
      throw new Error(`Expected 3 companies in TO_CONTACT tab, got ${res.data.length}`);
    }
    console.log('✓ Initial state verified: 3 companies in TO_CONTACT, counts match.');

    // 6. Log interaction for Company A (moves to CONTACTED)
    await Interaction.create({
      companyId: compA._id,
      organizationId: testOrg._id,
      userId: testTm._id,
      loggedBy: testTm._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Logged initial call with Company A',
      isTest: true,
    });

    res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'TO_CONTACT',
    });
    if (res.data.length !== 2) {
      throw new Error(`Expected 2 companies in TO_CONTACT after contacting Company A, got ${res.data.length}`);
    }

    res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'CONTACTED',
    });
    if (res.data.length !== 1 || res.data[0].id.toString() !== compA._id.toString()) {
      throw new Error(`Expected Company A in CONTACTED tab, got ${res.data.length}`);
    }
    if (res.data[0].outreachStatus !== 'CONTACTED') {
      throw new Error(`Expected outreachStatus CONTACTED on Company A, got ${res.data[0].outreachStatus}`);
    }
    console.log('✓ Interaction logged for Company A: moved from TO_CONTACT to CONTACTED tab.');

    // 7. Log interaction + FollowUp due today for Company B (moves to FOLLOW_UP_DUE)
    const interactionB = await Interaction.create({
      companyId: compB._id,
      organizationId: testOrg._id,
      userId: testTm._id,
      loggedBy: testTm._id,
      interactionType: 'PHONE_CALL',
      outcome: 'FOLLOW_UP_REQUIRED',
      notes: 'Needs follow up call today',
      isTest: true,
    });

    const today = new Date();
    await FollowUp.create({
      companyId: compB._id,
      interactionId: interactionB._id,
      assignedTo: testTm._id,
      organizationId: testOrg._id,
      dueDate: today,
      reason: 'Call back HR manager',
      status: 'PENDING',
      isTest: true,
    });

    res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'TO_CONTACT',
    });
    if (res.data.length !== 1 || res.data[0].id.toString() !== compC._id.toString()) {
      throw new Error(`Expected 1 company (Company C) in TO_CONTACT, got ${res.data.length}`);
    }

    res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'FOLLOW_UP_DUE',
    });
    if (res.data.length !== 1 || res.data[0].id.toString() !== compB._id.toString()) {
      throw new Error(`Expected Company B in FOLLOW_UP_DUE tab, got ${res.data.length}`);
    }
    if (res.data[0].outreachStatus !== 'FOLLOW_UP_DUE') {
      throw new Error(`Expected outreachStatus FOLLOW_UP_DUE on Company B, got ${res.data[0].outreachStatus}`);
    }

    res = await assignmentService.getTeamMemberAssignedCompanies(tmUserContext, {
      outreachStatus: 'ALL',
    });
    if (res.data.length !== 3) {
      throw new Error(`Expected all 3 companies in ALL tab, got ${res.data.length}`);
    }
    if (res.meta.counts.toContact !== 1 || res.meta.counts.contacted !== 2 || res.meta.counts.followUpDue !== 1 || res.meta.counts.all !== 3) {
      throw new Error(`Final counts mismatch! Got: ${JSON.stringify(res.meta.counts)}`);
    }

    console.log('✓ Follow-up due created for Company B: moved to FOLLOW_UP_DUE tab.');
    console.log('✓ All tab returned all 3 companies intact.');
    console.log('✓ Final counts verified:', res.meta.counts);

    console.log('--- ASSIGNED COMPANY OUTREACH STATUS VERIFICATION PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    if (testOrg) {
      await FollowUp.deleteMany({ organizationId: testOrg._id });
      await Interaction.deleteMany({ organizationId: testOrg._id });
      await Assignment.deleteMany({ organizationId: testOrg._id });
      await Company.deleteMany({ organizationId: testOrg._id });
      await User.deleteMany({ organizationId: testOrg._id });
      await Organization.deleteOne({ _id: testOrg._id });
      console.log('Cleaned up test data.');
    }
    await mongoose.disconnect();
  }
};

runVerification();
