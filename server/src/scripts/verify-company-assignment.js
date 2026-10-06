import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import AuditLog from '../models/AuditLog.js';
import assignmentService from '../services/assignment.service.js';
import companyService from '../services/company.service.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management_test';

async function runVerification() {
  console.log('--- STARTING COMPANY ASSIGNMENT & REASSIGNMENT VERIFICATION TEST ---\n');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[1/10] Connected to MongoDB test database.');

    // Cleanup previous test data
    await Organization.deleteMany({ code: { $in: ['ASSIGN_ORG_A', 'ASSIGN_ORG_B'] } });
    await User.deleteMany({ email: { $regex: /@assign(a|b)\.edu$/ } });
    await Company.deleteMany({ companyName: { $regex: /^AssignTest / } });
    await Assignment.deleteMany({});
    await AuditLog.deleteMany({ action: { $regex: /^COMPANY_(ASSIGNED|REASSIGNED|UNASSIGNED|BULK_ASSIGNED)/ } });

    // 1. Setup Test Organizations & Users
    const orgA = await Organization.create({
      name: 'Assignment Test Institute A',
      code: 'ASSIGN_ORG_A',
      email: 'contact@assigna.edu',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Assignment Test Institute B',
      code: 'ASSIGN_ORG_B',
      email: 'contact@assignb.edu',
      status: 'ACTIVE',
    });

    const pmoUserA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Org A Lead',
      email: 'pmo@assigna.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const pmoUserB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Org B Lead',
      email: 'pmo@assignb.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'PMO',
      status: 'ACTIVE',
    });

    const rahulA = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Sharma',
      email: 'rahul@assigna.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const amitA = await User.create({
      organizationId: orgA._id,
      name: 'Amit Patel',
      email: 'amit@assigna.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const tmUserB = await User.create({
      organizationId: orgB._id,
      name: 'Org B Team Member',
      email: 'member@assignb.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    });

    const companyA1 = await Company.create({
      organizationId: orgA._id,
      companyName: 'AssignTest ABC Technologies',
      normalizedName: 'assigntestabctechnologies',
      industry: 'Software',
      createdBy: pmoUserA._id,
    });

    const companyB1 = await Company.create({
      organizationId: orgB._id,
      companyName: 'AssignTest XYZ Solutions',
      normalizedName: 'assigntestxyzsolutions',
      industry: 'Consulting',
      createdBy: pmoUserB._id,
    });

    console.log('[2/10] Setup organizations, users (Rahul & Amit), and test companies.');

    const pmoContextA = {
      id: pmoUserA._id.toString(),
      role: pmoUserA.role,
      organizationId: pmoUserA.organizationId.toString(),
    };

    // 2. Test Single Company Assignment (UNASSIGNED -> Rahul)
    const assign1 = await assignmentService.assignCompany(pmoContextA, {
      companyId: companyA1._id.toString(),
      assignedTo: rahulA._id.toString(),
      reason: 'Initial assignment',
    });

    if (!assign1 || assign1.status !== 'ACTIVE' || assign1.assignedTo.id !== rahulA._id.toString()) {
      throw new Error('Single company assignment to Rahul failed');
    }
    console.log('[3/10] Single assignment succeeded: ABC Technologies -> Rahul (ACTIVE).');

    // 3. Test Reassignment (Rahul -> Amit)
    const reassign1 = await assignmentService.assignCompany(pmoContextA, {
      companyId: companyA1._id.toString(),
      assignedTo: amitA._id.toString(),
      reason: 'Workload balancing',
    });

    if (reassign1.status !== 'ACTIVE' || reassign1.assignedTo.id !== amitA._id.toString()) {
      throw new Error('Reassignment to Amit failed');
    }

    // Verify Rahul's assignment became ENDED
    const rahulEndedAssign = await Assignment.findOne({
      companyId: companyA1._id,
      assignedTo: rahulA._id,
    });
    if (!rahulEndedAssign || rahulEndedAssign.status !== 'ENDED' || !rahulEndedAssign.unassignedAt) {
      throw new Error('Previous assignment to Rahul was not closed properly as ENDED');
    }

    // Verify DB constraint: exactly 1 ACTIVE assignment for companyA1
    const activeAssignsCount = await Assignment.countDocuments({
      companyId: companyA1._id,
      status: 'ACTIVE',
    });
    if (activeAssignsCount !== 1) throw new Error(`Expected 1 active assignment, found ${activeAssignsCount}`);

    console.log('[4/10] Reassignment succeeded: Rahul (ENDED) -> Amit (ACTIVE). Verified 1 active assignment rule.');

    // 4. Test Unassignment (Amit -> UNASSIGNED)
    const unassignResult = await assignmentService.unassignCompany(pmoContextA, companyA1._id.toString(), {
      reason: 'Account paused',
    });

    if (unassignResult.status !== 'ENDED' || !unassignResult.unassignedAt) {
      throw new Error('Unassignment failed');
    }

    const activeAfterUnassign = await Assignment.countDocuments({
      companyId: companyA1._id,
      status: 'ACTIVE',
    });
    if (activeAfterUnassign !== 0) throw new Error('Company should be UNASSIGNED with 0 active assignments');

    console.log('[5/10] Unassignment succeeded: Company is now UNASSIGNED.');

    // 5. Verify Assignment History API
    const history = await assignmentService.getCompanyAssignmentHistory(pmoContextA, companyA1._id.toString());
    if (history.length !== 2) throw new Error(`Expected 2 historical records, found ${history.length}`);
    console.log('[6/10] Verified chronological assignment history read-only list (2 historical records preserved).');

    // 6. Test Bulk Company Assignment
    const bulkCompanies = [];
    for (let i = 1; i <= 20; i++) {
      const comp = await Company.create({
        organizationId: orgA._id,
        companyName: `AssignTest Bulk Company ${i}`,
        normalizedName: `assigntestbulkcompany${i}`,
        industry: 'IT',
        createdBy: pmoUserA._id,
      });
      bulkCompanies.push(comp._id.toString());
    }

    // Bulk assign 20 companies to Rahul
    const bulkRes1 = await assignmentService.assignBulkCompanies(pmoContextA, {
      companyIds: bulkCompanies,
      assignedTo: rahulA._id.toString(),
      reason: 'Initial bulk allocation',
    });

    if (bulkRes1.totalSelected !== 20 || bulkRes1.assigned !== 20 || bulkRes1.reassigned !== 0) {
      throw new Error('Initial bulk assignment to Rahul failed');
    }

    // Bulk reassign 20 companies to Amit
    const bulkRes2 = await assignmentService.assignBulkCompanies(pmoContextA, {
      companyIds: bulkCompanies,
      assignedTo: amitA._id.toString(),
      reason: 'Team rotation',
    });

    if (bulkRes2.totalSelected !== 20 || bulkRes2.reassigned !== 20) {
      throw new Error('Bulk reassignment to Amit failed');
    }

    // Attempt duplicate bulk assign to Amit again (Already assigned check)
    const bulkRes3 = await assignmentService.assignBulkCompanies(pmoContextA, {
      companyIds: bulkCompanies,
      assignedTo: amitA._id.toString(),
      reason: 'Duplicate check',
    });

    if (bulkRes3.alreadyAssigned !== 20 || bulkRes3.assigned !== 0 || bulkRes3.reassigned !== 0) {
      throw new Error('Duplicate bulk assignment was not handled cleanly as alreadyAssigned');
    }

    console.log('[7/10] Bulk Assignment & Reassignment verified (20 assigned -> 20 reassigned -> 20 skipped duplicate).');

    // 7. Test Team Member Work Visibility API
    const rahulContext = {
      id: rahulA._id.toString(),
      name: rahulA.name,
      email: rahulA.email,
      role: rahulA.role,
      organizationId: rahulA.organizationId.toString(),
    };

    const amitContext = {
      id: amitA._id.toString(),
      name: amitA.name,
      email: amitA.email,
      role: amitA.role,
      organizationId: amitA.organizationId.toString(),
    };

    const rahulCompanies = await assignmentService.getTeamMemberAssignedCompanies(rahulContext);
    const amitCompanies = await assignmentService.getTeamMemberAssignedCompanies(amitContext);

    if (rahulCompanies.meta.total !== 0) {
      throw new Error(`Rahul should have 0 active assigned companies, got ${rahulCompanies.meta.total}`);
    }
    if (amitCompanies.meta.total !== 20) {
      throw new Error(`Amit should have 20 active assigned companies, got ${amitCompanies.meta.total}`);
    }

    console.log('[8/10] Team Member Visibility verified: Amit sees 20 assigned companies, Rahul sees 0.');

    // 8. Test Team Member Company Detail & Resource Hiding
    const firstCompanyId = bulkCompanies[0];

    const amitDetail = await assignmentService.getTeamMemberAssignedCompanyById(amitContext, firstCompanyId);
    if (!amitDetail || amitDetail.id !== firstCompanyId) {
      throw new Error('Amit should be able to view details of assigned company');
    }

    try {
      await assignmentService.getTeamMemberAssignedCompanyById(rahulContext, firstCompanyId);
      throw new Error('Rahul should be blocked from viewing unassigned company detail');
    } catch (err) {
      if (err.statusCode !== 404) throw new Error(`Expected 404 for unassigned Team Member, got ${err.statusCode}`);
    }

    console.log('[9/10] Team Member Detail Lookup & Resource Hiding (404 for unassigned member) verified.');

    // 9. Test PMO Company Filtering & Tenant Security Constraints
    const pmoAssignedFilter = await companyService.getCompanies(pmoContextA, { assignmentStatus: 'ASSIGNED' });
    const pmoUnassignedFilter = await companyService.getCompanies(pmoContextA, { assignmentStatus: 'UNASSIGNED' });

    if (pmoAssignedFilter.meta.total !== 20) {
      throw new Error(`Expected 20 assigned companies in PMO filter, got ${pmoAssignedFilter.meta.total}`);
    }
    if (pmoUnassignedFilter.meta.total !== 1) {
      throw new Error(`Expected 1 unassigned company in PMO filter, got ${pmoUnassignedFilter.meta.total}`);
    }

    // Cross-tenant assignment attempt (PMO Org A trying to assign Org B company)
    try {
      await assignmentService.assignCompany(pmoContextA, {
        companyId: companyB1._id.toString(),
        assignedTo: rahulA._id.toString(),
      });
      throw new Error('PMO Org A should not be able to assign Org B company');
    } catch (err) {
      if (err.statusCode !== 404) throw new Error(`Expected 404 for cross-tenant company assign, got ${err.statusCode}`);
    }

    // Cross-tenant team member assignment attempt (PMO Org A trying to assign to Org B team member)
    try {
      await assignmentService.assignCompany(pmoContextA, {
        companyId: companyA1._id.toString(),
        assignedTo: tmUserB._id.toString(),
      });
      throw new Error('PMO Org A should not be able to assign to Org B team member');
    } catch (err) {
      if (err.statusCode !== 404) throw new Error(`Expected 404 for cross-tenant team member assign, got ${err.statusCode}`);
    }

    console.log('[10/10] PMO Company Filters (Assigned/Unassigned) and Tenant Security Boundaries verified.');

    // Cleanup
    await Organization.deleteMany({ code: { $in: ['ASSIGN_ORG_A', 'ASSIGN_ORG_B'] } });
    await User.deleteMany({ email: { $regex: /@assign(a|b)\.edu$/ } });
    await Company.deleteMany({ companyName: { $regex: /^AssignTest / } });
    await Assignment.deleteMany({});
    await AuditLog.deleteMany({ action: { $regex: /^COMPANY_(ASSIGNED|REASSIGNED|UNASSIGNED|BULK_ASSIGNED)/ } });

    console.log('\n==================================================');
    console.log('SUCCESS: ALL COMPANY ASSIGNMENT VERIFICATION TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
