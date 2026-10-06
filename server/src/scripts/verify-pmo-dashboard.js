import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import pmoAnalyticsService from '../services/pmoAnalytics.service.js';

async function runVerification() {
  console.log('\n--- STARTING PMO DASHBOARD & TEAM ANALYTICS VERIFICATION TEST ---\n');

  try {
    await connectDatabase();
    console.log('[1/9] Connected to MongoDB test database.');

    // 1. Clean up existing test data
    await Organization.deleteMany({ code: { $in: ['TEST_DASH_ORG_A', 'TEST_DASH_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['pmo_dash_a@test.com', 'pmo_dash_b@test.com', 'tm_dash_1@test.com', 'tm_dash_2@test.com'] } });
    await Company.deleteMany({ normalizedName: { $in: ['dash corp a1', 'dash corp a2', 'dash corp a3', 'dash corp b1'] } });
    await Assignment.deleteMany({});
    await Interaction.deleteMany({});
    await FollowUp.deleteMany({});
    await JobOpportunity.deleteMany({});

    // 2. Setup Organizations & Users
    const orgA = await Organization.create({
      name: 'Dashboard Test College A',
      code: 'TEST_DASH_ORG_A',
      email: 'contact@dash-a.edu',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Dashboard Test College B',
      code: 'TEST_DASH_ORG_B',
      email: 'contact@dash-b.edu',
      status: 'ACTIVE',
    });

    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Director A',
      email: 'pmo_dash_a@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Director B',
      email: 'pmo_dash_b@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const teamMember1 = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Outreach Lead',
      email: 'tm_dash_1@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const teamMember2 = await User.create({
      organizationId: orgA._id,
      name: 'Amit New Member',
      email: 'tm_dash_2@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    // 3. Setup Companies in Org A & Org B
    const companyA1 = await Company.create({
      organizationId: orgA._id,
      companyName: 'Dash Corp A1',
      normalizedName: 'dashcorpa1',
      industry: 'Software',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyA2 = await Company.create({
      organizationId: orgA._id,
      companyName: 'Dash Corp A2',
      normalizedName: 'dashcorpa2',
      industry: 'Finance',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyA3 = await Company.create({
      organizationId: orgA._id,
      companyName: 'Dash Corp A3',
      normalizedName: 'dashcorpa3',
      industry: 'Consulting',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyB1 = await Company.create({
      organizationId: orgB._id,
      companyName: 'Dash Corp B1',
      normalizedName: 'dashcorpb1',
      industry: 'Healthcare',
      status: 'ACTIVE',
      createdBy: pmoUserB._id,
    });

    // 4. Assignments: Assign A1 and A2 to Rahul (teamMember1). A3 is unassigned.
    await Assignment.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      assignedTo: teamMember1._id,
      assignedBy: pmoUserA._id,
      status: 'ACTIVE',
    });

    await Assignment.create({
      organizationId: orgA._id,
      companyId: companyA2._id,
      assignedTo: teamMember1._id,
      assignedBy: pmoUserA._id,
      status: 'ACTIVE',
    });

    // 5. Interactions: Rahul makes 3 calls to company A1, 0 calls to A2, 0 calls to A3.
    // Unique contacted companies for Org A = 1 (A1).
    await Interaction.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      userId: teamMember1._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'First call to HR',
      interactionDate: new Date(),
    });

    await Interaction.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      userId: teamMember1._id,
      interactionType: 'EMAIL',
      outcome: 'WAITING_FOR_JD',
      notes: 'Follow-up email sent',
      interactionDate: new Date(),
    });

    await Interaction.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      userId: teamMember1._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'JD received during call',
      interactionDate: new Date(),
    });

    // 6. Job Opportunities in Org A: 2 opportunities for company A1 (1 HIRING_NOW & shortlisted, 1 HIRING_PLANNED)
    await JobOpportunity.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      title: 'Senior Software Developer 2026',
      opportunityType: 'FULL_TIME',
      candidateType: 'FRESHERS',
      hiringStatus: 'HIRING_NOW',
      isShortlisted: true,
      createdBy: teamMember1._id,
    });

    await JobOpportunity.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      title: 'QA Automation Intern 2026',
      opportunityType: 'INTERNSHIP',
      candidateType: 'FRESHERS',
      hiringStatus: 'HIRING_PLANNED',
      isShortlisted: false,
      createdBy: teamMember1._id,
    });

    // 7. Follow-ups in Org A: 1 Overdue, 1 Today for Rahul
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    await FollowUp.create({
      organizationId: orgA._id,
      companyId: companyA1._id,
      assignedTo: teamMember1._id,
      dueDate: yesterday,
      reason: 'Overdue callback to HR',
      status: 'PENDING',
    });

    await FollowUp.create({
      organizationId: orgA._id,
      companyId: companyA2._id,
      assignedTo: teamMember1._id,
      dueDate: new Date(),
      reason: 'Initial outreach call to A2',
      status: 'PENDING',
    });

    console.log('[2/9] Test dataset established.');

    // --- TEST 1: Retrieve PMO Dashboard for Org A ---
    console.log('\n--- Test 1: Retrieve PMO Dashboard Analytics for Org A ---');
    const analyticsA = await pmoAnalyticsService.getDashboardAnalytics(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      { dateRange: '30d' }
    );

    if (analyticsA && analyticsA.companies && analyticsA.hiring && analyticsA.teamPerformance) {
      console.log('[3/9] ✔ PASS: PMO Dashboard analytics object constructed successfully.');
    } else {
      throw new Error('PMO Dashboard payload incomplete');
    }

    // --- TEST 2: Company Metrics Accuracy & Unique Contacted Count ---
    console.log('\n--- Test 2: Verify Company KPI Cards & Unique Contacted Count ---');
    const comp = analyticsA.companies;
    console.log(`Total: ${comp.totalCompanies}, Assigned: ${comp.assignedCompanies}, Unassigned: ${comp.unassignedCompanies}, Contacted: ${comp.contactedCompanies}, Not Contacted: ${comp.notContactedCompanies}`);

    if (
      comp.totalCompanies === 3 &&
      comp.assignedCompanies === 2 &&
      comp.unassignedCompanies === 1 &&
      comp.contactedCompanies === 1 && // Company A1 (despite 3 calls)
      comp.notContactedCompanies === 2
    ) {
      console.log('[4/9] ✔ PASS: Company metrics & unique contacted deduction verified (3 calls to 1 company = 1 contacted company).');
    } else {
      throw new Error(`Company metrics calculation failed: ${JSON.stringify(comp)}`);
    }

    // --- TEST 3: Team Performance Table & Coverage Calculation ---
    console.log('\n--- Test 3: Verify Team Performance Table & Coverage % ---');
    const teamTable = analyticsA.teamPerformance;
    const rahulRow = teamTable.find((t) => t.teamMember.email === 'tm_dash_1@test.com');
    const amitRow = teamTable.find((t) => t.teamMember.email === 'tm_dash_2@test.com');

    console.log(`Rahul: Assigned=${rahulRow.assigned}, Contacted=${rahulRow.contacted}, Pending=${rahulRow.pending}, Hiring=${rahulRow.currentlyHiring}, FollowUps=${rahulRow.followUps}, Coverage=${rahulRow.coverage}%`);
    console.log(`Amit: Assigned=${amitRow.assigned}, Contacted=${amitRow.contacted}, Coverage=${amitRow.coverage}%`);

    if (
      rahulRow &&
      rahulRow.assigned === 2 &&
      rahulRow.contacted === 1 &&
      rahulRow.pending === 1 &&
      rahulRow.currentlyHiring === 1 &&
      rahulRow.followUps === 2 &&
      rahulRow.coverage === 50 && // 1 contacted / 2 assigned * 100 = 50%
      amitRow &&
      amitRow.assigned === 0 &&
      amitRow.coverage === 0 // 0 assigned => 0% coverage (division by zero handled)
    ) {
      console.log('[5/9] ✔ PASS: Team performance table metrics & coverage calculation verified (Rahul=50%, Amit=0%).');
    } else {
      throw new Error(`Team performance calculation failed: Rahul=${JSON.stringify(rahulRow)}, Amit=${JSON.stringify(amitRow)}`);
    }

    // --- TEST 4: Hiring & Follow-up Summaries ---
    console.log('\n--- Test 4: Verify Hiring & Follow-up Summaries ---');
    const hiring = analyticsA.hiring;
    const followUps = analyticsA.followUps;

    if (
      hiring.currentlyHiring === 1 &&
      hiring.hiringPlanned === 1 &&
      hiring.shortlistedOpportunities === 1 &&
      hiring.totalOpportunities === 2 &&
      followUps.overdue === 1 &&
      followUps.today === 1 &&
      followUps.totalPending === 2
    ) {
      console.log('[6/9] ✔ PASS: Hiring & Follow-up summaries verified against active records.');
    } else {
      throw new Error(`Hiring/FollowUp summary failed: hiring=${JSON.stringify(hiring)}, followUps=${JSON.stringify(followUps)}`);
    }

    // --- TEST 5: Charts & Activity Feed ---
    console.log('\n--- Test 5: Verify Charts Data & Recent Activity Feed ---');
    const charts = analyticsA.charts;
    const activity = analyticsA.recentActivity;

    if (
      charts.hiringStatusDistribution &&
      charts.opportunityTypeDistribution &&
      charts.outreachActivity.length === 31 && // 30d range has 31 daily points
      activity.length >= 4
    ) {
      console.log(`[7/9] ✔ PASS: Chart series & recent activity timeline formatted (${activity.length} events logged).`);
    } else {
      throw new Error('Charts/Activity verification failed');
    }

    // --- TEST 6: Tenant Security & Cross-Organization Isolation ---
    console.log('\n--- Test 6: Verify Tenant Isolation for PMO Org B ---');
    const analyticsB = await pmoAnalyticsService.getDashboardAnalytics(
      { id: pmoUserB._id.toString(), organizationId: orgB._id.toString(), role: 'PMO' },
      { dateRange: '30d' }
    );

    if (
      analyticsB.companies.totalCompanies === 1 && // Only company B1
      analyticsB.companies.assignedCompanies === 0 &&
      analyticsB.hiring.totalOpportunities === 0 &&
      analyticsB.teamPerformance.length === 0
    ) {
      console.log('[8/9] ✔ PASS: Strict multi-tenant isolation verified (PMO B sees 0 Org A data).');
    } else {
      throw new Error(`Tenant isolation failed: ${JSON.stringify(analyticsB.companies)}`);
    }

    // --- TEST 7: Cross-Tenant Team Member Filter Guardrail ---
    console.log('\n--- Test 7: Verify Cross-Tenant Team Member Filter Rejection ---');
    try {
      await pmoAnalyticsService.getDashboardAnalytics(
        { id: pmoUserB._id.toString(), organizationId: orgB._id.toString(), role: 'PMO' },
        { teamMemberId: teamMember1._id.toString() }
      );
      throw new Error('Should have rejected cross-tenant teamMemberId filter');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'USER_NOT_FOUND') {
        console.log('[9/9] ✔ PASS: Cross-tenant teamMemberId filter rejected with 404 USER_NOT_FOUND.');
      } else {
        throw err;
      }
    }

    console.log('\n==================================================');
    console.log('SUCCESS: ALL PMO DASHBOARD & ANALYTICS TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runVerification();
