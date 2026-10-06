import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import JobOpportunity from '../models/JobOpportunity.js';
import AuditLog from '../models/AuditLog.js';
import opportunityService from '../services/opportunity.service.js';

async function runVerification() {
  console.log('\n--- STARTING PMO OPPORTUNITY REVIEW & SHORTLISTING VERIFICATION TEST ---\n');

  try {
    await connectDatabase();
    console.log('[1/9] Connected to MongoDB test database.');

    // 1. Clean up existing test data
    await Organization.deleteMany({ code: { $in: ['TEST_SHORTLIST_ORG_A', 'TEST_SHORTLIST_ORG_B'] } });
    await User.deleteMany({ email: { $in: ['pmo_shortlist_a@test.com', 'pmo_shortlist_b@test.com', 'tm_shortlist_1@test.com'] } });
    await Company.deleteMany({ normalizedName: { $in: ['shortlist corp inc', 'org b shortlist llc'] } });
    await Assignment.deleteMany({});
    await JobOpportunity.deleteMany({});
    await AuditLog.deleteMany({ action: { $regex: '^OPPORTUNITY_' } });

    // 2. Setup Organizations & Users
    const orgA = await Organization.create({
      name: 'Shortlist Test College A',
      code: 'TEST_SHORTLIST_ORG_A',
      email: 'contact@shortlist-a.edu',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Shortlist Test College B',
      code: 'TEST_SHORTLIST_ORG_B',
      email: 'contact@shortlist-b.edu',
      status: 'ACTIVE',
    });

    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Officer A',
      email: 'pmo_shortlist_a@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Officer B',
      email: 'pmo_shortlist_b@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const teamMember1 = await User.create({
      organizationId: orgA._id,
      name: 'Team Member 1',
      email: 'tm_shortlist_1@test.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const companyA = await Company.create({
      organizationId: orgA._id,
      companyName: 'Shortlist Corp Inc',
      normalizedName: 'shortlistcorpinc',
      industry: 'Technology',
      status: 'ACTIVE',
      createdBy: pmoUserA._id,
    });

    const companyB = await Company.create({
      organizationId: orgB._id,
      companyName: 'Org B Shortlist LLC',
      normalizedName: 'orgbshortlistllc',
      industry: 'Finance',
      status: 'ACTIVE',
      createdBy: pmoUserB._id,
    });

    await Assignment.create({
      organizationId: orgA._id,
      companyId: companyA._id,
      assignedTo: teamMember1._id,
      assignedBy: pmoUserA._id,
      status: 'ACTIVE',
    });

    // Create 2 opportunities in Org A
    const opp1 = await opportunityService.createOpportunity(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      {
        companyId: companyA._id.toString(),
        title: 'Senior Frontend Engineer 2026',
        opportunityType: 'FULL_TIME',
        candidateType: 'FRESHERS',
        openings: 5,
        location: 'Bangalore',
        hiringStatus: 'HIRING_NOW',
      }
    );

    const opp2 = await opportunityService.createOpportunity(
      { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
      {
        companyId: companyA._id.toString(),
        title: 'Backend Developer Intern 2026',
        opportunityType: 'INTERNSHIP',
        candidateType: 'FRESHERS',
        openings: 10,
        location: 'Remote',
        hiringStatus: 'HIRING_NOW',
      }
    );

    console.log('[2/9] Setup complete.');

    // --- TEST 1: Team Member attempts to shortlist -> 403 FORBIDDEN ---
    console.log('\n--- Test 1: Team Member attempts shortlisting ---');
    try {
      await opportunityService.shortlistOpportunity(
        { id: teamMember1._id.toString(), organizationId: orgA._id.toString(), role: 'TEAM_MEMBER' },
        opp1.id,
        { isShortlisted: true, pmoReviewNote: 'Should fail' }
      );
      throw new Error('Team Member shortlisting should have been rejected');
    } catch (err) {
      if (err.statusCode === 403 && err.code === 'FORBIDDEN') {
        console.log('[3/9] ✔ PASS: Team Member shortlisting rejected with 403 FORBIDDEN.');
      } else {
        throw err;
      }
    }

    // --- TEST 2: PMO shortlists opportunity with review note ---
    console.log('\n--- Test 2: PMO shortlists opportunity ---');
    const shortlistedOpp = await opportunityService.shortlistOpportunity(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      opp1.id,
      { isShortlisted: true, pmoReviewNote: 'High priority position for Tier 1 colleges.' }
    );

    if (
      shortlistedOpp.isShortlisted === true &&
      shortlistedOpp.pmoReviewNote === 'High priority position for Tier 1 colleges.' &&
      shortlistedOpp.shortlistedAt &&
      shortlistedOpp.shortlistedByUser &&
      shortlistedOpp.shortlistedByUser.email === 'pmo_shortlist_a@test.com'
    ) {
      console.log('[4/9] ✔ PASS: PMO successfully shortlisted opportunity with metadata & review note.');
    } else {
      throw new Error('PMO shortlisting failed');
    }

    // --- TEST 3: Idempotency check (same state & note) ---
    console.log('\n--- Test 3: Idempotency verification ---');
    const auditCountBefore = await AuditLog.countDocuments({ organizationId: orgA._id });

    const idempotentResult = await opportunityService.shortlistOpportunity(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      opp1.id,
      { isShortlisted: true, pmoReviewNote: 'High priority position for Tier 1 colleges.' }
    );

    const auditCountAfter = await AuditLog.countDocuments({ organizationId: orgA._id });

    if (idempotentResult.isShortlisted === true && auditCountBefore === auditCountAfter) {
      console.log('[5/9] ✔ PASS: Idempotent shortlist call produced no duplicate audit log.');
    } else {
      throw new Error(`Idempotency check failed: audit log count changed from ${auditCountBefore} to ${auditCountAfter}`);
    }

    // --- TEST 4: PMO updates review note only ---
    console.log('\n--- Test 4: PMO updates review note ---');
    const noteUpdated = await opportunityService.shortlistOpportunity(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      opp1.id,
      { isShortlisted: true, pmoReviewNote: 'Updated review note: Interview scheduled for next week.' }
    );

    const noteAudit = await AuditLog.findOne({ action: 'PMO_REVIEW_NOTE_UPDATED', entityId: opp1.id });

    if (noteUpdated.pmoReviewNote === 'Updated review note: Interview scheduled for next week.' && noteAudit) {
      console.log('[6/9] ✔ PASS: PMO review note updated and PMO_REVIEW_NOTE_UPDATED audit log emitted.');
    } else {
      throw new Error('Review note update failed');
    }

    // --- TEST 5: Filter opportunities by shortlisted=true ---
    console.log('\n--- Test 5: Query filtering by shortlisted status ---');
    const filteredList = await opportunityService.getOpportunities(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      { shortlisted: 'true' }
    );

    if (filteredList.data.length === 1 && filteredList.data[0].id === opp1.id) {
      console.log('[7/9] ✔ PASS: Query filter shortlisted=true returned exactly 1 shortlisted opportunity.');
    } else {
      throw new Error(`Filter by shortlisted failed: expected 1, got ${filteredList.data.length}`);
    }

    // --- TEST 6: PMO unshortlists opportunity ---
    console.log('\n--- Test 6: PMO unshortlists opportunity ---');
    const unshortlisted = await opportunityService.shortlistOpportunity(
      { id: pmoUserA._id.toString(), organizationId: orgA._id.toString(), role: 'PMO' },
      opp1.id,
      { isShortlisted: false }
    );

    const unshortlistAudit = await AuditLog.findOne({ action: 'OPPORTUNITY_UNSHORTLISTED', entityId: opp1.id });

    if (unshortlisted.isShortlisted === false && unshortlistAudit) {
      console.log('[8/9] ✔ PASS: Opportunity unshortlisted successfully and OPPORTUNITY_UNSHORTLISTED audit log emitted.');
    } else {
      throw new Error('Unshortlisting failed');
    }

    // --- TEST 7: Cross-tenant isolation on shortlist endpoint ---
    console.log('\n--- Test 7: Cross-tenant isolation check ---');
    try {
      await opportunityService.shortlistOpportunity(
        { id: pmoUserB._id.toString(), organizationId: orgB._id.toString(), role: 'PMO' },
        opp1.id,
        { isShortlisted: true }
      );
      throw new Error('Cross-tenant shortlisting should have been rejected');
    } catch (err) {
      if (err.statusCode === 404 && err.code === 'OPPORTUNITY_NOT_FOUND') {
        console.log('[9/9] ✔ PASS: PMO B cross-tenant shortlist rejected with 404 OPPORTUNITY_NOT_FOUND.');
      } else {
        throw err;
      }
    }

    console.log('\n==================================================');
    console.log('SUCCESS: ALL PMO OPPORTUNITY SHORTLISTING TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runVerification();
