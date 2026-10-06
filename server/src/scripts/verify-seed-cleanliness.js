import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import { seedDatabase } from './seed.js';

async function runCleanlinessVerification() {
  console.log('==================================================');
  console.log('STARTING SEED CLEANLINESS & DATABASE SAFETY VERIFICATION');
  console.log('==================================================\n');

  await connectDatabase();

  const superAdminEmail = config.superAdmin.email.toLowerCase().trim();

  // ----------------------------------------------------
  // TEST 1: Fresh database seed test
  // ----------------------------------------------------
  console.log('[Test 1] Testing fresh seed execution...');
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Company.deleteMany({});
  await Contact.deleteMany({});

  await seedDatabase();

  const saUser1 = await User.findOne({ email: superAdminEmail }).select('+passwordHash');
  if (!saUser1) {
    throw new Error('FAILED Test 1: Super Admin user was not created.');
  }

  const orgCount1 = await Organization.countDocuments();
  if (orgCount1 !== 0) {
    throw new Error(`FAILED Test 1: Expected 0 organizations after clean seed, found ${orgCount1}.`);
  }

  const nonSaUserCount1 = await User.countDocuments({ role: { $ne: 'SUPER_ADMIN' } });
  if (nonSaUserCount1 !== 0) {
    throw new Error(`FAILED Test 1: Expected 0 non-SuperAdmin users after clean seed, found ${nonSaUserCount1}.`);
  }
  console.log('[PASS Test 1] Fresh seed created 1 Super Admin and 0 dummy organizations/users.\n');

  const initialHash = saUser1.passwordHash;

  // ----------------------------------------------------
  // TEST 2: Second seed run (Idempotency & Duplicate Prevention)
  // ----------------------------------------------------
  console.log('[Test 2] Testing second seed run (idempotency)...');
  await seedDatabase();

  const saCount2 = await User.countDocuments({ email: superAdminEmail });
  if (saCount2 !== 1) {
    throw new Error(`FAILED Test 2: Expected exactly 1 Super Admin user, found ${saCount2}.`);
  }

  const orgCount2 = await Organization.countDocuments();
  if (orgCount2 !== 0) {
    throw new Error(`FAILED Test 2: Expected 0 organizations after second seed run, found ${orgCount2}.`);
  }

  const saUser2 = await User.findOne({ email: superAdminEmail }).select('+passwordHash');
  if (saUser2.passwordHash !== initialHash) {
    throw new Error('FAILED Test 2: Super Admin password hash was modified on second seed run.');
  }
  console.log('[PASS Test 2] Seed is idempotent: 0 duplicates created, password hash preserved.\n');

  // ----------------------------------------------------
  // TEST 3: Real Data Non-Destructive Protection Test
  // ----------------------------------------------------
  console.log('[Test 3] Creating sample production application data...');
  const sampleOrg = await Organization.create({
    name: 'Metropolitan University',
    code: 'METRO_UNIV',
    email: 'contact@metro.edu',
    status: 'ACTIVE',
  });

  const samplePmoPassword = await User.hashPassword('MetroPmo@123');
  const samplePmo = await User.create({
    name: 'Metro PMO Lead',
    email: 'pmo@metro.edu',
    passwordHash: samplePmoPassword,
    role: 'PMO',
    organizationId: sampleOrg._id,
    status: 'ACTIVE',
  });

  const sampleCompany = await Company.create({
    organizationId: sampleOrg._id,
    companyName: 'Acme Software Labs',
    industry: 'Technology',
    status: 'ACTIVE',
    createdBy: samplePmo._id,
  });

  const sampleContact = await Contact.create({
    organizationId: sampleOrg._id,
    companyId: sampleCompany._id,
    name: 'Anita Verma',
    designation: 'HR Lead',
    email: 'anita@acmelabs.com',
    isPrimary: true,
  });

  console.log(`[Test 3] Created sample real data: Org (${sampleOrg._id}), PMO (${samplePmo._id}), Company (${sampleCompany._id}), Contact (${sampleContact._id})`);

  console.log('[Test 3] Executing seedDatabase() against real production data...');
  await seedDatabase();

  const checkOrg = await Organization.findById(sampleOrg._id);
  if (!checkOrg) {
    throw new Error('FAILED Test 3: Existing real Organization was deleted by seedDatabase()!');
  }

  const checkPmo = await User.findById(samplePmo._id);
  if (!checkPmo) {
    throw new Error('FAILED Test 3: Existing real PMO user was deleted by seedDatabase()!');
  }

  const checkCompany = await Company.findById(sampleCompany._id);
  if (!checkCompany) {
    throw new Error('FAILED Test 3: Existing real Company was deleted by seedDatabase()!');
  }

  const checkContact = await Contact.findById(sampleContact._id);
  if (!checkContact) {
    throw new Error('FAILED Test 3: Existing real Contact was deleted by seedDatabase()!');
  }

  console.log('[PASS Test 3] Seed is 100% NON-DESTRUCTIVE. All existing real Organizations, Users, Companies, and Contacts remain intact.\n');

  // Cleanup test fixture data so DB remains empty of test records
  await Organization.findByIdAndDelete(sampleOrg._id);
  await User.findByIdAndDelete(samplePmo._id);
  await Company.findByIdAndDelete(sampleCompany._id);
  await Contact.findByIdAndDelete(sampleContact._id);
  console.log('[Cleanup] Test fixture data removed cleanly.\n');

  console.log('==================================================');
  console.log('ALL SEED CLEANLINESS VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('==================================================');

  process.exit(0);
}

runCleanlinessVerification().catch((err) => {
  console.error('[Verification Failed]', err);
  process.exit(1);
});
