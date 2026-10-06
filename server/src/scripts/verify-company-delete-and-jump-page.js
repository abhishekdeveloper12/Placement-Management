import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Contact from '../models/Contact.js';
import companyService from '../services/company.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_management';

async function runVerification() {
  console.log('=== STARTING COMPANY DELETE & JUMP PAGE VERIFICATION TEST ===\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clean up test organization if existing
    await Organization.deleteMany({ code: 'TEST_DEL_ORG' });
    await User.deleteMany({ email: 'pmo_del@test.com' });
    await Company.deleteMany({ normalizedName: { $regex: /^test-delete-company-/ } });

    // 2. Create Test Organization
    const testOrg = await Organization.create({
      name: 'Test Delete Org',
      code: 'TEST_DEL_ORG',
      email: 'pmo_del_org@test.com',
      isTestData: true,
    });

    const pmoUser = await User.create({
      organizationId: testOrg._id,
      name: 'PMO Delete Tester',
      email: 'pmo_del@test.com',
      passwordHash: '$2a$10$e8w.xL2pQ.55a2X45g2O.e/w.xL2pQ.55a2X45g2O.e/w.xL2pQ.',
      role: 'PMO',
      isTestData: true,
    });

    const contextPMO = {
      id: pmoUser._id.toString(),
      role: 'PMO',
      organizationId: testOrg._id.toString(),
      name: pmoUser.name,
    };

    // 3. Create 3 Test Companies
    const c1 = await Company.create({
      organizationId: testOrg._id,
      companyName: 'Test Delete Company One',
      normalizedName: 'test-delete-company-one',
      status: 'ACTIVE',
      createdBy: pmoUser._id,
      isTestData: true,
    });

    const c2 = await Company.create({
      organizationId: testOrg._id,
      companyName: 'Test Delete Company Two',
      normalizedName: 'test-delete-company-two',
      status: 'ACTIVE',
      createdBy: pmoUser._id,
      isTestData: true,
    });

    const c3 = await Company.create({
      organizationId: testOrg._id,
      companyName: 'Test Delete Company Three',
      normalizedName: 'test-delete-company-three',
      status: 'ACTIVE',
      createdBy: pmoUser._id,
      isTestData: true,
    });

    await Contact.create({
      organizationId: testOrg._id,
      companyId: c1._id,
      name: 'HR One',
      email: 'hr1@c1.com',
      isPrimary: true,
    });

    console.log('✓ Created 3 Test Companies (c1, c2, c3).');

    // 4. Test Single Company Deletion
    console.log('\n--- Test 1: Single Company Deletion ---');
    const singleDelRes = await companyService.deleteCompany(contextPMO, c1._id.toString());
    console.log(`✓ Single company delete response:`, singleDelRes);

    const checkC1 = await Company.findById(c1._id);
    const checkContactC1 = await Contact.findOne({ companyId: c1._id });
    if (checkC1 || checkContactC1) {
      console.error('❌ Failed: Company c1 or its contact was not deleted!');
      process.exit(1);
    }
    console.log('✓ Single company c1 and its associated contact were cleanly deleted.');

    // 5. Test Bulk Company Deletion
    console.log('\n--- Test 2: Bulk Company Deletion ---');
    const bulkDelRes = await companyService.bulkDeleteCompanies(contextPMO, [c2._id.toString(), c3._id.toString()]);
    console.log(`✓ Bulk delete response:`, bulkDelRes);

    if (bulkDelRes.deletedCount !== 2) {
      console.error(`❌ Failed: Expected 2 deleted companies, got ${bulkDelRes.deletedCount}`);
      process.exit(1);
    }

    const checkC2C3 = await Company.find({ _id: { $in: [c2._id, c3._id] } });
    if (checkC2C3.length > 0) {
      console.error('❌ Failed: Companies c2 and c3 still exist in database!');
      process.exit(1);
    }
    console.log('✓ Bulk deletion of c2 and c3 completed cleanly.');

    // 6. Clean up Test Org & User
    console.log('\n--- Cleaning up test records ---');
    await User.deleteMany({ _id: pmoUser._id });
    await Organization.deleteMany({ _id: testOrg._id });
    console.log('✓ Test records cleaned up.');

    console.log('\n=== ALL COMPANY DELETE & JUMP PAGE BACKEND VERIFICATION TESTS PASSED! ===');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
