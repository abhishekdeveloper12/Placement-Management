import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import StorageService from './storage.service.js';

class DataManagementService {
  /**
   * Retrieves database counts comparing Real Data (isTestData !== true) vs Test Data (isTestData === true)
   */
  async getDataSummary() {
    const isRealQuery = { isTestData: { $ne: true } };
    const isTestQuery = { isTestData: true };

    const [
      realOrgs, testOrgs,
      realUsers, testUsers,
      realCompanies, testCompanies,
      realContacts, testContacts,
      realAssignments, testAssignments,
      realInteractions, testInteractions,
      realFollowUps, testFollowUps,
      realOpportunities, testOpportunities,
      realDocuments, testDocuments,
      realNotifications, testNotifications,
      realAuditLogs, testAuditLogs,
    ] = await Promise.all([
      Organization.countDocuments(isRealQuery),
      Organization.countDocuments(isTestQuery),
      User.countDocuments(isRealQuery),
      User.countDocuments(isTestQuery),
      Company.countDocuments(isRealQuery),
      Company.countDocuments(isTestQuery),
      Contact.countDocuments(isRealQuery),
      Contact.countDocuments(isTestQuery),
      Assignment.countDocuments(isRealQuery),
      Assignment.countDocuments(isTestQuery),
      Interaction.countDocuments(isRealQuery),
      Interaction.countDocuments(isTestQuery),
      FollowUp.countDocuments(isRealQuery),
      FollowUp.countDocuments(isTestQuery),
      JobOpportunity.countDocuments(isRealQuery),
      JobOpportunity.countDocuments(isTestQuery),
      Document.countDocuments(isRealQuery),
      Document.countDocuments(isTestQuery),
      Notification.countDocuments(isRealQuery),
      Notification.countDocuments(isTestQuery),
      AuditLog.countDocuments(isRealQuery),
      AuditLog.countDocuments(isTestQuery),
    ]);

    return {
      realData: {
        organizations: realOrgs,
        users: realUsers,
        companies: realCompanies,
        contacts: realContacts,
        assignments: realAssignments,
        interactions: realInteractions,
        followUps: realFollowUps,
        opportunities: realOpportunities,
        documents: realDocuments,
        notifications: realNotifications,
        auditLogs: realAuditLogs,
      },
      testData: {
        organizations: testOrgs,
        users: testUsers,
        companies: testCompanies,
        contacts: testContacts,
        assignments: testAssignments,
        interactions: testInteractions,
        followUps: testFollowUps,
        opportunities: testOpportunities,
        documents: testDocuments,
        notifications: testNotifications,
        auditLogs: testAuditLogs,
      },
    };
  }

  /**
   * Fetches paginated test data records with explicit isTestData === true check
   */
  async getTestDataRecords({ entityType = 'all', page = 1, limit = 25, search = '' }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const baseTestQuery = { isTestData: true };

    let items = [];
    let total = 0;

    switch (entityType.toLowerCase()) {
      case 'organizations': {
        const query = { ...baseTestQuery };
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
          ];
        }
        total = await Organization.countDocuments(query);
        const docs = await Organization.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'Organization',
          title: d.name,
          subtitle: `Code: ${d.code} | Email: ${d.email}`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      case 'users': {
        const query = { ...baseTestQuery };
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ];
        }
        total = await User.countDocuments(query);
        const docs = await User.find(query).populate('organizationId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'User',
          title: d.name,
          subtitle: `${d.role} | ${d.email} ${d.organizationId?.name ? `(${d.organizationId.name})` : ''}`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      case 'companies': {
        const query = { ...baseTestQuery };
        if (search) {
          query.$or = [
            { companyName: { $regex: search, $options: 'i' } },
            { industry: { $regex: search, $options: 'i' } },
          ];
        }
        total = await Company.countDocuments(query);
        const docs = await Company.find(query).populate('organizationId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'Company',
          title: d.companyName,
          subtitle: `${d.industry || 'N/A'} | ${d.city || 'N/A'} ${d.organizationId?.name ? `(${d.organizationId.name})` : ''}`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      case 'interactions': {
        total = await Interaction.countDocuments(baseTestQuery);
        const docs = await Interaction.find(baseTestQuery).populate('companyId', 'companyName').populate('userId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'Interaction',
          title: `${d.interactionType} - ${d.outcome}`,
          subtitle: `Company: ${d.companyId?.companyName || 'N/A'} | Logged by: ${d.userId?.name || 'N/A'}`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      case 'followups': {
        total = await FollowUp.countDocuments(baseTestQuery);
        const docs = await FollowUp.find(baseTestQuery).populate('companyId', 'companyName').populate('assignedTo', 'name').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'FollowUp',
          title: `Follow-Up (${d.status})`,
          subtitle: `Company: ${d.companyId?.companyName || 'N/A'} | Due: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'N/A'}`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      case 'opportunities': {
        total = await JobOpportunity.countDocuments(baseTestQuery);
        const docs = await JobOpportunity.find(baseTestQuery).populate('companyId', 'companyName').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
        items = docs.map((d) => ({
          id: d._id.toString(),
          entityType: 'JobOpportunity',
          title: d.title,
          subtitle: `Company: ${d.companyId?.companyName || 'N/A'} | ${d.opportunityType} (${d.hiringStatus})`,
          createdAt: d.createdAt,
          isTestData: true,
        }));
        break;
      }

      default: {
        // Combined list across test entities
        const [orgs, users, comps, opps] = await Promise.all([
          Organization.find(baseTestQuery).sort({ createdAt: -1 }).limit(10),
          User.find(baseTestQuery).sort({ createdAt: -1 }).limit(10),
          Company.find(baseTestQuery).sort({ createdAt: -1 }).limit(10),
          JobOpportunity.find(baseTestQuery).sort({ createdAt: -1 }).limit(10),
        ]);

        const combined = [
          ...orgs.map((d) => ({ id: d._id.toString(), entityType: 'Organization', title: d.name, subtitle: `Code: ${d.code}`, createdAt: d.createdAt, isTestData: true })),
          ...users.map((d) => ({ id: d._id.toString(), entityType: 'User', title: d.name, subtitle: `${d.role} (${d.email})`, createdAt: d.createdAt, isTestData: true })),
          ...comps.map((d) => ({ id: d._id.toString(), entityType: 'Company', title: d.companyName, subtitle: d.industry || 'Company', createdAt: d.createdAt, isTestData: true })),
          ...opps.map((d) => ({ id: d._id.toString(), entityType: 'JobOpportunity', title: d.title, subtitle: d.opportunityType, createdAt: d.createdAt, isTestData: true })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        total = combined.length;
        items = combined.slice(skip, skip + limitNum);
        break;
      }
    }

    return {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Performs safe dependency-aware deletion of ONLY records explicitly marked isTestData === true
   */
  async deleteTestData({ target = 'ALL', ids = [], organizationId = null, entityType = null }, performingUser) {
    if (!performingUser || performingUser.role !== 'SUPER_ADMIN') {
      const error = new Error('Access denied: Only Super Admin can perform test data deletion');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const testFilter = { isTestData: true };
    const deletedCounts = {
      organizations: 0,
      users: 0,
      companies: 0,
      contacts: 0,
      assignments: 0,
      interactions: 0,
      followUps: 0,
      opportunities: 0,
      documents: 0,
      notifications: 0,
      auditLogs: 0,
    };

    if (target === 'ALL') {
      // 1. Delete all test Documents & physical files
      const testDocs = await Document.find(testFilter);
      for (const doc of testDocs) {
        if (doc.storageKey) {
          try {
            await StorageService.deleteFile(doc.storageKey);
          } catch (e) {
            console.warn(`[DeleteTestData] Failed to remove physical file ${doc.storageKey}: ${e.message}`);
          }
        }
      }
      deletedCounts.documents = (await Document.deleteMany(testFilter)).deletedCount;

      // 2. Delete test child records
      deletedCounts.notifications = (await Notification.deleteMany(testFilter)).deletedCount;
      deletedCounts.followUps = (await FollowUp.deleteMany(testFilter)).deletedCount;
      deletedCounts.interactions = (await Interaction.deleteMany(testFilter)).deletedCount;
      deletedCounts.opportunities = (await JobOpportunity.deleteMany(testFilter)).deletedCount;
      deletedCounts.assignments = (await Assignment.deleteMany(testFilter)).deletedCount;
      deletedCounts.contacts = (await Contact.deleteMany(testFilter)).deletedCount;
      deletedCounts.companies = (await Company.deleteMany(testFilter)).deletedCount;
      deletedCounts.auditLogs = (await AuditLog.deleteMany(testFilter)).deletedCount;

      // 3. Delete test users (EXPLICIT SAFETY: never delete performing user or Super Admin)
      const userDeleteFilter = {
        isTestData: true,
        _id: { $ne: performingUser._id },
        email: { $ne: 'superadmin@placementmanagement.local' },
      };
      deletedCounts.users = (await User.deleteMany(userDeleteFilter)).deletedCount;

      // 4. Delete test organizations
      deletedCounts.organizations = (await Organization.deleteMany(testFilter)).deletedCount;

    } else if (target === 'ORGANIZATION' && organizationId) {
      // Target specific test organization & its test dependencies
      const testOrg = await Organization.findOne({ _id: organizationId, isTestData: true });
      if (!testOrg) {
        const error = new Error('Test organization not found or is real production data');
        error.statusCode = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
      }

      const orgTestFilter = { organizationId: testOrg._id, isTestData: true };

      // Delete linked files
      const testDocs = await Document.find(orgTestFilter);
      for (const doc of testDocs) {
        if (doc.storageKey) {
          try { await StorageService.deleteFile(doc.storageKey); } catch (e) {}
        }
      }

      deletedCounts.documents = (await Document.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.notifications = (await Notification.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.followUps = (await FollowUp.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.interactions = (await Interaction.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.opportunities = (await JobOpportunity.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.assignments = (await Assignment.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.contacts = (await Contact.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.companies = (await Company.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.auditLogs = (await AuditLog.deleteMany(orgTestFilter)).deletedCount;
      deletedCounts.users = (await User.deleteMany({ organizationId: testOrg._id, isTestData: true })).deletedCount;

      await Organization.deleteOne({ _id: testOrg._id, isTestData: true });
      deletedCounts.organizations = 1;

    } else if (target === 'SELECTED' && Array.isArray(ids) && ids.length > 0 && entityType) {
      const selectedFilter = { _id: { $in: ids }, isTestData: true };

      switch (entityType.toLowerCase()) {
        case 'organizations': {
          for (const orgId of ids) {
            const res = await this.deleteTestData({ target: 'ORGANIZATION', organizationId: orgId }, performingUser);
            Object.keys(deletedCounts).forEach((k) => {
              deletedCounts[k] += res.deletedCounts[k] || 0;
            });
          }
          break;
        }
        case 'users': {
          // Never delete Super Admin
          deletedCounts.users = (await User.deleteMany({
            _id: { $in: ids, $ne: performingUser._id },
            email: { $ne: 'superadmin@placementmanagement.local' },
            isTestData: true,
          })).deletedCount;
          break;
        }
        case 'companies': {
          // Delete child records for selected test companies
          const compFilter = { companyId: { $in: ids }, isTestData: true };
          deletedCounts.notifications = (await Notification.deleteMany(compFilter)).deletedCount;
          deletedCounts.followUps = (await FollowUp.deleteMany(compFilter)).deletedCount;
          deletedCounts.interactions = (await Interaction.deleteMany(compFilter)).deletedCount;
          deletedCounts.opportunities = (await JobOpportunity.deleteMany(compFilter)).deletedCount;
          deletedCounts.assignments = (await Assignment.deleteMany(compFilter)).deletedCount;
          deletedCounts.contacts = (await Contact.deleteMany(compFilter)).deletedCount;
          deletedCounts.companies = (await Company.deleteMany(selectedFilter)).deletedCount;
          break;
        }
        case 'interactions':
          deletedCounts.interactions = (await Interaction.deleteMany(selectedFilter)).deletedCount;
          break;
        case 'followups':
          deletedCounts.followUps = (await FollowUp.deleteMany(selectedFilter)).deletedCount;
          break;
        case 'opportunities':
          deletedCounts.opportunities = (await JobOpportunity.deleteMany(selectedFilter)).deletedCount;
          break;
        default:
          break;
      }
    }

    // Record immutable audit log entry for test data deletion (isTestData = false so it is preserved!)
    await AuditLog.create({
      organizationId: null,
      performedBy: performingUser._id,
      action: 'TEST_DATA_DELETED',
      entityType: 'DATA_MANAGEMENT',
      metadata: {
        target,
        deletedCounts,
        timestamp: new Date().toISOString(),
      },
      isTestData: false,
    });

    return {
      message: 'Test data deleted successfully. Real production data was preserved untouched.',
      deletedCounts,
    };
  }
}

export default new DataManagementService();
