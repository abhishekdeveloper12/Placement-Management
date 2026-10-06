import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { connectDatabase } from '../config/db.js';

async function cleanDb() {
  console.log('[CleanDB] Connecting to database...');
  await connectDatabase();

  const orgRes = await Organization.deleteMany({});
  const compRes = await Company.deleteMany({});
  const contRes = await Contact.deleteMany({});
  const assignRes = await Assignment.deleteMany({});
  const interRes = await Interaction.deleteMany({});
  const followRes = await FollowUp.deleteMany({});
  const oppRes = await JobOpportunity.deleteMany({});
  const auditRes = await AuditLog.deleteMany({});
  const notifRes = await Notification.deleteMany({});
  const userRes = await User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } });

  console.log('[CleanDB] Database cleaned successfully:');
  console.log(`  - Organizations deleted: ${orgRes.deletedCount}`);
  console.log(`  - Non-SuperAdmin Users deleted: ${userRes.deletedCount}`);
  console.log(`  - Companies deleted: ${compRes.deletedCount}`);
  console.log(`  - Contacts deleted: ${contRes.deletedCount}`);
  console.log(`  - Assignments deleted: ${assignRes.deletedCount}`);
  console.log(`  - Interactions deleted: ${interRes.deletedCount}`);
  console.log(`  - Follow-ups deleted: ${followRes.deletedCount}`);
  console.log(`  - Opportunities deleted: ${oppRes.deletedCount}`);
  console.log(`  - Audit Logs deleted: ${auditRes.deletedCount}`);
  console.log(`  - Notifications deleted: ${notifRes.deletedCount}`);

  const remainingUsers = await User.find({}).select('email role status');
  console.log('\nRemaining Users in Database:');
  remainingUsers.forEach((u) => console.log(`  - ${u.email} (${u.role}, ${u.status})`));

  process.exit(0);
}

cleanDb().catch((err) => {
  console.error('[CleanDB Error]', err);
  process.exit(1);
});
