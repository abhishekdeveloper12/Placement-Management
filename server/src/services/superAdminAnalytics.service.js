import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import pmoAnalyticsService from './pmoAnalytics.service.js';

class SuperAdminAnalyticsService {
  /**
   * Helper to parse date range boundaries for global analytics
   */
  parseDateRange(dateRange = '30d', startDateStr, endDateStr) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);

    if (dateRange === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else if (dateRange === 'all') {
      startDate = new Date(0);
    } else if (dateRange === 'custom' && startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  /**
   * 1. Global Dashboard Analytics (Platform-wide)
   */
  async getGlobalDashboardAnalytics({ dateRange, startDate, endDate }) {
    const { startDate: parsedStart, endDate: parsedEnd } = this.parseDateRange(dateRange, startDate, endDate);

    // 1. Organizations KPI
    const [totalOrganizations, activeOrganizations, inactiveOrganizations] = await Promise.all([
      Organization.countDocuments({}),
      Organization.countDocuments({ status: 'ACTIVE' }),
      Organization.countDocuments({ status: 'INACTIVE' }),
    ]);

    // 2. Users KPI
    const [totalUsers, totalPmos, totalTeamMembers] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'PMO' }),
      User.countDocuments({ role: 'TEAM_MEMBER' }),
    ]);

    // 3. Companies KPI
    const [totalCompanies, distinctAssignedIds, distinctContactedIds] = await Promise.all([
      Company.countDocuments({ status: { $ne: 'INACTIVE' } }),
      Assignment.distinct('companyId', { status: 'ACTIVE' }),
      Interaction.distinct('companyId'),
    ]);

    const assignedCompanies = distinctAssignedIds.length;
    const unassignedCompanies = Math.max(0, totalCompanies - assignedCompanies);
    const contactedCompanies = distinctContactedIds.length;

    // 4. Hiring KPI
    const [totalOpportunities, currentlyHiring, hiringPlanned, shortlistedOpportunities] = await Promise.all([
      JobOpportunity.countDocuments({}),
      JobOpportunity.countDocuments({ hiringStatus: 'HIRING_NOW' }),
      JobOpportunity.countDocuments({ hiringStatus: 'HIRING_PLANNED' }),
      JobOpportunity.countDocuments({ isShortlisted: true }),
    ]);

    // 5. Organization Performance Table
    const organizations = await Organization.find({}).sort({ name: 1 });

    const organizationPerformance = await Promise.all(
      organizations.map(async (org) => {
        const orgIdStr = org._id.toString();

        const [
          companiesCount,
          assignedIds,
          contactedIds,
          hiringCount,
          shortlistedCount,
          teamMembersCount,
          pmosCount,
        ] = await Promise.all([
          Company.countDocuments({ organizationId: org._id, status: { $ne: 'INACTIVE' } }),
          Assignment.distinct('companyId', { organizationId: org._id, status: 'ACTIVE' }),
          Interaction.distinct('companyId', { organizationId: org._id }),
          JobOpportunity.countDocuments({ organizationId: org._id, hiringStatus: 'HIRING_NOW' }),
          JobOpportunity.countDocuments({ organizationId: org._id, isShortlisted: true }),
          User.countDocuments({ organizationId: org._id, role: 'TEAM_MEMBER', status: 'ACTIVE' }),
          User.countDocuments({ organizationId: org._id, role: 'PMO', status: 'ACTIVE' }),
        ]);

        return {
          organization: {
            id: orgIdStr,
            name: org.name,
            code: org.code,
            status: org.status,
            createdAt: org.createdAt,
          },
          status: org.status,
          companiesCount,
          assignedCompaniesCount: assignedIds.length,
          contactedCompaniesCount: contactedIds.length,
          hiringCount,
          shortlistedCount,
          teamMembersCount,
          pmosCount,
        };
      })
    );

    // 6. Global Charts
    const organizationsByCompanyCount = organizationPerformance.map((op) => ({
      name: op.organization.name,
      code: op.organization.code,
      companies: op.companiesCount,
      assigned: op.assignedCompaniesCount,
      contacted: op.contactedCompaniesCount,
    }));

    const hiringOpportunitiesByOrg = organizationPerformance.map((op) => ({
      name: op.organization.name,
      code: op.organization.code,
      hiringNow: op.hiringCount,
      shortlisted: op.shortlistedCount,
    }));

    const oppTypeCounts = await JobOpportunity.aggregate([
      { $group: { _id: '$hiringStatus', count: { $sum: 1 } } },
    ]);

    const statusMap = oppTypeCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const hiringStatusDistribution = [
      { name: 'Hiring Now', value: statusMap['HIRING_NOW'] || 0, statusKey: 'HIRING_NOW', color: '#10b981' },
      { name: 'Hiring Planned', value: statusMap['HIRING_PLANNED'] || 0, statusKey: 'HIRING_PLANNED', color: '#3b82f6' },
      { name: 'Not Hiring', value: statusMap['NOT_HIRING'] || 0, statusKey: 'NOT_HIRING', color: '#f43f5e' },
      { name: 'On Hold', value: statusMap['ON_HOLD'] || 0, statusKey: 'ON_HOLD', color: '#f59e0b' },
      { name: 'Closed', value: statusMap['CLOSED'] || 0, statusKey: 'CLOSED', color: '#64748b' },
    ];

    // Platform-wide daily interactions series over date range
    const activityRaw = await Interaction.aggregate([
      { $match: { interactionDate: { $gte: parsedStart, $lte: parsedEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$interactionDate' } },
          interactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const activityMap = activityRaw.reduce((acc, item) => {
      acc[item._id] = item.interactions;
      return acc;
    }, {});

    const platformActivity = [];
    const currDate = new Date(parsedStart);
    while (currDate <= parsedEnd) {
      const dateStr = currDate.toISOString().split('T')[0];
      const displayDate = currDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      platformActivity.push({
        date: dateStr,
        displayDate,
        interactions: activityMap[dateStr] || 0,
      });
      currDate.setDate(currDate.getDate() + 1);
    }

    // 7. Recent Platform Activity Timeline (Top 10)
    const [recentOrgs, recentOpps, recentInteractions] = await Promise.all([
      Organization.find({}).sort({ createdAt: -1 }).limit(5),
      JobOpportunity.find({})
        .populate('organizationId', 'name code')
        .populate('companyId', 'name companyName')
        .sort({ createdAt: -1 })
        .limit(5),
      Interaction.find({})
        .populate('organizationId', 'name code')
        .populate('companyId', 'name companyName')
        .populate('userId', 'name email')
        .sort({ interactionDate: -1 })
        .limit(5),
    ]);

    const events = [];

    recentOrgs.forEach((org) => {
      events.push({
        id: `org_${org._id}`,
        type: 'ORGANIZATION',
        title: `Organization enrolled: ${org.name} (${org.code})`,
        description: `Status: ${org.status} &bull; Contact: ${org.email}`,
        timestamp: org.createdAt,
        link: `/super-admin/organizations/${org._id}`,
      });
    });

    recentOpps.forEach((opp) => {
      events.push({
        id: `opp_${opp._id}`,
        type: 'OPPORTUNITY',
        title: opp.isShortlisted ? `Opportunity shortlisted: ${opp.title}` : `New opportunity added: ${opp.title}`,
        description: `Org: ${opp.organizationId?.name || 'College'} &bull; ${opp.companyId?.name || 'Company'}`,
        timestamp: opp.createdAt,
        link: `/super-admin/companies/${opp.companyId?._id || opp.companyId}`,
      });
    });

    recentInteractions.forEach((int) => {
      events.push({
        id: `int_${int._id}`,
        type: 'INTERACTION',
        title: `Outreach call logged for ${int.companyId?.name || 'Company'}`,
        description: `Org: ${int.organizationId?.name || 'College'} &bull; By: ${int.userId?.name || 'Member'}`,
        timestamp: int.interactionDate || int.createdAt,
        link: `/super-admin/companies/${int.companyId?._id || int.companyId}`,
      });
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      dateRangeInfo: {
        dateRange: dateRange || '30d',
        startDate: parsedStart,
        endDate: parsedEnd,
      },
      organizations: {
        totalOrganizations,
        activeOrganizations,
        inactiveOrganizations,
      },
      users: {
        totalUsers,
        totalPmos,
        totalTeamMembers,
      },
      companies: {
        totalCompanies,
        assignedCompanies,
        unassignedCompanies,
        contactedCompanies,
      },
      hiring: {
        totalOpportunities,
        currentlyHiring,
        hiringPlanned,
        shortlistedOpportunities,
      },
      organizationPerformance,
      charts: {
        organizationsByCompanyCount,
        hiringOpportunitiesByOrg,
        hiringStatusDistribution,
        platformActivity,
      },
      recentActivity: events.slice(0, 10),
    };
  }

  /**
   * 2. Organization-Scoped Analytics Drill-Down for Super Admin
   */
  async getOrganizationAnalytics(organizationId) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const [people, pmoDashboard] = await Promise.all([
      (async () => {
        const [pmos, teamMembers, totalUsers] = await Promise.all([
          User.countDocuments({ organizationId, role: 'PMO', status: 'ACTIVE' }),
          User.countDocuments({ organizationId, role: 'TEAM_MEMBER', status: 'ACTIVE' }),
          User.countDocuments({ organizationId }),
        ]);
        return { pmos, teamMembers, totalUsers };
      })(),
      pmoAnalyticsService.getDashboardAnalytics(
        { id: 'super_admin_drilldown', organizationId: org._id.toString(), role: 'SUPER_ADMIN' },
        { dateRange: '30d' }
      ),
    ]);

    return {
      organization: {
        id: org._id.toString(),
        name: org.name,
        code: org.code,
        status: org.status,
        email: org.email,
        createdAt: org.createdAt,
      },
      people,
      companies: pmoDashboard.companies,
      hiring: pmoDashboard.hiring,
      followUps: pmoDashboard.followUps,
      teamPerformance: pmoDashboard.teamPerformance,
      charts: pmoDashboard.charts,
      recentActivity: pmoDashboard.recentActivity,
    };
  }
}

export const superAdminAnalyticsService = new SuperAdminAnalyticsService();
export default superAdminAnalyticsService;
