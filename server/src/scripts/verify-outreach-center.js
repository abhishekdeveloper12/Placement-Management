import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import interactionService from '../services/interaction.service.js';

const runVerification = async () => {
  console.log('==================================================');
  console.log('STARTING TEAM MEMBER OUTREACH CENTER VERIFICATION');
  console.log('==================================================\n');

  await connectDatabase();

  // 1. Setup Test Tenant, PMO, Team Members
  console.log('[1/8] Setting up test environment (Org, PMO, Team Members A & B)...');

  let testOrg = await Organization.findOne({ code: 'OUTREACH-CENTER-ORG' });
  if (!testOrg) {
    testOrg = await Organization.create({
      name: 'Outreach Test Academy',
      code: 'OUTREACH-CENTER-ORG',
      email: 'admin@outreach-center.edu',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  const passHash = await User.hashPassword('Password@123');

  let pmoUser = await User.findOne({ email: 'pmo@outreach-center.edu' });
  if (!pmoUser) {
    pmoUser = await User.create({
      organizationId: testOrg._id,
      name: 'PMO Admin',
      email: 'pmo@outreach-center.edu',
      passwordHash: passHash,
      role: 'PMO',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let tmA = await User.findOne({ email: 'tma@outreach-center.edu' });
  if (!tmA) {
    tmA = await User.create({
      organizationId: testOrg._id,
      name: 'Rahul Sharma (Team Member A)',
      email: 'tma@outreach-center.edu',
      passwordHash: passHash,
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let tmB = await User.findOne({ email: 'tmb@outreach-center.edu' });
  if (!tmB) {
    tmB = await User.create({
      organizationId: testOrg._id,
      name: 'Amit Kumar (Team Member B)',
      email: 'tmb@outreach-center.edu',
      passwordHash: passHash,
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  // Create Assigned Companies for Team Member A
  let companyA = await Company.findOne({ organizationId: testOrg._id, normalizedName: 'technovasolutions' });
  if (!companyA) {
    companyA = await Company.create({
      organizationId: testOrg._id,
      companyName: 'TechNova Solutions',
      industry: 'Software Engineering',
      city: 'Bangalore',
      status: 'ACTIVE',
      createdBy: pmoUser._id,
      isTestData: true,
    });
  }

  let companyB = await Company.findOne({ organizationId: testOrg._id, normalizedName: 'cyberpulsesystems' });
  if (!companyB) {
    companyB = await Company.create({
      organizationId: testOrg._id,
      companyName: 'CyberPulse Systems',
      industry: 'Cyber Security',
      city: 'Pune',
      status: 'ACTIVE',
      createdBy: pmoUser._id,
      isTestData: true,
    });
  }

  // Active Assignments to Team Member A
  let assignA = await Assignment.findOne({ organizationId: testOrg._id, companyId: companyA._id, status: 'ACTIVE' });
  if (!assignA) {
    assignA = await Assignment.create({
      organizationId: testOrg._id,
      companyId: companyA._id,
      assignedTo: tmA._id,
      assignedBy: pmoUser._id,
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let assignB = await Assignment.findOne({ organizationId: testOrg._id, companyId: companyB._id, status: 'ACTIVE' });
  if (!assignB) {
    assignB = await Assignment.create({
      organizationId: testOrg._id,
      companyId: companyB._id,
      assignedTo: tmA._id,
      assignedBy: pmoUser._id,
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  const tmAContext = { id: tmA._id.toString(), role: 'TEAM_MEMBER', organizationId: testOrg._id.toString() };
  const tmBContext = { id: tmB._id.toString(), role: 'TEAM_MEMBER', organizationId: testOrg._id.toString() };
  const pmoContext = { id: pmoUser._id.toString(), role: 'PMO', organizationId: testOrg._id.toString() };

  console.log('✔ Test Environment Ready.');

  // 2. Log HR Call #1 for Company A
  console.log('\n[2/8] Team Member A logs Call #1 for TechNova Solutions...');
  const call1Payload = {
    hiringStatus: 'YES',
    profiles: ['React Engineer', 'Node.js Developer'],
    candidateType: 'FRESHERS',
    openings: 5,
    opportunityType: 'FULL_TIME',
    ppoAvailable: 'YES',
    location: 'Bangalore',
    workMode: 'HYBRID',
    salaryOrStipend: '12 LPA',
    bond: 'NO',
    specificRequirement: 'Strong knowledge of Data Structures and MERN Stack',
    notes: 'HR Sneha confirmed 5 campus hiring openings for freshers.',
    nextAction: 'NO_ACTION',
    contact: {
      name: 'Sneha Mishra',
      designation: 'Talent Acquisition Manager',
      email: 'sneha@technova.com',
      phone: '+91 98765 11111',
    },
  };

  const call1Res = await interactionService.recordCallInteraction(tmAContext, companyA._id.toString(), call1Payload);
  const call1Id = call1Res.interaction.id;
  console.log(`✔ Call #1 Logged (ID: ${call1Id}, HiringStatus: ${call1Res.interaction.callDetails.hiringStatus})`);

  // 3. Log HR Call #2 for Company A (Multiple calls to same company history test)
  console.log('\n[3/8] Team Member A logs Call #2 for TechNova Solutions (Follow-up scheduled)...');
  const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
  const call2Payload = {
    hiringStatus: 'HIRING_PLANNED',
    profiles: ['DevOps Specialist'],
    candidateType: 'EXPERIENCED',
    openings: 2,
    nextAction: 'FOLLOW_UP',
    followUpDate: futureDate,
    notes: 'Recruiter requested follow-up call next week for final JD release.',
    contact: {
      name: 'Sneha Mishra',
      designation: 'Head of TA',
      email: 'sneha@technova.com',
      phone: '+91 98765 11111',
    },
  };

  const call2Res = await interactionService.recordCallInteraction(tmAContext, companyA._id.toString(), call2Payload);
  const call2Id = call2Res.interaction.id;
  console.log(`✔ Call #2 Logged (ID: ${call2Id}, FollowUp Created: ${!!call2Res.followUp})`);

  // 4. Log HR Call #3 for Company B
  console.log('\n[4/8] Team Member A logs Call #1 for CyberPulse Systems...');
  const call3Payload = {
    hiringStatus: 'NO',
    notes: 'HR indicated no current campus recruitment budget for Q3.',
    nextAction: 'NO_ACTION',
  };
  const call3Res = await interactionService.recordCallInteraction(tmAContext, companyB._id.toString(), call3Payload);
  console.log(`✔ Call #3 Logged for CyberPulse Systems (Outcome: ${call3Res.interaction.outcome})`);

  // 5. Verify Team Member Outreach Stats API
  console.log('\n[5/8] Verifying getTeamMemberOutreachStats() KPI metrics...');
  const stats = await interactionService.getTeamMemberOutreachStats(tmAContext);
  console.log('Outreach Stats Result:', stats);

  if (
    stats.assignedCompanies === 2 &&
    stats.contactedCompanies === 2 &&
    stats.totalCalls === 3 &&
    stats.feedbackSubmitted === 3 &&
    stats.coveragePercentage === 100 &&
    stats.upcomingFollowUps === 1
  ) {
    console.log('✔ PASS: Outreach KPI stats correctly calculated from database records.');
  } else {
    throw new Error(`Outreach KPI calculation mismatch: ${JSON.stringify(stats)}`);
  }

  // 6. Verify My Outreach Listing API (Complete Submitted Feedback Verification)
  console.log('\n[6/8] Verifying getTeamMemberInteractions() full feedback payload...');
  const outreachRes = await interactionService.getTeamMemberInteractions(tmAContext);
  if (outreachRes.data.length !== 3) {
    throw new Error(`Expected 3 interactions, found ${outreachRes.data.length}`);
  }

  const latestCall = outreachRes.data[0];
  if (!latestCall.callDetails || !latestCall.companyId || !latestCall.userId) {
    throw new Error('Interaction payload missing populated company, user, or callDetails!');
  }
  console.log(`✔ PASS: Returned ${outreachRes.data.length} interactions with full populated callDetails.`);

  // 7. Verify Multiple Call History for Same Company
  console.log('\n[7/8] Verifying company outreach history timeline for TechNova Solutions...');
  const companyTimeline = await interactionService.getCompanyInteractions(tmAContext, companyA._id.toString());
  if (companyTimeline.data.length !== 2) {
    throw new Error(`Expected 2 historical interactions for TechNova Solutions, found ${companyTimeline.data.length}`);
  }
  console.log(`✔ PASS: Both Call #1 and Call #2 preserved in company history timeline without overwriting.`);

  // 8. Security & PMO Verification (IDOR & Organization Visibility)
  console.log('\n[8/8] Testing IDOR Security Guard & PMO Visibility...');
  
  // Team Member B attempt
  const tmBOutreach = await interactionService.getTeamMemberInteractions(tmBContext);
  if (tmBOutreach.data.length !== 0) {
    throw new Error('IDOR SECURITY FAILURE: Team Member B was able to see Team Member A interactions!');
  }
  console.log('✔ PASS: Team Member B sees 0 outreach records (Strict IDOR Isolation).');

  try {
    await interactionService.getInteractionById(tmBContext, call1Id);
    throw new Error('IDOR SECURITY FAILURE: Team Member B was able to fetch Team Member A interaction details!');
  } catch (err) {
    if (err.statusCode === 404 || err.code === 'INTERACTION_NOT_FOUND') {
      console.log('✔ PASS: Cross-member interaction lookup rejected with 404 Resource Hiding.');
    } else {
      throw err;
    }
  }

  // PMO visibility
  const pmoInteractions = await interactionService.getOrganizationInteractions(pmoContext, { userId: tmA._id.toString() });
  if (pmoInteractions.data.length !== 3) {
    throw new Error(`PMO failed to retrieve Team Member A interactions: found ${pmoInteractions.data.length}`);
  }
  console.log(`✔ PASS: PMO retrieved all ${pmoInteractions.data.length} interactions for Team Member A from organization view.`);

  // Teardown Test Data
  await FollowUp.deleteMany({ organizationId: testOrg._id });
  await Interaction.deleteMany({ organizationId: testOrg._id });
  await Assignment.deleteMany({ organizationId: testOrg._id });
  await Company.deleteMany({ organizationId: testOrg._id });
  await User.deleteMany({ organizationId: testOrg._id });
  await Organization.deleteOne({ _id: testOrg._id });

  console.log('\n==================================================');
  console.log('SUCCESS: ALL TEAM MEMBER OUTREACH CENTER TESTS PASSED!');
  console.log('==================================================\n');

  process.exit(0);
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
