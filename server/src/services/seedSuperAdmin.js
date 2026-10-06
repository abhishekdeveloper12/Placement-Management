import User from '../models/User.js';
import { config } from '../config/env.js';

/**
 * Idempotently seed or update the permanent Super Admin account.
 *
 * Rules:
 * 1. Checks if configured SUPER_ADMIN_EMAIL user exists.
 * 2. If missing: creates user with role='SUPER_ADMIN', organizationId=null, status='ACTIVE', and bcrypt-hashed password.
 * 3. If exists: preserves existing user & password hash (does NOT overwrite password hash).
 * 4. Ensures account status is 'ACTIVE' so development/production admin remains usable.
 * 5. Returns { user, created: boolean }
 */
export const seedSuperAdmin = async () => {
  const email = config.superAdmin.email;
  const password = config.superAdmin.password;

  if (!email || !password) {
    if (config.nodeEnv === 'production') {
      const error = new Error(
        '[Configuration Error] SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required in production.'
      );
      console.error(error.message);
      throw error;
    } else {
      console.warn('[Seed Warning] Missing Super Admin email or password in configuration.');
      return { user: null, created: false };
    }
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if Super Admin with this email exists
  let existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    let needsSave = false;

    // Ensure status is ACTIVE so development/production admin remains usable
    if (existingUser.status !== 'ACTIVE') {
      existingUser.status = 'ACTIVE';
      needsSave = true;
    }

    // Ensure role is SUPER_ADMIN & organizationId is null
    if (existingUser.role !== 'SUPER_ADMIN' || existingUser.organizationId !== null) {
      existingUser.role = 'SUPER_ADMIN';
      existingUser.organizationId = null;
      needsSave = true;
    }

    if (needsSave) {
      await existingUser.save();
      console.log(`[Seed] Updated status/role for existing Super Admin (${normalizedEmail}). Password hash preserved.`);
    } else {
      console.log(`[Seed] Super Admin account (${normalizedEmail}) already exists. Preserving existing account & credentials.`);
    }

    return { user: existingUser, created: false };
  }

  // If missing, hash password using User model's hashPassword utility
  const passwordHash = await User.hashPassword(password);

  const superAdmin = await User.create({
    name: 'System Super Admin',
    email: normalizedEmail,
    passwordHash,
    role: 'SUPER_ADMIN',
    organizationId: null,
    status: 'ACTIVE',
  });

  console.log(`[Seed] Created permanent Super Admin account (${normalizedEmail}) successfully.`);

  return { user: superAdmin, created: true };
};

export default seedSuperAdmin;
