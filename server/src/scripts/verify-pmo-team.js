/**
 * Placement Management System — PMO Team Member Management Automated Verification Suite
 *
 * Runs end-to-end tests against Express app and live MongoDB instance
 */
import mongoose from 'mongoose';
import app from '../app.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/env.js';
import { connectDatabase } from '../config/db.js';

let server;
let baseUrl;

// Tokens
let superAdminToken;
let apexPmoToken;
let beaconPmoToken;
let apexMemberToken;

// Seeded IDs
let apexOrgId;
let beaconOrgId;

// Created test member
let createdMemberId;
let testMemberEmail = `team_test_${Date.now()}@apex.edu`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logTest(testNum, title, passed, details = '') {
  const symbol = passed ? `${colors.green}✔ PASS${colors.reset}` : `${colors.red}✖ FAIL${colors.reset}`;
  console.log(`[${testNum.toString().padStart(2, '0')}] ${symbol} ${title}`);
  if (details && !passed) {
    console.log(`     ${colors.red}Details: ${details}${colors.reset}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = response.status;
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  return { status, data };
}

async function setupTokens() {
  // Login Super Admin
  const res1 = await request('/api/auth/login', {
    method: 'POST',
    body: { email: config.superAdmin.email, password: config.superAdmin.password },
  });
  superAdminToken = res1.data?.data?.accessToken;

  // Login Apex PMO
  const res2 = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'pmo@apex.edu', password: 'PmoApex@123' },
  });
  apexPmoToken = res2.data?.data?.accessToken;
  apexOrgId = res2.data?.data?.user?.organizationId;

  // Login Beacon PMO
  const res3 = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'pmo@beacon.edu', password: 'PmoBeacon@123' },
  });
  beaconPmoToken = res3.data?.data?.accessToken;
  beaconOrgId = res3.data?.data?.user?.organizationId;

  // Login Apex Team Member
  const res4 = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'member@apex.edu', password: 'MemberApex@123' },
  });
  apexMemberToken = res4.data?.data?.accessToken;
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  PMO TEAM MEMBER MANAGEMENT TEST SUITE             ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  await connectDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  await setupTokens();

  let totalTests = 0;
  let passedTests = 0;

  async function test(title, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      logTest(totalTests, title, true);
    } catch (err) {
      logTest(totalTests, title, false, err.message);
    }
  }

  // 1. Unauthenticated request rejected with 401
  await test('Authorization: Unauthenticated request rejected with 401', async () => {
    const res = await request('/api/pmo/team-members');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 2. Team Member role rejected with 403 Forbidden
  await test('Authorization: TEAM_MEMBER role rejected with 403 Forbidden', async () => {
    const res = await request('/api/pmo/team-members', { token: apexMemberToken });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 3. Super Admin role rejected with 403 Forbidden (PMO-only tenant boundary)
  await test('Authorization: SUPER_ADMIN role rejected on PMO endpoints with 403 Forbidden', async () => {
    const res = await request('/api/pmo/team-members', { token: superAdminToken });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 4. PMO dashboard stats: returns counts for own organization
  await test('PMO Stats: Returns team member statistics for PMO organization', async () => {
    const res = await request('/api/pmo/dashboard/stats', { token: apexPmoToken });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const stats = res.data.data;
    if (typeof stats.totalTeamMembers !== 'number') throw new Error('Missing totalTeamMembers');
    if (typeof stats.activeTeamMembers !== 'number') throw new Error('Missing activeTeamMembers');
    if (typeof stats.inactiveTeamMembers !== 'number') throw new Error('Missing inactiveTeamMembers');
  });

  // 5. Create Team Member: Valid payload creates team member
  await test('Create Team Member: PMO creates team member in own organization', async () => {
    const res = await request('/api/pmo/team-members', {
      method: 'POST',
      token: apexPmoToken,
      body: {
        name: 'Rahul Sharma',
        email: testMemberEmail,
        phone: '+91-9876543210',
        password: 'RahulMember@123',
        status: 'ACTIVE',
      },
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const member = res.data.data;
    createdMemberId = member.id;
    if (member.role !== 'TEAM_MEMBER') throw new Error(`Expected role TEAM_MEMBER, got ${member.role}`);
    if (member.organizationId !== apexOrgId) throw new Error('Organization ID mismatch');
    if (member.passwordHash || member.password) throw new Error('Security violation: password hash returned');
  });

  // 6. Multi-Tenant Spoofing Attempt: PMO passes differing organizationId or role
  await test('Multi-Tenant Protection: Client-supplied organizationId and role are strictly overridden', async () => {
    const spoofEmail = `spoof_${Date.now()}@apex.edu`;
    const res = await request('/api/pmo/team-members', {
      method: 'POST',
      token: apexPmoToken,
      body: {
        name: 'Attacker Impersonation',
        email: spoofEmail,
        password: 'SpoofPassword@123',
        organizationId: beaconOrgId, // Attempt to inject into Beacon
        role: 'SUPER_ADMIN',        // Attempt privilege escalation
      },
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const member = res.data.data;
    // Must be bound to Apex (PMO's org) and role must remain TEAM_MEMBER
    if (member.organizationId !== apexOrgId) throw new Error(`Failed multi-tenant isolation! Member bound to ${member.organizationId}`);
    if (member.role !== 'TEAM_MEMBER') throw new Error(`Failed role enforcement! Member has role ${member.role}`);

    // Clean up spoof test record
    await User.findByIdAndDelete(member.id);
  });

  // 7. Duplicate Email Rejection: 409 Conflict
  await test('Validation: Duplicate email rejected with 409 Conflict', async () => {
    const res = await request('/api/pmo/team-members', {
      method: 'POST',
      token: apexPmoToken,
      body: {
        name: 'Duplicate Rahul',
        email: testMemberEmail,
        password: 'RahulMember@123',
      },
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 8. Weak Password Rejection: 400
  await test('Validation: Weak password rejected with 400', async () => {
    const res = await request('/api/pmo/team-members', {
      method: 'POST',
      token: apexPmoToken,
      body: {
        name: 'Weak Password User',
        email: `weak_${Date.now()}@apex.edu`,
        password: 'weak',
      },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 9. List Team Members: Returns only Apex team members
  await test('Tenant Isolation: PMO list query returns strictly own organization team members', async () => {
    const res = await request('/api/pmo/team-members', { token: apexPmoToken });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const members = res.data.data;
    if (!Array.isArray(members)) throw new Error('Expected data to be array');
    for (const m of members) {
      if (m.organizationId !== apexOrgId) {
        throw new Error(`Data leak! Found member ${m.id} belonging to organization ${m.organizationId}`);
      }
      if (m.role !== 'TEAM_MEMBER') {
        throw new Error(`Role violation! Non-team member returned in list: ${m.role}`);
      }
    }
  });

  // 10. Search Support
  await test('Search: Substring search finds matching team member', async () => {
    const res = await request(`/api/pmo/team-members?search=Rahul`, { token: apexPmoToken });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const members = res.data.data;
    if (members.length === 0 || !members.some((m) => m.email === testMemberEmail)) {
      throw new Error('Search failed to find created team member');
    }
  });

  // 11. Cross-Tenant Resource Hiding (GET): PMO of Beacon cannot view Apex team member
  await test('Tenant Isolation: PMO of Org B cannot access Org A team member (404 Resource Hiding)', async () => {
    const res = await request(`/api/pmo/team-members/${createdMemberId}`, { token: beaconPmoToken });
    if (res.status !== 404) throw new Error(`Expected 404 Resource Hiding, got ${res.status}`);
  });

  // 12. Cross-Tenant Resource Hiding (PATCH): PMO of Beacon cannot mutate Org A team member
  await test('Tenant Isolation: PMO of Org B cannot mutate Org A team member (404 Resource Hiding)', async () => {
    const res = await request(`/api/pmo/team-members/${createdMemberId}`, {
      method: 'PATCH',
      token: beaconPmoToken,
      body: { name: 'Hacked Name' },
    });
    if (res.status !== 404) throw new Error(`Expected 404 Resource Hiding, got ${res.status}`);
  });

  // 13. Update Team Member: PMO of Apex updates details and password
  await test('Update Team Member: PMO updates name and password successfully', async () => {
    const res = await request(`/api/pmo/team-members/${createdMemberId}`, {
      method: 'PATCH',
      token: apexPmoToken,
      body: {
        name: 'Rahul K. Sharma',
        phone: '+91-9999911111',
        password: 'NewRahulPassword@123',
      },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.name !== 'Rahul K. Sharma') throw new Error('Name was not updated');
  });

  // 14. Status Deactivation: Sets status to INACTIVE
  await test('Status Management: Deactivating team member sets status to INACTIVE', async () => {
    const res = await request(`/api/pmo/team-members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: apexPmoToken,
      body: { status: 'INACTIVE' },
    });
    if (res.status !== 200 || res.data.data.status !== 'INACTIVE') {
      throw new Error('Failed to deactivate team member');
    }
  });

  // 15. Inactive Login Block: Deactivated member cannot log in
  await test('Security: Deactivated team member is blocked from logging in with 403 ACCOUNT_INACTIVE', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: testMemberEmail,
        password: 'NewRahulPassword@123',
      },
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    if (res.data.error?.code !== 'ACCOUNT_INACTIVE') throw new Error(`Expected code ACCOUNT_INACTIVE, got ${res.data.error?.code}`);
  });

  // 16. Reactivate Team Member
  await test('Status Management: Reactivating team member sets status to ACTIVE', async () => {
    const res = await request(`/api/pmo/team-members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: apexPmoToken,
      body: { status: 'ACTIVE' },
    });
    if (res.status !== 200 || res.data.data.status !== 'ACTIVE') {
      throw new Error('Failed to reactivate team member');
    }
  });

  // 17. Active Login: Newly created team member can log in and view profile
  await test('Authentication: Reactivated team member can log in and view profile', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: testMemberEmail,
        password: 'NewRahulPassword@123',
      },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const token = res.data.data.accessToken;

    const meRes = await request('/api/auth/me', { token });
    if (meRes.status !== 200) throw new Error(`Expected 200 on /me, got ${meRes.status}`);
    if (meRes.data.data.role !== 'TEAM_MEMBER') throw new Error('Role mismatch on /me');
    if (meRes.data.data.organizationId !== apexOrgId) throw new Error('Organization ID mismatch on /me');
  });

  // 18. Audit Logging: AuditLog entries exist for team member actions
  await test('Audit Logging: Verified audit trail records for all PMO mutations', async () => {
    const logs = await AuditLog.find({ entityId: createdMemberId });
    const actions = logs.map((l) => l.action);
    if (!actions.includes('TEAM_MEMBER_CREATED')) throw new Error('Missing TEAM_MEMBER_CREATED log');
    if (!actions.includes('TEAM_MEMBER_UPDATED')) throw new Error('Missing TEAM_MEMBER_UPDATED log');
    if (!actions.includes('TEAM_MEMBER_DEACTIVATED')) throw new Error('Missing TEAM_MEMBER_DEACTIVATED log');
    if (!actions.includes('TEAM_MEMBER_ACTIVATED')) throw new Error('Missing TEAM_MEMBER_ACTIVATED log');
  });

  // Clean up test data
  await User.findByIdAndDelete(createdMemberId);
  await AuditLog.deleteMany({ entityId: createdMemberId });

  server.close();
  await mongoose.disconnect();

  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`  Tests Completed: ${totalTests} | Passed: ${colors.green}${passedTests}${colors.reset} | Failed: ${totalTests === passedTests ? colors.green + '0' : colors.red + (totalTests - passedTests)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[Verification Runner Crash]', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
