import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import JobOpportunity from '../models/JobOpportunity.js';
import superAdminAnalyticsService from '../services/superAdminAnalytics.service.js';

async function runVerification() {
  console.log('\n--- STARTING SUPER ADMIN GLOBAL DASHBOARD & ANALYTICS VERIFICATION TEST ---\n');

  try {
    await connectDatabase();
    console.log('[1/8] Connected to MongoDB test database.');

    // 1. Clean up existing test data
    await Organization.deleteMany({ code: { $in: ['GLOBAL_TEST_ORG_1', 'GLOBAL_TEST_ORG_2'] } });
    await User.deleteMany({ email: { $in: ['sa_global@test.com', 'pmo_g1@test.com', 'pmo_g2@test.com', 'tm_g1@test.com'] } });
    await Company.deleteMany({ normalizedName: { $in: ['global corp g1', 'global corp g2'] } });
    await Assignment.deleteMany({});
    await Interaction.deleteMany({});
    await JobOpportunity.deleteMany({});

    // 2. Setup Organizations & Users
    const superAdmin = await User.create({
      name: 'Super Admin Global Lead',
      email: 'sa_global@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    });

    const org1 = await Organization.create({
      name: 'Global Test University 1',
      code: 'GLOBAL_TEST_ORG_1',
      email: 'contact@g1.edu',
      status: 'ACTIVE',
    });

    const org2 = await Organization.create({
      name: 'Global Test College 2',
      code: 'GLOBAL_TEST_ORG_2',
      email: 'contact@g2.edu',
      status: 'ACTIVE',
    });

    const pmo1 = await User.create({
      organizationId: org1._id,
      name: 'PMO Director 1',
      email: 'pmo_g1@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmo2 = await User.create({
      organizationId: org2._id,
      name: 'PMO Director 2',
      email: 'pmo_g2@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const tm1 = await User.create({
      organizationId: org1._id,
      name: 'Team Member 1',
      email: 'tm_g1@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    // 3. Companies, Assignments & Interactions
    const company1 = await Company.create({
      organizationId: org1._id,
      companyName: 'Global Corp G1',
      normalizedName: 'globalcorpg1',
      industry: 'Software',
      status: 'ACTIVE',
      createdBy: pmo1._id,
    });

    const company2 = await Company.create({
      organizationId: org2._id,
      companyName: 'Global Corp G2',
      normalizedName: 'globalcorpg2',
      industry: 'Finance',
      status: 'ACTIVE',
      createdBy: pmo2._id,
    });

    await Assignment.create({
      organizationId: org1._id,
      companyId: company1._id,
      assignedTo: tm1._id,
      assignedBy: pmo1._id,
      status: 'ACTIVE',
    });

    await Interaction.create({
      organizationId: org1._id,
      companyId: company1._id,
      userId: tm1._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Global test call',
      interactionDate: new Date(),
    });

    await JobOpportunity.create({
      organizationId: org1._id,
      companyId: company1._id,
      title: 'Global Tech Trainee 2026',
      opportunityType: 'FULL_TIME',
      candidateType: 'FRESHERS',
      hiringStatus: 'HIRING_NOW',
      isShortlisted: true,
      createdBy: tm1._id,
    });

    console.log('[2/8] Platform-wide test data established.');

    // --- TEST 1: Retrieve Global Dashboard Analytics ---
    console.log('\n--- Test 1: Retrieve Platform-Wide Global Analytics ---');
    const globalData = await superAdminAnalyticsService.getGlobalDashboardAnalytics({ dateRange: '30d' });

    if (globalData && globalData.organizations && globalData.users && globalData.organizationPerformance) {
      console.log('[3/8] ✔ PASS: Global analytics object aggregated successfully.');
    } else {
      throw new Error('Global analytics payload incomplete');
    }

    // --- TEST 2: Verify Global KPI Totals ---
    console.log('\n--- Test 2: Verify Platform-Wide KPI Totals ---');
    const orgs = globalData.organizations;
    const users = globalData.users;
    const comps = globalData.companies;
    const hiring = globalData.hiring;

    console.log(`Organizations: Total=${orgs.totalOrganizations}, Active=${orgs.activeOrganizations}`);
    console.log(`Users: Total=${users.totalUsers}, PMOs=${users.totalPmos}, TeamMembers=${users.totalTeamMembers}`);
    console.log(`Companies: Total=${comps.totalCompanies}, Assigned=${comps.assignedCompanies}, Contacted=${comps.contactedCompanies}`);
    console.log(`Hiring: TotalOpp=${hiring.totalOpportunities}, HiringNow=${hiring.currentlyHiring}, Shortlisted=${hiring.shortlistedOpportunities}`);

    if (
      orgs.totalOrganizations >= 2 &&
      users.totalPmos >= 2 &&
      users.totalTeamMembers >= 1 &&
      comps.totalCompanies >= 2 &&
      comps.assignedCompanies >= 1 &&
      comps.contactedCompanies >= 1 &&
      hiring.currentlyHiring >= 1 &&
      hiring.shortlistedOpportunities >= 1
    ) {
      console.log('[4/8] ✔ PASS: Global KPI totals verified across institutions.');
    } else {
      throw new Error('Global KPI metrics calculation failed');
    }

    // --- TEST 3: Verify Organization Performance Table Aggregations ---
    console.log('\n--- Test 3: Verify Organization Performance Table Rows ---');
    const perfTable = globalData.organizationPerformance;
    const org1Row = perfTable.find((row) => row.organization.code === 'GLOBAL_TEST_ORG_1');

    if (
      org1Row &&
      org1Row.companiesCount === 1 &&
      org1Row.assignedCompaniesCount === 1 &&
      org1Row.contactedCompaniesCount === 1 &&
      org1Row.hiringCount === 1 &&
      org1Row.shortlistedCount === 1 &&
      org1Row.pmosCount === 1 &&
      org1Row.teamMembersCount === 1
    ) {
      console.log('[5/8] ✔ PASS: Organization performance row metrics verified for Org 1.');
    } else {
      throw new Error(`Org 1 performance row failed: ${JSON.stringify(org1Row)}`);
    }

    // --- TEST 4: Organization Analytics Drill-Down Endpoint ---
    console.log('\n--- Test 4: Verify Organization Analytics Drill-Down for Org 1 ---');
    const org1Drilldown = await superAdminAnalyticsService.getOrganizationAnalytics(org1._id.toString());

    if (
      org1Drilldown &&
      org1Drilldown.organization.code === 'GLOBAL_TEST_ORG_1' &&
      org1Drilldown.people.pmos === 1 &&
      org1Drilldown.companies.totalCompanies === 1 &&
      org1Drilldown.hiring.shortlistedOpportunities === 1
    ) {
      console.log('[6/8] ✔ PASS: Super Admin Organization Drill-Down analytics payload verified.');
    } else {
      throw new Error(`Org 1 drill-down failed: ${JSON.stringify(org1Drilldown)}`);
    }

    // --- TEST 5: Verify Charts Data & Platform Activity ---
    console.log('\n--- Test 5: Verify Global Chart Datasets ---');
    const charts = globalData.charts;
    if (
      charts.organizationsByCompanyCount.length >= 2 &&
      charts.hiringOpportunitiesByOrg.length >= 2 &&
      charts.hiringStatusDistribution.length === 5 &&
      charts.platformActivity.length === 31
    ) {
      console.log('[7/8] ✔ PASS: Global Recharts series & daily platform activity timeline verified.');
    } else {
      throw new Error('Global charts verification failed');
    }

    // --- TEST 6: Non-Existent Organization Handling ---
    console.log('\n--- Test 6: Verify Non-Existent Organization Handling ---');
    const fakeId = new mongoose.Types.ObjectId();
    try {
      await superAdminAnalyticsService.getOrganizationAnalytics(fakeId.toString());
      throw new Error('Should have thrown 404 for fake organization ID');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'ORGANIZATION_NOT_FOUND') {
        console.log('[8/8] ✔ PASS: Fake organization drill-down rejected with 404 ORGANIZATION_NOT_FOUND.');
      } else {
        throw err;
      }
    }

    console.log('\n==================================================');
    console.log('SUCCESS: ALL SUPER ADMIN GLOBAL DASHBOARD TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runVerification();
