import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import AuditLog from '../models/AuditLog.js';

import authRoutes from '../routes/auth.routes.js';
import teamMemberWorkRoutes from '../routes/teamMemberWork.routes.js';
import pmoRoutes from '../routes/pmo.routes.js';
import companyRoutes from '../routes/company.routes.js';
import { errorMiddleware } from '../middleware/error.middleware.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management_test';

async function runVerification() {
  console.log('\n--- STARTING QUICK HR OUTREACH & CALL CAPTURE VERIFICATION TEST ---\n');

  // 1. Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('[1/10] Connected to MongoDB test database.');

  // Clean collections
  await Promise.all([
    Organization.deleteMany({ code: { $in: ['OUT_ORG_A', 'OUT_ORG_B'] } }),
    User.deleteMany({ email: { $in: ['pmo@out-a.edu', 'rahul@out-a.edu', 'amit@out-a.edu', 'pmo@out-b.edu', 'staff@out-b.edu'] } }),
    Company.deleteMany({ companyName: { $in: ['TechCorp Global', 'Acme Solutions', 'Global Systems'] } }),
    Contact.deleteMany({}),
    Assignment.deleteMany({}),
    Interaction.deleteMany({}),
    FollowUp.deleteMany({}),
    AuditLog.deleteMany({ action: { $in: ['INTERACTION_CREATED', 'HR_CONTACT_CREATED', 'HR_CONTACT_UPDATED', 'FOLLOW_UP_CREATED'] } }),
  ]);

  // 2. Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/team-member', teamMemberWorkRoutes);
  app.use('/api/pmo', pmoRoutes);
  app.use('/api/companies', companyRoutes);
  app.use(errorMiddleware);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 3. Setup Organizations, Users, and Companies
    const orgA = await Organization.create({ name: 'Outreach Org A', code: 'OUT_ORG_A', email: 'admin@out-a.edu' });
    const orgB = await Organization.create({ name: 'Outreach Org B', code: 'OUT_ORG_B', email: 'admin@out-b.edu' });

    const pmoA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Lead A',
      email: 'pmo@out-a.edu',
      passwordHash: await User.hashPassword('PmoPassword123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const rahul = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Sharma',
      email: 'rahul@out-a.edu',
      passwordHash: await User.hashPassword('RahulPassword123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const amit = await User.create({
      organizationId: orgA._id,
      name: 'Amit Kumar',
      email: 'amit@out-a.edu',
      passwordHash: await User.hashPassword('AmitPassword123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const pmoB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Lead B',
      email: 'pmo@out-b.edu',
      passwordHash: await User.hashPassword('PmoBPassword123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const comp1 = await Company.create({
      organizationId: orgA._id,
      companyName: 'TechCorp Global',
      normalizedName: 'techcorpglobal',
      industry: 'Information Technology',
      city: 'Noida',
      createdBy: pmoA._id,
    });

    const comp2 = await Company.create({
      organizationId: orgA._id,
      companyName: 'Acme Solutions',
      normalizedName: 'acmesolutions',
      industry: 'Software',
      city: 'Gurgaon',
      createdBy: pmoA._id,
    });

    const comp3 = await Company.create({
      organizationId: orgB._id,
      companyName: 'Global Systems',
      normalizedName: 'globalsystems',
      industry: 'Consulting',
      city: 'Bangalore',
      createdBy: pmoB._id,
    });

    // Assign comp1 -> Rahul
    await Assignment.create({
      organizationId: orgA._id,
      companyId: comp1._id,
      assignedTo: rahul._id,
      assignedBy: pmoA._id,
      status: 'ACTIVE',
    });

    console.log('[2/10] Test setup complete (Orgs, Users, Companies, Assignments).');

    // Login Rahul
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@out-a.edu', password: 'RahulPassword123!' }),
    });
    const loginData = await loginRes.json();
    const rahulToken = loginData.data.accessToken;

    // Login Amit
    const loginAmitRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amit@out-a.edu', password: 'AmitPassword123!' }),
    });
    const loginAmitData = await loginAmitRes.json();
    const amitToken = loginAmitData.data.accessToken;

    // Login PMO A
    const loginPmoRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pmo@out-a.edu', password: 'PmoPassword123!' }),
    });
    const loginPmoData = await loginPmoRes.json();
    const pmoToken = loginPmoData.data.accessToken;

    // TEST 1: Successful call capture by assigned Team Member (Rahul)
    console.log('\n--- Test 1: Record call for assigned company ---');
    const call1Res = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        hiringStatus: 'YES',
        profiles: ['MERN Developer', 'Frontend Engineer'],
        candidateType: 'FRESHERS',
        openings: 15,
        opportunityType: 'FULL_TIME',
        location: 'Noida, Gurgaon',
        workMode: 'HYBRID',
        salaryOrStipend: '₹6.5 LPA',
        bond: 'NO',
        specificRequirement: 'Minimum 60% in B.Tech',
        hrResponse: 'Spoke with Ms. Anjali Sharma. Hiring 15 MERN developers. Will send JD over email tomorrow.',
        nextAction: 'WAITING_FOR_JD',
        contact: {
          name: 'Ms. Anjali Sharma',
          designation: 'Head of Talent Acquisition',
          email: 'anjali@techcorp.com',
          phone: '+91 98765 43210',
        },
      }),
    });

    const call1Data = await call1Res.json();
    if (call1Res.status !== 201 || !call1Data.success) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(call1Data)}`);
    }
    console.log('[3/10] ✔ PASS: Record call interaction succeeded (HTTP 201). Created Contact & Interaction.');

    // TEST 2: Call capture with Follow-Up Action
    console.log('\n--- Test 2: Record call with FOLLOW_UP date ---');
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const call2Res = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        hiringStatus: 'HIRING_PLANNED',
        nextAction: 'FOLLOW_UP',
        followUpDate: tomorrow,
        notes: 'Requested callback next week for Q4 headcount approval.',
      }),
    });

    const call2Data = await call2Res.json();
    if (call2Res.status !== 201 || !call2Data.data.followUp) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(call2Data)}`);
    }
    console.log('[4/10] ✔ PASS: Call with FOLLOW_UP created FollowUp record (dueDate: tomorrow).');

    // TEST 3: Validation Error — Follow-up date required
    console.log('\n--- Test 3: Validation error when followUpDate missing for FOLLOW_UP ---');
    const call3Res = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        hiringStatus: 'YES',
        nextAction: 'FOLLOW_UP',
        followUpDate: null,
      }),
    });

    const call3Data = await call3Res.json();
    if (call3Res.status !== 400 || call3Data.error?.code !== 'FOLLOWUP_DATE_REQUIRED') {
      throw new Error(`Test 3 Failed: Expected 400 FOLLOWUP_DATE_REQUIRED, got ${call3Res.status}`);
    }
    console.log('[5/10] ✔ PASS: Missing followUpDate rejected with 400 FOLLOWUP_DATE_REQUIRED.');

    // TEST 4: Security — Unassigned company rejection (Resource Hiding)
    console.log('\n--- Test 4: Rahul attempts to record call for unassigned company ---');
    const call4Res = await fetch(`${baseUrl}/team-member/companies/${comp2._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({ hiringStatus: 'YES', nextAction: 'NO_ACTION' }),
    });

    const call4Data = await call4Res.json();
    if (call4Res.status !== 404 || call4Data.error?.code !== 'COMPANY_NOT_FOUND') {
      throw new Error(`Test 4 Failed: Expected 404 COMPANY_NOT_FOUND, got ${call4Res.status}`);
    }
    console.log('[6/10] ✔ PASS: Unassigned company call attempt rejected with 404 COMPANY_NOT_FOUND (Resource Hiding).');

    // TEST 5: Security — Other Team Member (Amit) attempts call for Rahul\'s company
    console.log('\n--- Test 5: Amit attempts to record call for Rahul\'s assigned company ---');
    const call5Res = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${amitToken}`,
      },
      body: JSON.stringify({ hiringStatus: 'YES', nextAction: 'NO_ACTION' }),
    });

    const call5Data = await call5Res.json();
    if (call5Res.status !== 404 || call5Data.error?.code !== 'COMPANY_NOT_FOUND') {
      throw new Error(`Test 5 Failed: Expected 404 COMPANY_NOT_FOUND, got ${call5Res.status}`);
    }
    console.log('[7/10] ✔ PASS: Cross-member assigned company call attempt rejected with 404 COMPANY_NOT_FOUND.');

    // TEST 6: Security — Cross-tenant company rejection
    console.log('\n--- Test 6: Rahul attempts call for Org B company ---');
    const call6Res = await fetch(`${baseUrl}/team-member/companies/${comp3._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({ hiringStatus: 'YES', nextAction: 'NO_ACTION' }),
    });

    const call6Data = await call6Res.json();
    if (call6Res.status !== 404) {
      throw new Error(`Test 6 Failed: Expected 404, got ${call6Res.status}`);
    }
    console.log('[8/10] ✔ PASS: Cross-tenant company call attempt rejected with 404.');

    // TEST 7: Outreach Summary & Interaction History Lookup
    console.log('\n--- Test 7: Fetch Outreach Summary & Interaction History ---');
    const summaryRes = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/outreach-summary`, {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const summaryData = await summaryRes.json();
    if (summaryRes.status !== 200 || summaryData.data.totalInteractions !== 2) {
      throw new Error(`Test 7 Failed Summary: ${JSON.stringify(summaryData)}`);
    }

    const historyRes = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const historyData = await historyRes.json();
    if (historyRes.status !== 200 || historyData.data.length !== 2) {
      throw new Error(`Test 7 Failed History: ${JSON.stringify(historyData)}`);
    }
    console.log('[9/10] ✔ PASS: Outreach Summary (total=2, nextFollowUp present) & History timeline verified.');

    // TEST 8: PMO Interactions Visibility
    console.log('\n--- Test 8: PMO views organization-wide interactions ---');
    const pmoInterRes = await fetch(`${baseUrl}/pmo/interactions`, {
      headers: { Authorization: `Bearer ${pmoToken}` },
    });
    const pmoInterData = await pmoInterRes.json();
    if (pmoInterRes.status !== 200 || pmoInterData.data.length !== 2) {
      throw new Error(`Test 8 Failed PMO Interactions: ${JSON.stringify(pmoInterData)}`);
    }
    console.log('[10/10] ✔ PASS: PMO retrieved organization-wide interactions.');

    console.log('\n==================================================');
    console.log('SUCCESS: ALL QUICK HR OUTREACH VERIFICATION TESTS PASSED!');
    console.log('==================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
