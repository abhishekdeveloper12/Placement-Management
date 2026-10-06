import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import AuditLog from '../models/AuditLog.js';
import app from '../app.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_management_test';

let server;
let baseUrl;

// Test variables
let tokenSuperAdmin;
let tokenPmoOrgA;
let tokenPmoOrgB;
let tokenTeamMemberOrgA;

let orgA;
let orgB;
let companyOrgA;
let companyOrgB;

async function request(method, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const reqOptions = {
    method: method.toUpperCase(),
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = { raw: body };
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function setupTestEnvironment() {
  await mongoose.connect(MONGODB_URI);
  console.log('[Database] Connected to MongoDB test database.');

  // Clean test data
  await Promise.all([
    Organization.deleteMany({ code: { $in: ['TEST_COMPANY_ORG_A', 'TEST_COMPANY_ORG_B'] } }),
    User.deleteMany({ email: { $regex: /@companytest\.edu$/ } }),
    Company.deleteMany({}),
    Contact.deleteMany({}),
    AuditLog.deleteMany({ action: { $regex: /^COMPANY_/ } }),
  ]);

  // Create Organizations
  orgA = await Organization.create({
    name: 'Company Test Institute A',
    code: 'TEST_COMPANY_ORG_A',
    email: 'contact@companytestA.edu',
    status: 'ACTIVE',
  });

  orgB = await Organization.create({
    name: 'Company Test Institute B',
    code: 'TEST_COMPANY_ORG_B',
    email: 'contact@companytestB.edu',
    status: 'ACTIVE',
  });

  // Create Users
  const superAdmin = await User.create({
    name: 'Super Admin Tester',
    email: 'superadmin@companytest.edu',
    passwordHash: await User.hashPassword('Password123!'),
    role: 'SUPER_ADMIN',
    organizationId: null,
    status: 'ACTIVE',
  });

  const pmoA = await User.create({
    name: 'PMO Org A Tester',
    email: 'pmoA@companytest.edu',
    passwordHash: await User.hashPassword('Password123!'),
    role: 'PMO',
    organizationId: orgA._id,
    status: 'ACTIVE',
  });

  const pmoB = await User.create({
    name: 'PMO Org B Tester',
    email: 'pmoB@companytest.edu',
    passwordHash: await User.hashPassword('Password123!'),
    role: 'PMO',
    organizationId: orgB._id,
    status: 'ACTIVE',
  });

  const memberA = await User.create({
    name: 'Team Member Org A Tester',
    email: 'memberA@companytest.edu',
    passwordHash: await User.hashPassword('Password123!'),
    role: 'TEAM_MEMBER',
    organizationId: orgA._id,
    status: 'ACTIVE',
  });

  // Start Express Test App
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      console.log(`[Test Server] Running at ${baseUrl}`);
      resolve();
    });
  });

  // Log in users to get tokens
  const resSA = await request('post', '/auth/login', {
    body: { email: superAdmin.email, password: 'Password123!' },
  });
  tokenSuperAdmin = resSA.body.data.accessToken;

  const resPmoA = await request('post', '/auth/login', {
    body: { email: pmoA.email, password: 'Password123!' },
  });
  tokenPmoOrgA = resPmoA.body.data.accessToken;

  const resPmoB = await request('post', '/auth/login', {
    body: { email: pmoB.email, password: 'Password123!' },
  });
  tokenPmoOrgB = resPmoB.body.data.accessToken;

  const resMemA = await request('post', '/auth/login', {
    body: { email: memberA.email, password: 'Password123!' },
  });
  tokenTeamMemberOrgA = resMemA.body.data.accessToken;
}

async function runTests() {
  console.log('\n====================================================');
  console.log('  COMPANY MASTER & TENANT ISOLATION TEST SUITE      ');
  console.log('====================================================\n');

  try {
    await setupTestEnvironment();

    // ----------------------------------------------------
    // TEST 1: Unauthenticated request rejected
    // ----------------------------------------------------
    const res1 = await request('get', '/companies');
    if (res1.status === 401) {
      console.log('[01] ✔ PASS Authorization: Unauthenticated request rejected with 401');
    } else {
      console.error('[01] ✘ FAIL Authorization: Unauthenticated request failed', res1);
    }

    // ----------------------------------------------------
    // TEST 2: TEAM_MEMBER role rejected on Company Master
    // ----------------------------------------------------
    const res2 = await request('get', '/companies', { token: tokenTeamMemberOrgA });
    if (res2.status === 403 && res2.body.error?.code === 'FORBIDDEN_ROLE') {
      console.log('[02] ✔ PASS Authorization: TEAM_MEMBER role rejected with 403 Forbidden');
    } else {
      console.error('[02] ✘ FAIL Authorization: TEAM_MEMBER role failed', res2);
    }

    // ----------------------------------------------------
    // TEST 3: PMO creates Company in own organization
    // ----------------------------------------------------
    const res3 = await request('post', '/companies', {
      token: tokenPmoOrgA,
      body: {
        companyName: 'Acme Technologies Pvt. Ltd.',
        industry: 'Information Technology',
        website: 'https://www.acme-tech.com',
        linkedin: 'https://linkedin.com/company/acme-tech',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        remarks: 'Key corporate recruiter',
        primaryContact: {
          name: 'Sarah Connor',
          designation: 'Head of Talent',
          email: 'sarah@acme-tech.com',
          phone: '+91 98765 43210',
        },
      },
    });

    if (res3.status === 201 && res3.body.data.companyName === 'Acme Technologies Pvt. Ltd.') {
      companyOrgA = res3.body.data;
      console.log('[03] ✔ PASS Create Company: PMO creates company with primary contact in own organization');
    } else {
      console.error('[03] ✘ FAIL Create Company: PMO create failed', res3);
    }

    // ----------------------------------------------------
    // TEST 4: PMO spoofing organizationId is locked to own org
    // ----------------------------------------------------
    const res4 = await request('post', '/companies', {
      token: tokenPmoOrgA,
      body: {
        companyName: 'Spoofed Tenant Company',
        organizationId: orgB._id.toString(), // Attacker tries to inject Org B
        industry: 'Finance',
      },
    });

    if (
      res4.status === 201 &&
      (res4.body.data.organizationId.id || res4.body.data.organizationId) === orgA._id.toString()
    ) {
      console.log('[04] ✔ PASS Multi-Tenant Protection: Client-supplied organizationId is strictly overridden with PMO tenant');
    } else {
      console.error('[04] ✘ FAIL Multi-Tenant Protection: Spoofing organizationId succeeded or failed incorrectly', res4);
    }

    // ----------------------------------------------------
    // TEST 5: Duplicate company name prevention within same organization
    // ----------------------------------------------------
    const res5 = await request('post', '/companies', {
      token: tokenPmoOrgA,
      body: {
        companyName: '  ACME Technologies Pvt. Ltd. ', // Same normalized name
        industry: 'Software',
      },
    });

    if (res5.status === 409 && res5.body.error?.code === 'DUPLICATE_COMPANY') {
      console.log('[05] ✔ PASS Validation: Duplicate normalized company name within same organization rejected with 409');
    } else {
      console.error('[05] ✘ FAIL Validation: Duplicate company name check failed', res5);
    }

    // ----------------------------------------------------
    // TEST 6: Same company name in DIFFERENT organization is ALLOWED
    // ----------------------------------------------------
    const res6 = await request('post', '/companies', {
      token: tokenPmoOrgB,
      body: {
        companyName: 'Acme Technologies Pvt. Ltd.', // Same name, but Org B!
        industry: 'Software',
      },
    });

    if (res6.status === 201) {
      companyOrgB = res6.body.data;
      console.log('[06] ✔ PASS Tenant Boundary: Same company name across different organizations is allowed');
    } else {
      console.error('[06] ✘ FAIL Tenant Boundary: Cross-org same name creation failed', res6);
    }

    // ----------------------------------------------------
    // TEST 7: Duplicate website prevention within same organization
    // ----------------------------------------------------
    const res7 = await request('post', '/companies', {
      token: tokenPmoOrgA,
      body: {
        companyName: 'Acme Software Solutions',
        website: 'https://acme-tech.com/', // Duplicate website normalized
      },
    });

    if (res7.status === 409 && res7.body.error?.code === 'DUPLICATE_COMPANY_WEBSITE') {
      console.log('[07] ✔ PASS Validation: Duplicate website URL within same organization rejected with 409');
    } else {
      console.error('[07] ✘ FAIL Validation: Duplicate website check failed', res7);
    }

    // ----------------------------------------------------
    // TEST 8: PMO Tenant Isolation on Company List
    // ----------------------------------------------------
    const res8 = await request('get', '/companies', { token: tokenPmoOrgA });
    if (res8.status === 200 && res8.body.data.every((c) => (c.organizationId.id || c.organizationId) === orgA._id.toString())) {
      console.log('[08] ✔ PASS Tenant Isolation: PMO company list query returns strictly own organization companies');
    } else {
      console.error('[08] ✘ FAIL Tenant Isolation: PMO company list leaked other org companies', res8);
    }

    // ----------------------------------------------------
    // TEST 9: Cross-Tenant Detail Lookup (404 Resource Hiding)
    // ----------------------------------------------------
    const res9 = await request('get', `/companies/${companyOrgB.id}`, { token: tokenPmoOrgA });
    if (res9.status === 404 && res9.body.error?.code === 'COMPANY_NOT_FOUND') {
      console.log('[09] ✔ PASS Resource Hiding: PMO of Org A requesting Org B company returns 404 Not Found');
    } else {
      console.error('[09] ✘ FAIL Resource Hiding: PMO accessed Org B company detail', res9);
    }

    // ----------------------------------------------------
    // TEST 10: Cross-Tenant Mutation Attempt (404 Resource Hiding)
    // ----------------------------------------------------
    const res10 = await request('patch', `/companies/${companyOrgB.id}`, {
      token: tokenPmoOrgA,
      body: { companyName: 'Hacked Company Name' },
    });
    if (res10.status === 404 && res10.body.error?.code === 'COMPANY_NOT_FOUND') {
      console.log('[10] ✔ PASS Resource Hiding: PMO of Org A attempting to update Org B company rejected with 404');
    } else {
      console.error('[10] ✘ FAIL Resource Hiding: PMO mutated Org B company', res10);
    }

    // ----------------------------------------------------
    // TEST 11: Super Admin Global Access & Filtering
    // ----------------------------------------------------
    const res11a = await request('get', '/companies', { token: tokenSuperAdmin });
    const res11b = await request('get', `/companies?organizationId=${orgA._id}`, { token: tokenSuperAdmin });

    if (
      res11a.status === 200 &&
      res11a.body.data.length >= 2 &&
      res11b.status === 200 &&
      res11b.body.data.every((c) => (c.organizationId.id || c.organizationId) === orgA._id.toString())
    ) {
      console.log('[11] ✔ PASS Super Admin: Global company access and organization filtering verified');
    } else {
      console.error('[11] ✘ FAIL Super Admin: Global listing/filtering failed', { res11a, res11b });
    }

    // ----------------------------------------------------
    // TEST 12: Super Admin Create Company with explicit target org
    // ----------------------------------------------------
    const res12 = await request('post', '/companies', {
      token: tokenSuperAdmin,
      body: {
        organizationId: orgB._id.toString(),
        companyName: 'Global Enterprise Corp',
        industry: 'Consulting',
        city: 'Mumbai',
      },
    });

    if (res12.status === 201 && (res12.body.data.organizationId.id || res12.body.data.organizationId) === orgB._id.toString()) {
      console.log('[12] ✔ PASS Super Admin: Created company for specific organization successfully');
    } else {
      console.error('[12] ✘ FAIL Super Admin: Create company failed', res12);
    }

    // ----------------------------------------------------
    // TEST 13: Update Company & Primary Contact
    // ----------------------------------------------------
    const res13 = await request('patch', `/companies/${companyOrgA.id}`, {
      token: tokenPmoOrgA,
      body: {
        city: 'Gurgaon',
        remarks: 'Updated location after campus review',
        primaryContact: {
          name: 'Sarah Connor',
          designation: 'VP of HR',
          email: 'sarah.vphr@acme-tech.com',
          phone: '+91 99999 88888',
        },
      },
    });

    if (res13.status === 200 && res13.body.data.city === 'Gurgaon' && res13.body.data.primaryContact?.designation === 'VP of HR') {
      console.log('[13] ✔ PASS Update Company: Updated company fields and primary HR contact successfully');
    } else {
      console.error('[13] ✘ FAIL Update Company: Update failed', res13);
    }

    // ----------------------------------------------------
    // TEST 14: Status Toggle (Deactivate & Reactivate)
    // ----------------------------------------------------
    const res14a = await request('patch', `/companies/${companyOrgA.id}/status`, {
      token: tokenPmoOrgA,
      body: { status: 'INACTIVE' },
    });
    const res14b = await request('patch', `/companies/${companyOrgA.id}/status`, {
      token: tokenPmoOrgA,
      body: { status: 'ACTIVE' },
    });

    if (res14a.status === 200 && res14a.body.data.status === 'INACTIVE' && res14b.status === 200 && res14b.body.data.status === 'ACTIVE') {
      console.log('[14] ✔ PASS Status Management: Deactivated and reactivated company successfully');
    } else {
      console.error('[14] ✘ FAIL Status Management: Status toggle failed', { res14a, res14b });
    }

    // ----------------------------------------------------
    // TEST 15: Search & Filter Verification
    // ----------------------------------------------------
    const res15 = await request('get', '/companies?search=Gurgaon&status=ACTIVE', { token: tokenPmoOrgA });
    if (res15.status === 200 && res15.body.data.length === 1 && res15.body.data[0].id === companyOrgA.id) {
      console.log('[15] ✔ PASS Search & Filter: Search substring and status query options return correct company');
    } else {
      console.error('[15] ✘ FAIL Search & Filter: Query failed', res15);
    }

    // ----------------------------------------------------
    // TEST 16: Audit Logging Verification
    // ----------------------------------------------------
    const auditLogs = await AuditLog.find({
      entityType: 'Company',
      organizationId: orgA._id,
    });

    const actions = auditLogs.map((log) => log.action);
    if (
      actions.includes('COMPANY_CREATED') &&
      actions.includes('COMPANY_UPDATED') &&
      actions.includes('COMPANY_DEACTIVATED') &&
      actions.includes('COMPANY_ACTIVATED')
    ) {
      console.log('[16] ✔ PASS Audit Logging: Verified AuditLog records for company creation, updates, and status toggles');
    } else {
      console.error('[16] ✘ FAIL Audit Logging: Missing audit log actions', actions);
    }
  } catch (err) {
    console.error('Unhandled Test Execution Error:', err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('\n====================================================');
    console.log('  Company Master Test Suite Complete                ');
    console.log('====================================================\n');
  }
}

runTests();
