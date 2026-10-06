/**
 * Placement Management System — Super Admin & PMO Management Automated Verification Suite
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

// Test state
let superAdminToken;
let apexPmoToken;
let apexMemberToken;

let testOrgId;
let testOrgCode = `TEST_${Date.now()}`;
let testPmoEmail = `pmo_${Date.now()}@testorg.edu`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
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

  // Login Apex Team Member
  const res3 = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'member@apex.edu', password: 'MemberApex@123' },
  });
  apexMemberToken = res3.data?.data?.accessToken;
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  SUPER ADMIN & PMO MANAGEMENT TEST SUITE           ${colors.reset}`);
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

  // 1. Dashboard stats: unauthenticated -> 401
  await test('Dashboard Stats: Unauthenticated request rejected with 401', async () => {
    const res = await request('/api/super-admin/dashboard/stats');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 2. Dashboard stats: PMO role -> 403 Forbidden
  await test('Dashboard Stats: PMO role rejected with 403 Forbidden', async () => {
    const res = await request('/api/super-admin/dashboard/stats', { token: apexPmoToken });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 3. Dashboard stats: Team Member role -> 403 Forbidden
  await test('Dashboard Stats: TEAM_MEMBER rejected with 403 Forbidden', async () => {
    const res = await request('/api/super-admin/dashboard/stats', { token: apexMemberToken });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 4. Dashboard stats: Super Admin allowed -> 200 with accurate stats
  await test('Dashboard Stats: Super Admin succeeds with 200 and accurate metrics', async () => {
    const res = await request('/api/super-admin/dashboard/stats', { token: superAdminToken });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.data.data;
    if (typeof data.totalOrganizations !== 'number') throw new Error('Missing totalOrganizations');
    if (typeof data.activeOrganizations !== 'number') throw new Error('Missing activeOrganizations');
    if (typeof data.totalPmos !== 'number') throw new Error('Missing totalPmos');
  });

  // 5. Create Organization: Rejects missing fields -> 400
  await test('Create Organization: Missing mandatory fields rejected with 400', async () => {
    const res = await request('/api/super-admin/organizations', {
      method: 'POST',
      token: superAdminToken,
      body: { name: '', code: '' },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 6. Create Organization: Valid payload succeeds with 201
  await test('Create Organization: Valid payload creates organization with 201', async () => {
    const res = await request('/api/super-admin/organizations', {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Zenith Institute of Engineering',
        code: testOrgCode,
        email: 'contact@zenith.edu',
        phone: '+91-9876543210',
        address: 'Tech Corridor, Bengaluru',
        status: 'ACTIVE',
      },
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    testOrgId = res.data.data.id;
    if (!testOrgId) throw new Error('Missing id in response');
    if (res.data.data.code !== testOrgCode) throw new Error('Code mismatch');
  });

  // 7. Create Organization: Duplicate code rejected with 409
  await test('Create Organization: Duplicate code rejected with 409', async () => {
    const res = await request('/api/super-admin/organizations', {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Duplicate Institute',
        code: testOrgCode,
        email: 'dup@zenith.edu',
      },
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 8. List Organizations: Returns paginated data and filters
  await test('List Organizations: Returns paginated list with search support', async () => {
    const res = await request(`/api/super-admin/organizations?search=${testOrgCode}`, {
      token: superAdminToken,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Expected data to be array');
    if (res.data.data.length === 0) throw new Error('Expected search to find created organization');
    if (!res.data.meta || res.data.meta.total < 1) throw new Error('Missing or invalid pagination meta');
  });

  // 9. Get Organization Details: Returns detail with counts
  await test('Get Organization Details: Returns organization details and PMO info', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}`, {
      token: superAdminToken,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.id !== testOrgId) throw new Error('Organization ID mismatch');
    if (res.data.data.pmo !== null) throw new Error('Expected PMO to be null before assignment');
  });

  // 10. Update Organization: Updates details
  await test('Update Organization: Updates name and contact details', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}`, {
      method: 'PATCH',
      token: superAdminToken,
      body: {
        name: 'Zenith University of Technology',
        phone: '+91-9999988888',
      },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.name !== 'Zenith University of Technology') throw new Error('Name was not updated');
  });

  // 11. Deactivate Organization: Status changes to INACTIVE
  await test('Deactivate Organization: Sets status to INACTIVE with 200', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { status: 'INACTIVE' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.status !== 'INACTIVE') throw new Error('Status was not set to INACTIVE');
  });

  // 12. Create PMO for Inactive Org: Rejected with 400
  await test('Create PMO for Inactive Organization: Rejected with 400', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Dr. Ramesh Kumar',
        email: testPmoEmail,
        password: 'PmoPassword@123',
      },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data.error?.code !== 'ORGANIZATION_INACTIVE') throw new Error(`Expected code ORGANIZATION_INACTIVE, got ${res.data.error?.code}`);
  });

  // 13. Reactivate Organization: Status changes back to ACTIVE
  await test('Reactivate Organization: Sets status back to ACTIVE with 200', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { status: 'ACTIVE' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.status !== 'ACTIVE') throw new Error('Status was not set to ACTIVE');
  });

  // 14. Create PMO: Weak password rejected with 400
  await test('Create PMO: Weak password rejected with 400 WEAK_PASSWORD', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Dr. Ramesh Kumar',
        email: testPmoEmail,
        password: 'weak',
      },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 15. Create PMO: Valid payload succeeds with 201, passwordHash is omitted
  await test('Create PMO: Valid payload provisions PMO with role PMO and hides passwordHash', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Dr. Ramesh Kumar',
        email: testPmoEmail,
        phone: '+91-9888877777',
        password: 'ZenithPmo@123',
        status: 'ACTIVE',
      },
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const pmo = res.data.data;
    if (pmo.role !== 'PMO') throw new Error(`Expected role PMO, got ${pmo.role}`);
    if (pmo.organizationId !== testOrgId) throw new Error('PMO organizationId mismatch');
    if (pmo.passwordHash || pmo.password) throw new Error('Security violation: password returned in response');
  });

  // 16. Duplicate PMO: Rule prevents second primary PMO creation
  await test('Create PMO: Duplicate primary PMO for same organization rejected with 409', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      method: 'POST',
      token: superAdminToken,
      body: {
        name: 'Dr. Second PMO',
        email: `second_${Date.now()}@testorg.edu`,
        password: 'SecondPmo@123',
      },
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
    if (res.data.error?.code !== 'DUPLICATE_PRIMARY_PMO') throw new Error(`Expected DUPLICATE_PRIMARY_PMO, got ${res.data.error?.code}`);
  });

  // 17. Get PMO: Retrieves PMO information
  await test('Get PMO: Retrieves assigned PMO details for organization', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      token: superAdminToken,
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.email !== testPmoEmail) throw new Error('Email mismatch');
  });

  // 18. Update PMO: Updates basic details and optional password
  await test('Update PMO: Updates PMO details and password', async () => {
    const res = await request(`/api/super-admin/organizations/${testOrgId}/pmo`, {
      method: 'PATCH',
      token: superAdminToken,
      body: {
        name: 'Prof. Ramesh K. Sharma',
        password: 'NewZenithPassword@123',
      },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.name !== 'Prof. Ramesh K. Sharma') throw new Error('Name was not updated');
  });

  // 19. Deactivate and Reactivate PMO
  await test('Deactivate & Reactivate PMO: Toggles status with 200', async () => {
    const res1 = await request(`/api/super-admin/organizations/${testOrgId}/pmo/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { status: 'INACTIVE' },
    });
    if (res1.status !== 200 || res1.data.data.status !== 'INACTIVE') throw new Error('Failed to deactivate');

    const res2 = await request(`/api/super-admin/organizations/${testOrgId}/pmo/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { status: 'ACTIVE' },
    });
    if (res2.status !== 200 || res2.data.data.status !== 'ACTIVE') throw new Error('Failed to reactivate');
  });

  // 20. Login with newly created PMO account
  await test('PMO Login: Newly created PMO can log in with updated password', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: testPmoEmail,
        password: 'NewZenithPassword@123',
      },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const token = res.data.data.accessToken;
    if (!token) throw new Error('Missing accessToken');

    // Verify GET /api/auth/me
    const meRes = await request('/api/auth/me', { token });
    if (meRes.status !== 200) throw new Error(`Expected 200 on /me, got ${meRes.status}`);
    if (meRes.data.data.role !== 'PMO') throw new Error('Role mismatch on /me');
    if (meRes.data.data.organization?.name !== 'Zenith University of Technology') throw new Error('Org name mismatch on /me');
  });

  // 21. Audit Logging: AuditLog entries exist for the performed actions
  await test('Audit Logging: Verified audit trail records for all Super Admin mutations', async () => {
    const logs = await AuditLog.find({
      organizationId: testOrgId,
    });
    const actions = logs.map((l) => l.action);
    if (!actions.includes('ORGANIZATION_CREATED')) throw new Error('Missing ORGANIZATION_CREATED log');
    if (!actions.includes('ORGANIZATION_UPDATED')) throw new Error('Missing ORGANIZATION_UPDATED log');
    if (!actions.includes('ORGANIZATION_DEACTIVATED')) throw new Error('Missing ORGANIZATION_DEACTIVATED log');
    if (!actions.includes('ORGANIZATION_ACTIVATED')) throw new Error('Missing ORGANIZATION_ACTIVATED log');
    if (!actions.includes('PMO_CREATED')) throw new Error('Missing PMO_CREATED log');
    if (!actions.includes('PMO_UPDATED')) throw new Error('Missing PMO_UPDATED log');
  });

  // Clean up test data
  await User.deleteMany({ email: testPmoEmail });
  await Organization.findByIdAndDelete(testOrgId);
  await AuditLog.deleteMany({ organizationId: testOrgId });

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
