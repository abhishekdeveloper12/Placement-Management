import { connectDatabase } from '../config/db.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import CompanyService from '../services/company.service.js';
import AssignmentService from '../services/assignment.service.js';

const runVerification = async () => {
  console.log('==================================================');
  console.log('STARTING TEAM MEMBER SELF-ADDED COMPANY VERIFICATION');
  console.log('==================================================\n');

  await connectDatabase();

  // 1. Setup Test Organizations & Users
  console.log('[1/8] Setting up test environment (Org A, PMO, Team Members Rahul & Amit, Org B)...');
  
  let orgA = await Organization.findOne({ code: 'SELF-TEST-A' });
  if (!orgA) {
    orgA = await Organization.create({
      name: 'Self Add Test Academy A',
      code: 'SELF-TEST-A',
      email: 'pmo@selftest-a.edu',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let orgB = await Organization.findOne({ code: 'SELF-TEST-B' });
  if (!orgB) {
    orgB = await Organization.create({
      name: 'Self Add Test Academy B',
      code: 'SELF-TEST-B',
      email: 'pmo@selftest-b.edu',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  const passHash = await User.hashPassword('Password@123');

  let pmoA = await User.findOne({ email: 'pmoa@selftest-a.edu' });
  if (!pmoA) {
    pmoA = await User.create({
      organizationId: orgA._id,
      name: 'PMO Admin A',
      email: 'pmoa@selftest-a.edu',
      passwordHash: passHash,
      role: 'PMO',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let pmoB = await User.findOne({ email: 'pmob@selftest-b.edu' });
  if (!pmoB) {
    pmoB = await User.create({
      organizationId: orgB._id,
      name: 'PMO Admin B',
      email: 'pmob@selftest-b.edu',
      passwordHash: passHash,
      role: 'PMO',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let rahul = await User.findOne({ email: 'rahul@selftest-a.edu' });
  if (!rahul) {
    rahul = await User.create({
      organizationId: orgA._id,
      name: 'Rahul Sharma',
      email: 'rahul@selftest-a.edu',
      passwordHash: passHash,
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  let amit = await User.findOne({ email: 'amit@selftest-a.edu' });
  if (!amit) {
    amit = await User.create({
      organizationId: orgA._id,
      name: 'Amit Kumar',
      email: 'amit@selftest-a.edu',
      passwordHash: passHash,
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
      isTestData: true,
    });
  }

  console.log(`✔ Setup complete. Org A ID: ${orgA._id}, Rahul: ${rahul._id}, Amit: ${amit._id}`);

  // User Contexts
  const rahulContext = { id: rahul._id.toString(), role: 'TEAM_MEMBER', organizationId: orgA._id.toString(), name: rahul.name };
  const amitContext = { id: amit._id.toString(), role: 'TEAM_MEMBER', organizationId: orgA._id.toString(), name: amit.name };
  const pmoAContext = { id: pmoA._id.toString(), role: 'PMO', organizationId: orgA._id.toString(), name: pmoA.name };
  const pmoBContext = { id: pmoB._id.toString(), role: 'PMO', organizationId: orgB._id.toString(), name: pmoB.name };

  // Cleanup pre-existing test company
  await Company.deleteMany({ organizationId: orgA._id, companyName: /Starlight/i });
  await Assignment.deleteMany({ organizationId: orgA._id });

  // 2. Team Member (Rahul) Adds Self-Discovered Company
  console.log('\n[2/8] Team Member Rahul creates self-discovered company "Starlight Innovations"...');
  const companyData = {
    companyName: 'Starlight Innovations',
    industry: 'DeepTech & AI',
    website: 'www.starlightai.com',
    city: 'Bangalore',
    country: 'India',
    primaryContact: {
      name: 'Dr. Vikrant Mehta',
      designation: 'CTO & Co-Founder',
      email: 'vikrant@starlightai.com',
      phone: '+91 9876543210',
    },
  };

  const createdCompany = await CompanyService.createCompany(rahulContext, companyData);

  if (!createdCompany) throw new Error('FAILED: Company creation returned null');
  if (createdCompany.source !== 'TEAM_MEMBER_SELF_ADDED') {
    throw new Error(`FAILED: Company source is "${createdCompany.source}", expected "TEAM_MEMBER_SELF_ADDED"`);
  }
  if (createdCompany.createdBy.id !== rahul._id.toString()) {
    throw new Error(`FAILED: createdBy is ${createdCompany.createdBy.id}, expected ${rahul._id}`);
  }
  console.log(`✔ Company created: ${createdCompany.companyName} (ID: ${createdCompany.id}, Source: ${createdCompany.source})`);

  // 3. Verify Automatic Assignment to Rahul
  console.log('\n[3/8] Verifying automatic active assignment to Rahul...');
  const activeAssignment = await Assignment.findOne({
    organizationId: orgA._id,
    companyId: createdCompany.id,
    status: 'ACTIVE',
  });

  if (!activeAssignment) throw new Error('FAILED: Automatic assignment record not found');
  if (activeAssignment.assignedTo.toString() !== rahul._id.toString()) {
    throw new Error(`FAILED: Assigned to ${activeAssignment.assignedTo}, expected ${rahul._id}`);
  }
  if (activeAssignment.source !== 'TEAM_MEMBER_SELF_ADDED') {
    throw new Error(`FAILED: Assignment source is ${activeAssignment.source}, expected "TEAM_MEMBER_SELF_ADDED"`);
  }
  console.log(`✔ Automatic Assignment Verified: Company assigned to ${rahul.name} with source TEAM_MEMBER_SELF_ADDED`);

  // 4. Team Member (Rahul) Logs Outreach Call Interaction
  console.log('\n[4/8] Rahul logs outreach call feedback for Starlight Innovations...');
  const interaction = await Interaction.create({
    organizationId: orgA._id,
    companyId: createdCompany.id,
    userId: rahul._id,
    interactionType: 'PHONE_CALL',
    outcome: 'HIRING_NOW',
    notes: 'HR confirmed opening 8 Artificial Intelligence freshers roles.',
    callDetails: {
      hiringStatus: 'YES',
      profiles: ['AI Research Engineer', 'Machine Learning Developer'],
      candidateType: 'FRESHERS',
      openings: 8,
      opportunityType: 'FULL_TIME',
      workMode: 'HYBRID',
      salaryOrStipend: '12-15 LPA',
    },
    isTestData: true,
  });
  console.log(`✔ Outreach call logged by Rahul (ID: ${interaction._id})`);

  // 5. Test Duplicate Company Name Prevention (Case & Whitespace Variations)
  console.log('\n[5/8] Testing Duplicate Company Name Prevention...');
  
  // Test A: Exact Duplicate by Rahul
  try {
    await CompanyService.createCompany(rahulContext, { companyName: 'Starlight Innovations' });
    throw new Error('FAILED: Exact duplicate company creation was NOT blocked!');
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'DUPLICATE_COMPANY') {
      console.log(`✔ PASS: Exact duplicate company name rejected with 409 Conflict.`);
    } else {
      throw err;
    }
  }

  // Test B: Whitespace & Case Variation by Amit ("  STARLIGHT   INNOVATIONS  ")
  try {
    await CompanyService.createCompany(amitContext, { companyName: '  STARLIGHT   INNOVATIONS  ' });
    throw new Error('FAILED: Case & whitespace variation duplicate company creation was NOT blocked!');
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'DUPLICATE_COMPANY') {
      console.log(`✔ PASS: Case/space variation "  STARLIGHT   INNOVATIONS  " rejected with 409 Conflict.`);
    } else {
      throw err;
    }
  }

  // 6. PMO Inspection & Visibility
  console.log('\n[6/8] PMO retrieves company details & verifies complete feedback visibility...');
  const pmoView = await CompanyService.getCompanyById(pmoAContext, createdCompany.id);

  if (pmoView.source !== 'TEAM_MEMBER_SELF_ADDED') {
    throw new Error(`FAILED: PMO view missing source "TEAM_MEMBER_SELF_ADDED"`);
  }
  if (pmoView.createdBy.name !== 'Rahul Sharma') {
    throw new Error(`FAILED: PMO view createdBy name is ${pmoView.createdBy.name}, expected "Rahul Sharma"`);
  }
  if (pmoView.currentAssignment?.assignedTo?.name !== 'Rahul Sharma') {
    throw new Error(`FAILED: PMO view current assignment is not Rahul Sharma`);
  }
  if (!pmoView.interactions || pmoView.interactions.length === 0) {
    throw new Error(`FAILED: PMO view missing interaction feedback logged by Rahul`);
  }
  console.log(`✔ PMO Visibility Verified: Created By = ${pmoView.createdBy.name}, Source = ${pmoView.source}, Interactions Count = ${pmoView.interactions.length}`);

  // 7. PMO Reassigns Company to Amit & Verifies History Preservation
  console.log('\n[7/8] PMO reassigns company to Amit and verifies historical feedback is preserved...');
  await AssignmentService.assignCompany(pmoAContext, {
    companyId: createdCompany.id,
    assignedTo: amit._id.toString(),
    reason: 'Reassigned for senior campus drive coordination',
  });

  const reassignedPmoView = await CompanyService.getCompanyById(pmoAContext, createdCompany.id);
  if (reassignedPmoView.currentAssignment?.assignedTo?.name !== 'Amit Kumar') {
    throw new Error(`FAILED: Reassignment failed, active owner is not Amit Kumar`);
  }
  if (reassignedPmoView.assignmentHistory.length < 2) {
    throw new Error(`FAILED: Assignment history timeline did not record reassignment event`);
  }
  if (!reassignedPmoView.interactions || reassignedPmoView.interactions.length === 0) {
    throw new Error(`FAILED: Historical interaction logged by Rahul was lost after reassignment!`);
  }
  console.log(`✔ Reassignment Verified: Active Owner = ${reassignedPmoView.currentAssignment.assignedTo.name}, Preserved Historical Feedback Count = ${reassignedPmoView.interactions.length}`);

  // 8. Tenant Isolation Security Check
  console.log('\n[8/8] Testing multi-tenant security isolation (PMO B lookup)...');
  try {
    await CompanyService.getCompanyById(pmoBContext, createdCompany.id);
    throw new Error('FAILED: PMO of Org B was able to access Org A self-added company!');
  } catch (err) {
    if (err.statusCode === 404 || err.code === 'COMPANY_NOT_FOUND') {
      console.log(`✔ PASS: Cross-tenant lookup by PMO B rejected with 404 Resource Hiding.`);
    } else {
      throw err;
    }
  }

  // Cleanup Test Objects
  await Company.deleteMany({ organizationId: orgA._id });
  await Assignment.deleteMany({ organizationId: orgA._id });
  await Interaction.deleteMany({ organizationId: orgA._id });
  await User.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
  await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });

  console.log('\n==================================================');
  console.log('SUCCESS: ALL TEAM MEMBER SELF-ADDED COMPANY TESTS PASSED!');
  console.log('==================================================');

  process.exit(0);
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
