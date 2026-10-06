import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsx from 'xlsx';

import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import companyService from '../services/company.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const runVerification = async () => {
  console.log('--- STARTING PMO CENTRAL COMPANY DATABASE & EXCEL EXPORT VERIFICATION ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_management';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', mongoUri.split('@').pop());

  let testOrg, testOrgB, pmoUser, tmUserA, tmUserB, comp1, comp2, comp3, compOrgB;

  try {
    const timestamp = Date.now().toString().slice(-8);

    // 1. Create Test Organization A & B
    testOrg = await Organization.create({
      name: 'PMO_CDB_TEST_ORG_A',
      code: `CDB_${timestamp}`,
      email: `cdb_org_${timestamp}@test.com`,
      isTest: true,
      status: 'ACTIVE',
    });

    testOrgB = await Organization.create({
      name: 'PMO_CDB_TEST_ORG_B',
      code: `CDBB_${timestamp}`,
      email: `cdbb_org_${timestamp}@test.com`,
      isTest: true,
      status: 'ACTIVE',
    });

    // 2. Create Users (PMO, Team Member A, Team Member B)
    pmoUser = await User.create({
      name: 'Central Database PMO Lead',
      email: `pmo_cdb_${timestamp}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'PMO',
      organizationId: testOrg._id,
      isTest: true,
    });

    tmUserA = await User.create({
      name: 'Rahul Sharma',
      email: `rahul_cdb_${timestamp}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'TEAM_MEMBER',
      organizationId: testOrg._id,
      isTest: true,
    });

    tmUserB = await User.create({
      name: 'Amit Kumar',
      email: `amit_cdb_${timestamp}@test.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      role: 'TEAM_MEMBER',
      organizationId: testOrg._id,
      isTest: true,
    });

    // 3. Create Companies from different sources
    comp1 = await Company.create({
      companyName: 'Acme Software Solutions',
      industry: 'Information Technology',
      city: 'Bangalore',
      organizationId: testOrg._id,
      createdBy: pmoUser._id,
      source: 'BULK_IMPORT',
      isTest: true,
    });

    comp2 = await Company.create({
      companyName: 'Beacon Financial Corp',
      industry: 'Finance',
      city: 'Mumbai',
      organizationId: testOrg._id,
      createdBy: pmoUser._id,
      source: 'MANUAL_PMO',
      isTest: true,
    });

    compC3: comp3 = await Company.create({
      companyName: 'CyberPulse Tech',
      industry: 'SaaS',
      city: 'Delhi',
      organizationId: testOrg._id,
      createdBy: tmUserA._id,
      source: 'TEAM_MEMBER_SELF_ADDED',
      isTest: true,
    });

    // Company belonging to Organization B (Tenant Boundary Test)
    compOrgB = await Company.create({
      companyName: 'Org B Secret Company',
      industry: 'Defense',
      organizationId: testOrgB._id,
      createdBy: pmoUser._id,
      source: 'MANUAL_PMO',
      isTest: true,
    });

    // 4. Create Primary Contacts
    await Contact.create({
      organizationId: testOrg._id,
      companyId: comp1._id,
      name: 'Suresh Raina',
      designation: 'Head HR',
      email: 'suresh@acmesoftware.com',
      isPrimary: true,
      isTest: true,
    });

    await Contact.create({
      organizationId: testOrg._id,
      companyId: comp3._id,
      name: 'Neha Gupta',
      designation: 'Talent Acquisition Manager',
      email: 'neha@cyberpulse.com',
      isPrimary: true,
      isTest: true,
    });

    // 5. Create Active Assignments
    await Assignment.create({
      companyId: comp1._id,
      assignedTo: tmUserA._id,
      assignedBy: pmoUser._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      isTest: true,
    });

    await Assignment.create({
      companyId: comp2._id,
      assignedTo: tmUserB._id,
      assignedBy: pmoUser._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      isTest: true,
    });

    await Assignment.create({
      companyId: comp3._id,
      assignedTo: tmUserA._id,
      assignedBy: tmUserA._id,
      organizationId: testOrg._id,
      status: 'ACTIVE',
      source: 'TEAM_MEMBER_SELF_ADDED',
      isTest: true,
    });

    // 6. Log Interactions & Follow-Ups
    const inter1 = await Interaction.create({
      companyId: comp1._id,
      organizationId: testOrg._id,
      userId: tmUserA._id,
      loggedBy: tmUserA._id,
      interactionType: 'PHONE_CALL',
      outcome: 'HIRING_NOW',
      notes: 'Initial call logged with Suresh Raina. Openings for React Developers.',
      callDetails: {
        hiringStatus: 'YES',
        openings: 5,
        profiles: ['React Developer', 'Node.js Developer'],
        workMode: 'HYBRID',
      },
      isTest: true,
    });

    const inter3 = await Interaction.create({
      companyId: comp3._id,
      organizationId: testOrg._id,
      userId: tmUserA._id,
      loggedBy: tmUserA._id,
      interactionType: 'PHONE_CALL',
      outcome: 'FOLLOW_UP_REQUIRED',
      notes: 'Spoke with Neha. Requested follow-up call tomorrow.',
      callDetails: {
        hiringStatus: 'HIRING_PLANNED',
        openings: 3,
        profiles: ['Fullstack Engineer'],
      },
      isTest: true,
    });

    const today = new Date();
    await FollowUp.create({
      companyId: comp3._id,
      interactionId: inter3._id,
      assignedTo: tmUserA._id,
      organizationId: testOrg._id,
      dueDate: today,
      reason: 'Call back Neha regarding JD details',
      status: 'PENDING',
      isTest: true,
    });

    console.log('Created test organization, users, companies, assignments, contacts, interactions, and follow-ups.');

    // 7. Verify PMO Central Company Database Query
    const pmoContext = {
      id: pmoUser._id.toString(),
      _id: pmoUser._id,
      name: pmoUser.name,
      email: pmoUser.email,
      role: pmoUser.role,
      organizationId: testOrg._id,
    };

    let listRes = await companyService.getCompanies(pmoContext, {});

    if (listRes.data.length !== 3) {
      throw new Error(`Expected 3 companies in central database, got ${listRes.data.length}`);
    }
    console.log('✓ Central Company Database returned all 3 organization companies.');

    // Verify metadata counts
    const counts = listRes.meta.counts;
    if (
      counts.totalCompanies !== 3 ||
      counts.assigned !== 3 ||
      counts.unassigned !== 0 ||
      counts.contacted !== 2 ||
      counts.toContact !== 1 ||
      counts.followUpDue !== 1
    ) {
      throw new Error(`Metadata counts mismatch! Got: ${JSON.stringify(counts)}`);
    }
    console.log('✓ KPI Metadata counts verified:', counts);

    // Verify Source Filter
    let sourceRes = await companyService.getCompanies(pmoContext, { source: 'BULK_IMPORT' });
    if (sourceRes.data.length !== 1 || sourceRes.data[0].companyName !== 'Acme Software Solutions') {
      throw new Error(`Source filter BULK_IMPORT failed! Got ${sourceRes.data.length} records.`);
    }

    sourceRes = await companyService.getCompanies(pmoContext, { source: 'TEAM_MEMBER_SELF_ADDED' });
    if (sourceRes.data.length !== 1 || sourceRes.data[0].companyName !== 'CyberPulse Tech') {
      throw new Error(`Source filter TEAM_MEMBER_SELF_ADDED failed! Got ${sourceRes.data.length} records.`);
    }
    console.log('✓ Source filters (BULK_IMPORT & TEAM_MEMBER_SELF_ADDED) verified.');

    // Verify Outreach Status Filter
    let outreachRes = await companyService.getCompanies(pmoContext, { outreachStatus: 'TO_CONTACT' });
    if (outreachRes.data.length !== 1 || outreachRes.data[0].companyName !== 'Beacon Financial Corp') {
      throw new Error(`Outreach filter TO_CONTACT failed! Got ${outreachRes.data.length} records.`);
    }

    outreachRes = await companyService.getCompanies(pmoContext, { outreachStatus: 'FOLLOW_UP_DUE' });
    if (outreachRes.data.length !== 1 || outreachRes.data[0].companyName !== 'CyberPulse Tech') {
      throw new Error(`Outreach filter FOLLOW_UP_DUE failed! Got ${outreachRes.data.length} records.`);
    }
    console.log('✓ Outreach status filters (TO_CONTACT & FOLLOW_UP_DUE) verified.');

    // Verify AssignedTo Filter
    let assignRes = await companyService.getCompanies(pmoContext, { assignedTo: tmUserA._id.toString() });
    if (assignRes.data.length !== 2) {
      throw new Error(`AssignedTo filter failed! Expected 2 companies assigned to Rahul Sharma, got ${assignRes.data.length}`);
    }
    console.log('✓ AssignedTo team member filter verified.');

    // Verify Search Filter
    let searchRes = await companyService.getCompanies(pmoContext, { search: 'Suresh' });
    if (searchRes.data.length !== 1 || searchRes.data[0].companyName !== 'Acme Software Solutions') {
      throw new Error(`Search filter failed! Expected Acme Software Solutions for contact search 'Suresh', got ${searchRes.data.length}`);
    }
    console.log('✓ Global search filter across HR contacts verified.');

    // 8. Verify Excel Export (.xlsx)
    const exportResult = await companyService.exportCompanies(pmoContext, {
      exportScope: 'ALL',
      includeHistory: true,
    });

    if (!exportResult.buffer || !(exportResult.buffer instanceof Buffer) || exportResult.buffer.length === 0) {
      throw new Error('Export result buffer is invalid or empty!');
    }

    const workbook = xlsx.read(exportResult.buffer, { type: 'buffer' });
    if (!workbook.SheetNames.includes('Companies') || !workbook.SheetNames.includes('Outreach History')) {
      throw new Error(`Workbook missing required sheets! Got: ${workbook.SheetNames.join(', ')}`);
    }

    const companiesSheetData = xlsx.utils.sheet_to_json(workbook.Sheets['Companies']);
    if (companiesSheetData.length !== 3) {
      throw new Error(`Excel Sheet 'Companies' expected 3 rows, got ${companiesSheetData.length}`);
    }

    const historySheetData = xlsx.utils.sheet_to_json(workbook.Sheets['Outreach History']);
    if (historySheetData.length !== 2) {
      throw new Error(`Excel Sheet 'Outreach History' expected 2 rows, got ${historySheetData.length}`);
    }

    // Verify row details in Excel sheet
    const acmeRow = companiesSheetData.find((r) => r['Company Name'] === 'Acme Software Solutions');
    if (!acmeRow || acmeRow['Source'] !== 'Bulk Import' || acmeRow['Primary HR Name'] !== 'Suresh Raina' || acmeRow['Latest Hiring Status'] !== 'YES') {
      throw new Error(`Excel export row content mismatch for Acme Software Solutions: ${JSON.stringify(acmeRow)}`);
    }

    const cyberRow = companiesSheetData.find((r) => r['Company Name'] === 'CyberPulse Tech');
    if (!cyberRow || cyberRow['Source'] !== 'Team Member Self-Added' || cyberRow['Registered By'] !== 'Rahul Sharma') {
      throw new Error(`Excel export row content mismatch for CyberPulse Tech: ${JSON.stringify(cyberRow)}`);
    }

    console.log('✓ Excel export (.xlsx) generated successfully with 2 worksheets (Companies & Outreach History).');
    console.log('✓ Excel content verified for Acme Software Solutions and CyberPulse Tech.');

    // 9. Verify Tenant Isolation
    const tenantCompanyIds = listRes.data.map((c) => c.id);
    if (tenantCompanyIds.includes(compOrgB._id.toString())) {
      throw new Error('TENANT ISOLATION FAILURE: PMO was able to view Organization B company!');
    }
    console.log('✓ Strict tenant isolation verified: Organization B company hidden from PMO.');

    console.log('--- PMO CENTRAL COMPANY DATABASE & EXCEL EXPORT VERIFICATION PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    if (testOrg) {
      await FollowUp.deleteMany({ organizationId: testOrg._id });
      await Interaction.deleteMany({ organizationId: testOrg._id });
      await Assignment.deleteMany({ organizationId: testOrg._id });
      await Contact.deleteMany({ organizationId: testOrg._id });
      await Company.deleteMany({ organizationId: testOrg._id });
      await User.deleteMany({ organizationId: testOrg._id });
      await Organization.deleteOne({ _id: testOrg._id });
    }
    if (testOrgB) {
      await Company.deleteMany({ organizationId: testOrgB._id });
      await Organization.deleteOne({ _id: testOrgB._id });
    }
    console.log('Cleaned up test data.');
    await mongoose.disconnect();
  }
};

runVerification();
