import { connectDatabase } from '../config/db.js';
import { seedSuperAdmin } from '../services/seedSuperAdmin.js';

/**
 * Database Seed Process:
 * - Bootstraps / preserves ONLY the permanent Super Admin account.
 * - Does NOT create any dummy test organizations or test users.
 * - Non-destructive: NEVER executes deleteMany({}) or collection wipes.
 */
export const seedDatabase = async () => {
  console.log('[Seed] Starting database seed...');

  await connectDatabase();

  const { user: superAdmin } = await seedSuperAdmin();

  console.log('[Seed] Super Admin initialization complete.');
  if (superAdmin) {
    console.log(`[Seed] Super Admin Email: ${superAdmin.email}`);
  }
  console.log('[Seed] Database seed finished cleanly. Preserved/created 1 Super Admin account.');

  return {
    user: superAdmin,
  };
};

// Execute if run directly from CLI
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
