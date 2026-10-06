import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanupOrphans() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const orgs = await db.collection('organizations').find({}).toArray();
    const validOrgIds = orgs.map((o) => o._id);

    console.log(`Found ${validOrgIds.length} valid organization(s) in database.`);

    const collections = [
      'companies',
      'assignments',
      'interactions',
      'followups',
      'contacts',
      'jobroles',
      'companyimports',
      'notifications',
      'jobopportunities',
      'documents',
    ];

    for (const colName of collections) {
      const query = {
        $or: [
          { organizationId: { $nin: validOrgIds } },
          { organizationId: { $exists: false } },
          { organizationId: null },
          { isTestData: true },
        ],
      };

      const res = await db.collection(colName).deleteMany(query);
      console.log(`Cleaned '${colName}': removed ${res.deletedCount} orphaned/test records.`);
    }

    console.log('Orphan cleanup completed successfully.');
  } catch (err) {
    console.error('Error during orphan cleanup:', err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupOrphans();
