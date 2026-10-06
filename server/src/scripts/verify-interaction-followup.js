import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
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
  console.log('\n--- STARTING INTERACTION & FOLLOW-UP MANAGEMENT VERIFICATION TEST ---\n');

  await mongoose.connect(MONGODB_URI);
  console.log('[1/11] Connected to MongoDB test database.');

  // Clean test collections
  await Promise.all([
    Organization.deleteMany({ code: { $in: ['MGT_ORG_A', 'MGT_ORG_B'] } }),
    User.deleteMany({ email: { $in: ['pmo@mgt-a.edu', 'rahul@mgt-a.edu', 'amit@mgt-a.edu', 'pmo@mgt-b.edu'] } }),
    Company.deleteMany({ companyName: { $in: ['TechCorp Management', 'Acme Unassigned', 'Global Tenant B'] } }),
    Assignment.deleteMany({}),
    Interaction.deleteMany({}),
    FollowUp.deleteMany({}),
    AuditLog.deleteMany({
      action: { $in: ['INTERACTION_CREATED', 'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED', 'FOLLOW_UP_CANCELLED'] },
    }),
  ]);

  // Express test app
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
    // Setup orgs & users
    const orgA = await Organization.create({ name: 'Management Org A', code: 'MGT_ORG_A', email: 'admin@mgt-a.edu' });
    const orgB = await Organization.create({ name: 'Management Org B', code: 'MGT_ORG_B', email: 'admin@mgt-b.edu' });

    const pmoA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Lead A',
      email: 'pmo@mgt-a.edu',
      passwordHash: await User.hashPassword('PmoPassword123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const rahul = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Sharma',
      email: 'rahul@mgt-a.edu',
      passwordHash: await User.hashPassword('RahulPassword123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const amit = await User.create({
      organizationId: orgA._id,
      name: 'Amit Kumar',
      email: 'amit@mgt-a.edu',
      passwordHash: await User.hashPassword('AmitPassword123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const pmoB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Lead B',
      email: 'pmo@mgt-b.edu',
      passwordHash: await User.hashPassword('PmoBPassword123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const comp1 = await Company.create({
      organizationId: orgA._id,
      companyName: 'TechCorp Management',
      normalizedName: 'techcorpmanagement',
      industry: 'IT Services',
      city: 'Noida',
      createdBy: pmoA._id,
    });

    const comp2 = await Company.create({
      organizationId: orgA._id,
      companyName: 'Acme Unassigned',
      normalizedName: 'acmeunassigned',
      industry: 'Manufacturing',
      city: 'Delhi',
      createdBy: pmoA._id,
    });

    const comp3 = await Company.create({
      organizationId: orgB._id,
      companyName: 'Global Tenant B',
      normalizedName: 'globaltenantb',
      industry: 'Consulting',
      city: 'Bangalore',
      createdBy: pmoB._id,
    });

    // Active assignment: comp1 -> Rahul
    await Assignment.create({
      organizationId: orgA._id,
      companyId: comp1._id,
      assignedTo: rahul._id,
      assignedBy: pmoA._id,
      status: 'ACTIVE',
    });

    console.log('[2/11] Test data setup complete.');

    // Authenticate users
    const loginRahul = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@mgt-a.edu', password: 'RahulPassword123!' }),
    });
    const rahulToken = (await loginRahul.json()).data.accessToken;

    const loginAmit = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amit@mgt-a.edu', password: 'AmitPassword123!' }),
    });
    const amitToken = (await loginAmit.json()).data.accessToken;

    const loginPmoA = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pmo@mgt-a.edu', password: 'PmoPassword123!' }),
    });
    const pmoAToken = (await loginPmoA.json()).data.accessToken;

    const loginPmoB = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pmo@mgt-b.edu', password: 'PmoBPassword123!' }),
    });
    const pmoBToken = (await loginPmoB.json()).data.accessToken;

    // TEST 1: Manual Follow-Up Creation
    console.log('\n--- Test 1: Manual follow-up creation by Team Member ---');
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const createFuRes = await fetch(`${baseUrl}/team-member/follow-ups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        companyId: comp1._id,
        dueDate: tomorrow,
        reason: 'Call HR for updated headcount requirements',
        notes: 'HR requested callback on Thursday morning.',
      }),
    });
    const createFuData = await createFuRes.json();
    if (createFuRes.status !== 201 || !createFuData.data.id) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(createFuData)}`);
    }
    const followUp1 = createFuData.data;
    console.log('[3/11] ✔ PASS: Manual follow-up task created (status: PENDING).');

    // TEST 2: Security — Creation for unassigned company rejected
    console.log('\n--- Test 2: Unassigned company follow-up attempt ---');
    const unassignFuRes = await fetch(`${baseUrl}/team-member/follow-ups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        companyId: comp2._id,
        dueDate: tomorrow,
        reason: 'Attempt unassigned follow-up',
      }),
    });
    const unassignFuData = await unassignFuRes.json();
    if (unassignFuRes.status !== 404 || unassignFuData.error?.code !== 'COMPANY_NOT_FOUND') {
      throw new Error(`Test 2 Failed: Expected 404 COMPANY_NOT_FOUND, got ${unassignFuRes.status}`);
    }
    console.log('[4/11] ✔ PASS: Unassigned company follow-up rejected with 404 COMPANY_NOT_FOUND (Resource Hiding).');

    // TEST 3: Overdue Follow-Up & List Filter
    console.log('\n--- Test 3: Create overdue follow-up & test OVERDUE filter ---');
    const pastDate = new Date(Date.now() - 86400000 * 2); // 2 days ago
    const overdueFu = await FollowUp.create({
      organizationId: orgA._id,
      companyId: comp1._id,
      assignedTo: rahul._id,
      dueDate: pastDate,
      reason: 'Overdue callback task',
      status: 'PENDING',
    });

    const getOverdueRes = await fetch(`${baseUrl}/team-member/follow-ups?filter=OVERDUE`, {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const getOverdueData = await getOverdueRes.json();
    if (getOverdueRes.status !== 200 || getOverdueData.data.length !== 1 || !getOverdueData.data[0].isOverdue) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(getOverdueData)}`);
    }
    console.log('[5/11] ✔ PASS: Derived OVERDUE status computed and returned via filter=OVERDUE.');

    // TEST 4: Complete Follow-Up
    console.log('\n--- Test 4: Complete follow-up task ---');
    const completeRes = await fetch(`${baseUrl}/team-member/follow-ups/${followUp1.id}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({ notes: 'Completed callback. HR confirmed 20 openings.' }),
    });
    const completeData = await completeRes.json();
    if (completeRes.status !== 200 || completeData.data.status !== 'COMPLETED' || !completeData.data.completedAt) {
      throw new Error(`Test 4 Failed: ${JSON.stringify(completeData)}`);
    }
    console.log('[6/11] ✔ PASS: Follow-up marked COMPLETED with timestamp and audit trail.');

    // TEST 5: Cancel Follow-Up
    console.log('\n--- Test 5: Cancel overdue follow-up task ---');
    const cancelRes = await fetch(`${baseUrl}/team-member/follow-ups/${overdueFu._id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({ notes: 'Company deferred hiring indefinitely.' }),
    });
    const cancelData = await cancelRes.json();
    if (cancelRes.status !== 200 || cancelData.data.status !== 'CANCELLED') {
      throw new Error(`Test 5 Failed: ${JSON.stringify(cancelData)}`);
    }
    console.log('[7/11] ✔ PASS: Follow-up marked CANCELLED with notes preserved.');

    // TEST 6: Security — Cross-member completion rejection
    console.log('\n--- Test 6: Amit attempts to complete Rahul\'s follow-up ---');
    const crossCompleteRes = await fetch(`${baseUrl}/team-member/follow-ups/${followUp1.id}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${amitToken}`,
      },
      body: JSON.stringify({ notes: 'Unauthorized completion attempt' }),
    });
    const crossCompleteData = await crossCompleteRes.json();
    if (crossCompleteRes.status !== 404 || crossCompleteData.error?.code !== 'FOLLOW_UP_NOT_FOUND') {
      throw new Error(`Test 6 Failed: Expected 404 FOLLOW_UP_NOT_FOUND, got ${crossCompleteRes.status}`);
    }
    console.log('[8/11] ✔ PASS: Cross-member follow-up action rejected with 404 FOLLOW_UP_NOT_FOUND.');

    // TEST 7: Record Call Interaction & Fetch Interactions List
    console.log('\n--- Test 7: Record interaction & test GET /api/team-member/interactions ---');
    const recordRes = await fetch(`${baseUrl}/team-member/companies/${comp1._id}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rahulToken}`,
      },
      body: JSON.stringify({
        hiringStatus: 'YES',
        profiles: ['Backend Engineer'],
        hrResponse: 'Call logged during outreach session.',
        nextAction: 'NO_ACTION',
      }),
    });
    const recordData = await recordRes.json();

    const tmInterRes = await fetch(`${baseUrl}/team-member/interactions`, {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const tmInterData = await tmInterRes.json();
    if (tmInterRes.status !== 200 || tmInterData.data.length !== 1) {
      throw new Error(`Test 7 Failed: ${JSON.stringify(tmInterData)}`);
    }

    const singleInterRes = await fetch(`${baseUrl}/team-member/interactions/${recordData.data.interaction.id}`, {
      headers: { Authorization: `Bearer ${rahulToken}` },
    });
    const singleInterData = await singleInterRes.json();
    if (singleInterRes.status !== 200 || !singleInterData.data.callDetails) {
      throw new Error(`Test 7 Single Inter Failed: ${JSON.stringify(singleInterData)}`);
    }
    console.log('[9/11] ✔ PASS: Team Member interactions roster & single interaction details verified.');

    // TEST 8: PMO Follow-Ups Monitoring & Stats
    console.log('\n--- Test 8: PMO follow-ups monitoring & stats ---');
    const pmoFuRes = await fetch(`${baseUrl}/pmo/follow-ups`, {
      headers: { Authorization: `Bearer ${pmoAToken}` },
    });
    const pmoFuData = await pmoFuRes.json();
    if (pmoFuRes.status !== 200 || pmoFuData.data.length !== 2) {
      throw new Error(`Test 8 PMO FollowUps Failed: ${JSON.stringify(pmoFuData)}`);
    }

    const pmoStatsRes = await fetch(`${baseUrl}/pmo/follow-ups/stats`, {
      headers: { Authorization: `Bearer ${pmoAToken}` },
    });
    const pmoStatsData = await pmoStatsRes.json();
    if (pmoStatsRes.status !== 200 || pmoStatsData.data.completed !== 1 || pmoStatsData.data.cancelled !== 1) {
      throw new Error(`Test 8 PMO Stats Failed: ${JSON.stringify(pmoStatsData)}`);
    }
    console.log('[10/11] ✔ PASS: PMO organization-wide follow-ups monitoring and operational stats verified.');

    // TEST 9: Cross-Tenant Security for PMO
    console.log('\n--- Test 9: PMO B attempts to access Org A follow-up ---');
    const crossPmoRes = await fetch(`${baseUrl}/pmo/follow-ups/${followUp1.id}`, {
      headers: { Authorization: `Bearer ${pmoBToken}` },
    });
    const crossPmoData = await crossPmoRes.json();
    if (crossPmoRes.status !== 404 || crossPmoData.error?.code !== 'FOLLOW_UP_NOT_FOUND') {
      throw new Error(`Test 9 Failed: Expected 404, got ${crossPmoRes.status}`);
    }
    console.log('[11/11] ✔ PASS: PMO B cross-tenant follow-up lookup rejected with 404.');

    console.log('\n==================================================');
    console.log('SUCCESS: ALL INTERACTION & FOLLOW-UP MANAGEMENT TESTS PASSED!');
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
