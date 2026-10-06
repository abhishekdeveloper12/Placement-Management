import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';

import pmoAnalyticsService from '../services/pmoAnalytics.service.js';
import companyService from '../services/company.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management';

async function runVerification() {
  console.log('--- STARTING FEEDBACK-DRIVEN CURRENTLY HIRING VERIFICATION ---');

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  let testOrgA = null;
  let testOrgB = null;

  try {
    // 1. Create Test Organization A
    const ts = Date.now().toString().slice(-10);
    testOrgA = await Organization.create({
      name: 'Alpha Institute of Tech (Test)',
      code: `HA_${ts}`,
      email: `contact_${ts}@alpha-test.edu`,
      status: 'ACTIVE',
      isTestData: true,
    });

    testOrgB = await Organization.create({
      name: 'Beta Defense Tech (Test)',
      code: `HB_${ts}`,
      email: `contact_${ts}@beta-test.edu`,
      status: 'ACTIVE',
      isTestData: true,
    });

    // 2. Create Users
    const pmoUser = await User.create({
      name: 'PMO Lead Alpha',
      email: `pmo_${Date.now()}@alpha-test.edu`,
      passwordHash: 'hashed_pw',
      role: 'PMO',
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: `rahul_${Date.now()}@alpha-test.edu`,
      passwordHash: 'hashed_pw',
      role: 'TEAM_MEMBER',
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    const priya = await User.create({
      name: 'Priya Singh',
      email: `priya_${Date.now()}@alpha-test.edu`,
      passwordHash: 'hashed_pw',
      role: 'TEAM_MEMBER',
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    const pmoUserContext = {
      id: pmoUser._id.toString(),
      _id: pmoUser._id,
      name: pmoUser.name,
      email: pmoUser.email,
      role: pmoUser.role,
      organizationId: testOrgA._id,
    };

    // 3. Create Companies for Org A
    const compA = await Company.create({
      companyName: 'Acme SaaS Solutions',
      industry: 'SaaS',
      city: 'Bangalore',
      organizationId: testOrgA._id,
      createdBy: pmoUser._id,
      source: 'MANUAL_PMO',
      isTestData: true,
    });

    const compB = await Company.create({
      companyName: 'Beacon Financial Corp',
      industry: 'Finance',
      city: 'Mumbai',
      organizationId: testOrgA._id,
      createdBy: pmoUser._id,
      source: 'MANUAL_PMO',
      isTestData: true,
    });

    const compC = await Company.create({
      companyName: 'CyberPulse Tech',
      industry: 'Cybersecurity',
      city: 'Delhi',
      organizationId: testOrgA._id,
      createdBy: rahul._id,
      source: 'TEAM_MEMBER_SELF_ADDED',
      isTestData: true,
    });

    // Company for Org B (Tenant Isolation Test)
    const compOrgB = await Company.create({
      companyName: 'Secret Defense Systems',
      industry: 'Defense',
      organizationId: testOrgB._id,
      createdBy: pmoUser._id,
      source: 'MANUAL_PMO',
      isTestData: true,
    });

    // Create Active Assignments
    await Assignment.create({
      companyId: compA._id,
      assignedTo: rahul._id,
      assignedBy: pmoUser._id,
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    await Assignment.create({
      companyId: compB._id,
      assignedTo: priya._id,
      assignedBy: pmoUser._id,
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    await Assignment.create({
      companyId: compC._id,
      assignedTo: priya._id,
      assignedBy: pmoUser._id,
      organizationId: testOrgA._id,
      status: 'ACTIVE',
      isTestData: true,
    });

    console.log('✓ Test environment set up successfully.');

    // -------------------------------------------------------------
    // SCENARIO 1: Rahul logs HIRING_NOW for Company Alpha (01 Oct)
    // -------------------------------------------------------------
    const dateOct1 = new Date('2026-10-01T10:00:00Z');
    await Interaction.create({
      companyId: compA._id,
      organizationId: testOrgA._id,
      userId: rahul._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Rahul spoke with HR. Active openings for React Developer.',
      interactionDate: dateOct1,
      callDetails: {
        hiringStatus: 'YES',
        openings: 5,
        profiles: ['React Developer'],
        workMode: 'HYBRID',
      },
      isTestData: true,
    });

    let dashRes = await pmoAnalyticsService.getDashboardAnalytics(pmoUserContext, {});
    if (dashRes.hiring.currentlyHiring !== 1 || dashRes.hiring.totalRoles !== 5) {
      throw new Error(`Scenario 1 failed! Expected currentlyHiring=1, totalRoles=5. Got: ${JSON.stringify(dashRes.hiring)}`);
    }
    console.log('✓ Scenario 1 passed: Team Member HIRING_NOW feedback reflected on PMO dashboard.');

    // -------------------------------------------------------------
    // SCENARIO 2: Priya logs HIRING_PLANNED for Company Beta (02 Oct)
    // -------------------------------------------------------------
    const dateOct2 = new Date('2026-10-02T14:30:00Z');
    await Interaction.create({
      companyId: compB._id,
      organizationId: testOrgA._id,
      userId: priya._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_PLANNED',
      notes: 'Priya spoke with HR. Hiring planned next quarter.',
      interactionDate: dateOct2,
      callDetails: {
        hiringStatus: 'HIRING_PLANNED',
        openings: 3,
        profiles: ['Data Analyst'],
      },
      isTestData: true,
    });

    dashRes = await pmoAnalyticsService.getDashboardAnalytics(pmoUserContext, {});
    if (dashRes.hiring.currentlyHiring !== 1 || dashRes.hiring.hiringPlanned !== 1 || dashRes.hiring.totalRoles !== 5) {
      throw new Error(`Scenario 2 failed! Got currentlyHiring=${dashRes.hiring.currentlyHiring}, hiringPlanned=${dashRes.hiring.hiringPlanned}`);
    }
    console.log('✓ Scenario 2 passed: HIRING_PLANNED feedback tracked separately without inflating Currently Hiring.');

    // -------------------------------------------------------------
    // SCENARIO 3: Rahul logs NOT_HIRING for Company Gamma (03 Oct)
    // -------------------------------------------------------------
    const dateOct3 = new Date('2026-10-03T11:00:00Z');
    await Interaction.create({
      companyId: compC._id,
      organizationId: testOrgA._id,
      userId: rahul._id,
      interactionType: 'PHONE_CALL',
      outcome: 'NOT_HIRING',
      notes: 'Rahul spoke with HR. Freeze on hiring.',
      interactionDate: dateOct3,
      callDetails: {
        hiringStatus: 'NO',
      },
      isTestData: true,
    });

    dashRes = await pmoAnalyticsService.getDashboardAnalytics(pmoUserContext, {});
    if (dashRes.hiring.currentlyHiring !== 1) {
      throw new Error(`Scenario 3 failed! Expected currentlyHiring=1, got ${dashRes.hiring.currentlyHiring}`);
    }
    console.log('✓ Scenario 3 passed: NOT_HIRING feedback excluded from Currently Hiring.');

    // -------------------------------------------------------------
    // SCENARIO 4: Priya logs NEW interaction for Company Gamma with HIRING_NOW (06 Oct)
    // -------------------------------------------------------------
    const dateOct6 = new Date('2026-10-06T16:00:00Z');
    await Interaction.create({
      companyId: compC._id,
      organizationId: testOrgA._id,
      userId: priya._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Priya spoke with HR. Hiring un-frozen! 8 openings for Fullstack Engineers.',
      interactionDate: dateOct6,
      callDetails: {
        hiringStatus: 'YES',
        openings: 8,
        profiles: ['Fullstack Engineer'],
      },
      isTestData: true,
    });

    dashRes = await pmoAnalyticsService.getDashboardAnalytics(pmoUserContext, {});
    if (dashRes.hiring.currentlyHiring !== 2 || dashRes.hiring.totalRoles !== 13) {
      throw new Error(`Scenario 4 failed! Expected currentlyHiring=2, totalRoles=13 (5+8). Got: ${JSON.stringify(dashRes.hiring)}`);
    }
    console.log('✓ Scenario 4 passed: Latest feedback override promoted company to Currently Hiring.');

    // -------------------------------------------------------------
    // SCENARIO 5: Verify Sorting (Newest Feedback First) & Feedback Collector
    // -------------------------------------------------------------
    let listRes = await companyService.getCompanies(pmoUserContext, { hiringStatus: 'HIRING_NOW' });
    if (listRes.data.length !== 2) {
      throw new Error(`Scenario 5 failed! Expected 2 currently hiring companies, got ${listRes.data.length}`);
    }

    const firstComp = listRes.data[0];
    const secondComp = listRes.data[1];

    if (firstComp.companyName !== 'CyberPulse Tech' || secondComp.companyName !== 'Acme SaaS Solutions') {
      throw new Error(`Scenario 5 SORTING FAILURE! Expected [CyberPulse Tech (06 Oct), Acme SaaS (01 Oct)], got [${firstComp.companyName}, ${secondComp.companyName}]`);
    }

    if (firstComp.lastContactedBy?.name !== 'Priya Singh') {
      throw new Error(`Scenario 5 COLLECTOR FAILURE! Expected Priya Singh for CyberPulse Tech, got ${firstComp.lastContactedBy?.name}`);
    }

    if (secondComp.lastContactedBy?.name !== 'Rahul Sharma') {
      throw new Error(`Scenario 5 COLLECTOR FAILURE! Expected Rahul Sharma for Acme SaaS, got ${secondComp.lastContactedBy?.name}`);
    }
    console.log('✓ Scenario 5 passed: Currently Hiring list sorted NEWEST feedback date first (06 Oct before 01 Oct) with correct feedback collectors.');

    // -------------------------------------------------------------
    // SCENARIO 6: Latest Feedback changes Company Alpha to NOT_HIRING (07 Oct)
    // -------------------------------------------------------------
    const dateOct7 = new Date('2026-10-07T09:00:00Z');
    await Interaction.create({
      companyId: compA._id,
      organizationId: testOrgA._id,
      userId: rahul._id,
      interactionType: 'PHONE_CALL',
      outcome: 'NOT_HIRING',
      notes: 'Rahul spoke with HR. Positions filled.',
      interactionDate: dateOct7,
      callDetails: {
        hiringStatus: 'NO',
      },
      isTestData: true,
    });

    dashRes = await pmoAnalyticsService.getDashboardAnalytics(pmoUserContext, {});
    if (dashRes.hiring.currentlyHiring !== 1) {
      throw new Error(`Scenario 6 failed! Expected currentlyHiring=1 after Company Alpha changed to NOT_HIRING, got ${dashRes.hiring.currentlyHiring}`);
    }

    listRes = await companyService.getCompanies(pmoUserContext, { hiringStatus: 'HIRING_NOW' });
    if (listRes.data.length !== 1 || listRes.data[0].companyName !== 'CyberPulse Tech') {
      throw new Error(`Scenario 6 filter failed! Expected only CyberPulse Tech in HIRING_NOW view.`);
    }
    console.log('✓ Scenario 6 passed: Company automatically dropped from Currently Hiring after newest feedback changed to NOT_HIRING.');

    // -------------------------------------------------------------
    // SCENARIO 7: Multiple interactions deduplication test
    // -------------------------------------------------------------
    await Interaction.create({
      companyId: compC._id,
      organizationId: testOrgA._id,
      userId: rahul._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Rahul logged second call for CyberPulse Tech.',
      interactionDate: new Date('2026-10-08T10:00:00Z'),
      callDetails: { hiringStatus: 'YES', openings: 8 },
      isTestData: true,
    });

    listRes = await companyService.getCompanies(pmoUserContext, { hiringStatus: 'HIRING_NOW' });
    if (listRes.data.length !== 1) {
      throw new Error(`Scenario 7 DEDUPLICATION FAILURE! Expected 1 unique row for CyberPulse Tech, got ${listRes.data.length}`);
    }
    console.log('✓ Scenario 7 passed: Multiple calls for the same company deduplicated (appears exactly once).');

    // -------------------------------------------------------------
    // SCENARIO 8: Strict Tenant Boundary Isolation
    // -------------------------------------------------------------
    await Interaction.create({
      companyId: compOrgB._id,
      organizationId: testOrgB._id,
      userId: pmoUser._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Org B Secret Defense active hiring.',
      callDetails: { hiringStatus: 'YES', openings: 50 },
      isTestData: true,
    });

    listRes = await companyService.getCompanies(pmoUserContext, { hiringStatus: 'HIRING_NOW' });
    const orgBCompanyFound = listRes.data.find((c) => c.id === compOrgB._id.toString());
    if (orgBCompanyFound) {
      throw new Error('TENANT ISOLATION FAILURE! Org A PMO was able to see Org B company!');
    }
    console.log('✓ Scenario 8 passed: Strict tenant boundary enforced (Org B company hidden from Org A PMO).');

    console.log('--- ALL FEEDBACK-DRIVEN CURRENTLY HIRING VERIFICATION TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    if (testOrgA) {
      await Interaction.deleteMany({ organizationId: testOrgA._id });
      await Assignment.deleteMany({ organizationId: testOrgA._id });
      await Company.deleteMany({ organizationId: testOrgA._id });
      await User.deleteMany({ organizationId: testOrgA._id });
      await Organization.deleteOne({ _id: testOrgA._id });
    }
    if (testOrgB) {
      await Interaction.deleteMany({ organizationId: testOrgB._id });
      await Company.deleteMany({ organizationId: testOrgB._id });
      await Organization.deleteOne({ _id: testOrgB._id });
    }
    await mongoose.disconnect();
  }
}

runVerification();
