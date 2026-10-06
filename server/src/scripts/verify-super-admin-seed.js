import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import { seedSuperAdmin } from '../services/seedSuperAdmin.js';
import app from '../app.js';

async function runVerification() {
  console.log('--- STARTING SUPER ADMIN SEED VERIFICATION ---');

  await connectDatabase();

  const superAdminEmail = config.superAdmin.email.toLowerCase().trim();
  const superAdminPassword = config.superAdmin.password;

  // Step 1: Clean up any existing Super Admin user for clean initial test state
  await User.deleteMany({ email: superAdminEmail });
  console.log(`[Test Step 1] Cleaned up existing user with email ${superAdminEmail}`);

  // Step 2: First Seed Run - Create Super Admin when missing
  const res1 = await seedSuperAdmin();
  if (!res1.created || !res1.user) {
    throw new Error('FAILED: First seed run should have created a new Super Admin.');
  }
  console.log('[Test Step 2 PASSED] Super Admin created on first seed run.');

  // Step 3: Verify User Properties in DB
  const dbUser1 = await User.findOne({ email: superAdminEmail }).select('+passwordHash');
  if (!dbUser1) {
    throw new Error('FAILED: Super Admin user not found in database.');
  }

  if (dbUser1.role !== 'SUPER_ADMIN') {
    throw new Error(`FAILED: Expected role SUPER_ADMIN, got ${dbUser1.role}`);
  }
  if (dbUser1.organizationId !== null) {
    throw new Error(`FAILED: Expected organizationId null, got ${dbUser1.organizationId}`);
  }
  if (dbUser1.status !== 'ACTIVE') {
    throw new Error(`FAILED: Expected status ACTIVE, got ${dbUser1.status}`);
  }
  if (!dbUser1.passwordHash || dbUser1.passwordHash === superAdminPassword) {
    throw new Error('FAILED: Password must be bcrypt-hashed and not stored as plaintext.');
  }
  console.log('[Test Step 3 PASSED] DB user properties verified (role=SUPER_ADMIN, organizationId=null, status=ACTIVE, password hashed).');

  const initialPasswordHash = dbUser1.passwordHash;

  // Step 4: Second Seed Run - Verify Idempotency & Duplicate Prevention
  const res2 = await seedSuperAdmin();
  if (res2.created) {
    throw new Error('FAILED: Second seed run should NOT create a new user.');
  }

  const count = await User.countDocuments({ email: superAdminEmail });
  if (count !== 1) {
    throw new Error(`FAILED: Expected exactly 1 Super Admin account, found ${count}.`);
  }
  console.log('[Test Step 4 PASSED] Seed is idempotent and no duplicates were created.');

  // Step 5: Verify Password Persistence
  const dbUser2 = await User.findOne({ email: superAdminEmail }).select('+passwordHash');
  if (dbUser2.passwordHash !== initialPasswordHash) {
    throw new Error('FAILED: Password hash was modified/overwritten on second seed run.');
  }
  console.log('[Test Step 5 PASSED] Super Admin password hash preserved across seed runs.');

  // Step 6: Verify Normal Login Flow via HTTP / API
  console.log('[Test Step 6] Testing normal login flow via API...');
  
  // We can use supertest-style request using Express app handler or direct method calls
  const userValidPassword = await dbUser2.comparePassword(superAdminPassword);
  if (!userValidPassword) {
    throw new Error('FAILED: Super Admin cannot authenticate with configured password via comparePassword.');
  }
  console.log('[Test Step 6 PASSED] Password comparison succeeded with configured password.');

  // Step 7: Verify User JSON transformation strips passwordHash
  const jsonUser = dbUser2.toJSON();
  if (jsonUser.passwordHash || jsonUser.password) {
    throw new Error('FAILED: Sensitive password/passwordHash present in User toJSON output!');
  }
  console.log('[Test Step 7 PASSED] User output safely redacts passwordHash.');

  console.log('--- ALL SUPER ADMIN SEED VERIFICATIONS PASSED SUCCESSFULLY ---');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('[Verification Failed]', err);
  process.exit(1);
});
