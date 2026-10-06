import app from '../app.js';
import { connectDatabase } from '../config/db.js';
import { config } from '../config/env.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { seedDatabase } from './seed.js';

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n==================================================');
  console.log('STARTING AUTOMATED SECURITY & AUTHENTICATION TESTS');
  console.log('==================================================\n');

  // Ensure DB connected and seed Super Admin
  await connectDatabase();
  await seedDatabase();

  // Provision security test suite fixture organizations & users
  const pmoApexPassword = await User.hashPassword('PmoApex@123');
  const memberApexPassword = await User.hashPassword('MemberApex@123');
  const pmoBeaconPassword = await User.hashPassword('PmoBeacon@123');
  const inactiveUserPassword = await User.hashPassword('Inactive@123');
  const cobaltUserPassword = await User.hashPassword('CobaltUser@123');

  let apexOrg = await Organization.findOne({ code: 'APEX_SEC_TEST' });
  if (!apexOrg) {
    apexOrg = await Organization.create({
      name: 'Apex Security Test College',
      code: 'APEX_SEC_TEST',
      email: 'contact@apex.edu',
      status: 'ACTIVE',
    });
  }

  let beaconOrg = await Organization.findOne({ code: 'BEACON_SEC_TEST' });
  if (!beaconOrg) {
    beaconOrg = await Organization.create({
      name: 'Beacon Security Test College',
      code: 'BEACON_SEC_TEST',
      email: 'contact@beacon.edu',
      status: 'ACTIVE',
    });
  }

  let cobaltOrg = await Organization.findOne({ code: 'COBALT_SEC_TEST' });
  if (!cobaltOrg) {
    cobaltOrg = await Organization.create({
      name: 'Cobalt Security Test College',
      code: 'COBALT_SEC_TEST',
      email: 'contact@cobalt.edu',
      status: 'INACTIVE',
    });
  }

  await User.findOneAndUpdate(
    { email: 'pmo@apex.edu' },
    { name: 'Apex PMO Lead', email: 'pmo@apex.edu', passwordHash: pmoApexPassword, role: 'PMO', organizationId: apexOrg._id, status: 'ACTIVE' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'member@apex.edu' },
    { name: 'Apex Placement Officer', email: 'member@apex.edu', passwordHash: memberApexPassword, role: 'TEAM_MEMBER', organizationId: apexOrg._id, status: 'ACTIVE' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'pmo@beacon.edu' },
    { name: 'Beacon PMO Lead', email: 'pmo@beacon.edu', passwordHash: pmoBeaconPassword, role: 'PMO', organizationId: beaconOrg._id, status: 'ACTIVE' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'inactive@apex.edu' },
    { name: 'Inactive Team Member', email: 'inactive@apex.edu', passwordHash: inactiveUserPassword, role: 'TEAM_MEMBER', organizationId: apexOrg._id, status: 'INACTIVE' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'user@cobalt.edu' },
    { name: 'Cobalt PMO Lead', email: 'user@cobalt.edu', passwordHash: cobaltUserPassword, role: 'PMO', organizationId: cobaltOrg._id, status: 'ACTIVE' },
    { upsert: true, new: true }
  );

  // Start app on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      console.log(`[Test Runner] Test server listening on ${baseUrl}`);
      resolve();
    });
  });

  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
      failedCount++;
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Valid login
    // ----------------------------------------------------
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmo@apex.edu',
        password: 'PmoApex@123',
      }),
    });
    const loginData = await loginRes.json();
    const setCookieHeader = loginRes.headers.get('set-cookie');

    assert(
      loginRes.status === 200 &&
      loginData.success === true &&
      Boolean(loginData.data.accessToken) &&
      loginData.data.user.email === 'pmo@apex.edu' &&
      loginData.data.user.role === 'PMO' &&
      loginData.data.user.passwordHash === undefined &&
      Boolean(loginData.data.user.organizationId) &&
      Boolean(setCookieHeader && setCookieHeader.includes('placement_refresh_token')),
      'TEST 1: Valid login returns 200, access token, safe user profile, and HTTP-only cookie without passwordHash'
    );

    const pmoToken = loginData.data?.accessToken;
    const pmoOrgId = loginData.data?.user?.organizationId;

    // ----------------------------------------------------
    // TEST 2: Invalid password
    // ----------------------------------------------------
    const badPwRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmo@apex.edu',
        password: 'WrongPassword@999',
      }),
    });
    const badPwData = await badPwRes.json();

    assert(
      badPwRes.status === 401 &&
      badPwData.success === false &&
      badPwData.error.code === 'INVALID_CREDENTIALS' &&
      badPwData.error.message === 'Invalid email or password',
      'TEST 2: Invalid password returns 401 with generic error message',
      JSON.stringify(badPwData)
    );

    // ----------------------------------------------------
    // TEST 3: Nonexistent user
    // ----------------------------------------------------
    const nonUserRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost@nowhere.com',
        password: 'SomePassword@123',
      }),
    });
    const nonUserData = await nonUserRes.json();

    assert(
      nonUserRes.status === 401 &&
      nonUserData.success === false &&
      nonUserData.error.code === 'INVALID_CREDENTIALS' &&
      nonUserData.error.message === 'Invalid email or password',
      'TEST 3: Nonexistent user returns identical 401 generic error (no account enumeration)',
      JSON.stringify(nonUserData)
    );

    // ----------------------------------------------------
    // TEST 4: Unauthenticated request to protected endpoint
    // ----------------------------------------------------
    const unauthRes = await fetch(`${baseUrl}/security-test/protected`, {
      method: 'GET',
    });
    const unauthData = await unauthRes.json();

    assert(
      unauthRes.status === 401 &&
      unauthData.success === false &&
      unauthData.error.code === 'AUTHENTICATION_REQUIRED',
      'TEST 4: Unauthenticated request to protected endpoint rejected with 401'
    );

    // ----------------------------------------------------
    // TEST 5: Authenticated user with insufficient role
    // (PMO attempts to access SUPER_ADMIN only endpoint)
    // ----------------------------------------------------
    const superAdminOnlyRes = await fetch(`${baseUrl}/security-test/super-admin-only`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${pmoToken}`,
      },
    });
    const superAdminOnlyData = await superAdminOnlyRes.json();

    assert(
      superAdminOnlyRes.status === 403 &&
      superAdminOnlyData.success === false &&
      superAdminOnlyData.error.code === 'FORBIDDEN_ROLE',
      'TEST 5: PMO accessing Super Admin endpoint rejected with 403 Forbidden'
    );

    // ----------------------------------------------------
    // TEST 6: PMO authenticated as Org A attempts cross-tenant access to Org B
    // ----------------------------------------------------
    // First obtain Beacon Org ID (Org B)
    const beaconLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmo@beacon.edu',
        password: 'PmoBeacon@123',
      }),
    });
    const beaconLoginData = await beaconLoginRes.json();
    const beaconOrgId = beaconLoginData.data.user.organizationId;

    // PMO Apex sends request with organizationId = Beacon Org ID in body
    const crossTenantRes = await fetch(`${baseUrl}/security-test/tenant-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pmoToken}`,
      },
      body: JSON.stringify({
        organizationId: beaconOrgId, // Attempted tenant tampering
        action: 'leak-data',
      }),
    });
    const crossTenantData = await crossTenantRes.json();

    assert(
      crossTenantRes.status === 403 &&
      crossTenantData.success === false &&
      crossTenantData.error.code === 'CROSS_TENANT_ACCESS_DENIED',
      'TEST 6: PMO of Org A cannot specify or switch to Org B context (Rejected 403)',
      JSON.stringify(crossTenantData)
    );

    // Also verify that without malicious ID, PMO Apex is strictly scoped to Apex Org
    const validTenantActionRes = await fetch(`${baseUrl}/security-test/tenant-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pmoToken}`,
      },
      body: JSON.stringify({ action: 'legitimate-action' }),
    });
    const validTenantActionData = await validTenantActionRes.json();

    assert(
      validTenantActionRes.status === 200 &&
      validTenantActionData.data.effectiveTenantId === pmoOrgId &&
      validTenantActionData.data.queryFilter.organizationId === pmoOrgId,
      'TEST 6b: Legitimate PMO action strictly locked to authenticated organizationId'
    );

    // ----------------------------------------------------
    // TEST 7: TEAM_MEMBER attempts administrative endpoint
    // ----------------------------------------------------
    const memberLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'member@apex.edu',
        password: 'MemberApex@123',
      }),
    });
    const memberLoginData = await memberLoginRes.json();
    const memberToken = memberLoginData.data.accessToken;

    const memberAdminRes = await fetch(`${baseUrl}/security-test/pmo-only`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    const memberAdminData = await memberAdminRes.json();

    assert(
      memberAdminRes.status === 403 &&
      memberAdminData.success === false &&
      memberAdminData.error.code === 'FORBIDDEN_ROLE',
      'TEST 7: TEAM_MEMBER attempting PMO administrative endpoint rejected with 403 Forbidden'
    );

    // ----------------------------------------------------
    // TEST 8: Inactive user attempts login
    // ----------------------------------------------------
    const inactiveLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inactive@apex.edu',
        password: 'Inactive@123',
      }),
    });
    const inactiveLoginData = await inactiveLoginRes.json();

    assert(
      inactiveLoginRes.status === 403 &&
      inactiveLoginData.success === false &&
      inactiveLoginData.error.code === 'ACCOUNT_INACTIVE',
      'TEST 8: Inactive user denied login with 403 ACCOUNT_INACTIVE'
    );

    // ----------------------------------------------------
    // TEST 8b: User belonging to Inactive Organization
    // ----------------------------------------------------
    const inactiveOrgLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@cobalt.edu',
        password: 'CobaltUser@123',
      }),
    });
    const inactiveOrgLoginData = await inactiveOrgLoginRes.json();

    assert(
      inactiveOrgLoginRes.status === 403 &&
      inactiveOrgLoginData.success === false &&
      inactiveOrgLoginData.error.code === 'ORGANIZATION_INACTIVE',
      'TEST 8b: User in suspended/inactive organization denied login with 403 ORGANIZATION_INACTIVE'
    );

    // ----------------------------------------------------
    // TEST 9: Logout & Token verification
    // ----------------------------------------------------
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pmoToken}`,
      },
    });
    const logoutData = await logoutRes.json();
    const logoutCookie = logoutRes.headers.get('set-cookie');

    assert(
      logoutRes.status === 200 &&
      logoutData.success === true &&
      Boolean(logoutCookie && (logoutCookie.includes('placement_refresh_token=;') || logoutCookie.includes('Max-Age=0'))),
      'TEST 9: Logout clears HTTP-only refresh token session cookie'
    );

    // ----------------------------------------------------
    // TEST 10: GET /api/auth/me verification
    // ----------------------------------------------------
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    const meData = await meRes.json();

    assert(
      meRes.status === 200 &&
      meData.success === true &&
      meData.data.email === 'member@apex.edu' &&
      meData.data.role === 'TEAM_MEMBER' &&
      meData.data.organization.name === 'Apex Security Test College' &&
      meData.data.passwordHash === undefined,
      'TEST 10: GET /api/auth/me returns safe profile and organization details'
    );

    // ----------------------------------------------------
    // TEST 11: SUPER_ADMIN global access verification
    // ----------------------------------------------------
    const saLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.superAdmin.email,
        password: config.superAdmin.password,
      }),
    });
    const saLoginData = await saLoginRes.json();
    const saToken = saLoginData.data.accessToken;

    const saProtectedRes = await fetch(`${baseUrl}/security-test/super-admin-only`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${saToken}`,
      },
    });

    const saTenantActionRes = await fetch(`${baseUrl}/security-test/tenant-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`,
      },
      body: JSON.stringify({
        organizationId: beaconOrgId, // Super Admin CAN specify organization filter
      }),
    });
    const saTenantActionData = await saTenantActionRes.json();

    assert(
      saLoginData.data.user.role === 'SUPER_ADMIN' &&
      saLoginData.data.user.organizationId === null &&
      saProtectedRes.status === 200 &&
      saTenantActionRes.status === 200 &&
      saTenantActionData.data.isGlobalScope === true &&
      saTenantActionData.data.effectiveTenantId === beaconOrgId,
      'TEST 11: SUPER_ADMIN has null organizationId, global scope, and can inspect specific tenant data'
    );

  } catch (err) {
    console.error('[Test Execution Error]', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n==================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
