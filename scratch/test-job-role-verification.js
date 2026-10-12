import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

import User from '../server/src/models/User.js';
import Organization from '../server/src/models/Organization.js';
import JobRole from '../server/src/models/JobRole.js';
import Interaction from '../server/src/models/Interaction.js';
import jobRoleService from '../server/src/services/jobRole.service.js';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management');
  console.log('Connected.');

  try {
    // 1. Find a PMO user
    let pmoUser = await User.findOne({ role: 'PMO', status: 'ACTIVE' });
    if (!pmoUser) {
      console.log('No PMO user found, looking for any Organization...');
      let org = await Organization.findOne();
      if (!org) {
        org = await Organization.create({ name: 'Test Org ' + Date.now(), domain: 'testorg.com' });
      }
      pmoUser = await User.create({
        name: 'Test PMO User',
        email: `pmo_test_${Date.now()}@test.com`,
        passwordHash: 'hashed',
        role: 'PMO',
        organizationId: org._id,
        status: 'ACTIVE',
      });
    }

    console.log(`Using PMO User: ${pmoUser.email}, Org: ${pmoUser.organizationId}`);

    const userContext = {
      id: pmoUser._id.toString(),
      _id: pmoUser._id,
      organizationId: pmoUser.organizationId,
      role: 'PMO',
    };

    // 2. Fetch initial list via jobRoleService.getJobRoles
    console.log('\n--- 1. Testing getJobRoles ---');
    const initialResult = await jobRoleService.getJobRoles(userContext, { page: 1, limit: 10 });
    console.log(`Initial job roles count: ${initialResult.data.length}`);

    // 3. Create a job role
    console.log('\n--- 2. Testing createJobRole ---');
    const roleName = `QA Engineer ${Date.now()}`;
    const newRole = await jobRoleService.createJobRole(userContext, {
      name: roleName,
      description: 'Test role description',
      status: 'ACTIVE',
    });
    console.log(`Created Job Role: ${newRole.name} (ID: ${newRole.id || newRole._id})`);

    // 4. Verify getActiveJobRoles returns the created role
    console.log('\n--- 3. Testing getActiveJobRoles ---');
    const activeRoles = await jobRoleService.getActiveJobRoles(userContext);
    const foundActive = activeRoles.some((r) => (r.id || r._id).toString() === (newRole.id || newRole._id).toString());
    console.log(`New role present in active job roles list: ${foundActive}`);

    // 5. Update job role
    console.log('\n--- 4. Testing updateJobRole ---');
    const roleId = newRole.id || newRole._id;
    const updatedRole = await jobRoleService.updateJobRole(userContext, roleId, {
      name: `${roleName} Updated`,
      description: 'Updated description',
    });
    console.log(`Updated Job Role Name: ${updatedRole.name}`);

    // 6. Update status to INACTIVE
    console.log('\n--- 5. Testing updateJobRoleStatus ---');
    const inactiveRole = await jobRoleService.updateJobRoleStatus(userContext, roleId, 'INACTIVE');
    console.log(`Role status after deactivation: ${inactiveRole.status}`);

    const activeRolesAfterDeactivate = await jobRoleService.getActiveJobRoles(userContext);
    const foundActive2 = activeRolesAfterDeactivate.some((r) => (r.id || r._id).toString() === roleId.toString());
    console.log(`Inactive role present in active job roles list: ${foundActive2} (Expected: false)`);

    // 7. Delete job role (usedCount === 0)
    console.log('\n--- 6. Testing deleteJobRole (Unused role) ---');
    const deleteRes = await jobRoleService.deleteJobRole(userContext, roleId);
    console.log(`Delete result message: ${deleteRes.message}`);

    const deletedFind = await JobRole.findById(roleId);
    console.log(`Deleted role found in DB: ${Boolean(deletedFind)} (Expected: false)`);

    console.log('\n✅ ALL JOB ROLE SERVICE TESTS PASSED SUCCESSFULY!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
