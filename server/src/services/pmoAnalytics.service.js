import mongoose from 'mongoose';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import User from '../models/User.js';

class PMOAnalyticsService {
  /**
   * Helper to parse date filter boundaries
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
      startDate = new Date(0); // Beginning of time
    } else if (dateRange === 'custom' && startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default 30 days
      startDate.setDate(now.getDate() - 30);
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  /**
   * 1. Company Metrics (Current State)
   */
  async getCompanyMetrics(organizationId, teamMemberId = null) {
    const orgIdObj = new mongoose.Types.ObjectId(organizationId);

    // If filtering by team member, fetch their active assigned company IDs
    let teamAssignedCompanyIds = null;
    if (teamMemberId) {
      const assignments = await Assignment.find({
        organizationId,
        assignedTo: teamMemberId,
        status: 'ACTIVE',
      }).select('companyId');
      teamAssignedCompanyIds = assignments.map((a) => a.companyId.toString());
    }

    // Base query for active companies in org
    const baseCompanyQuery = {
      organizationId,
      status: { $ne: 'INACTIVE' },
    };

    if (teamAssignedCompanyIds) {
      baseCompanyQuery._id = { $in: teamAssignedCompanyIds };
    }

    const totalCompanies = await Company.countDocuments(baseCompanyQuery);

    // Active assigned companies
    const activeAssignmentsQuery = {
      organizationId,
      status: 'ACTIVE',
    };
    if (teamMemberId) {
      activeAssignmentsQuery.assignedTo = teamMemberId;
    }
    const distinctAssignedIds = await Assignment.distinct('companyId', activeAssignmentsQuery);
    const assignedCompanies = distinctAssignedIds.length;

    const unassignedCompanies = Math.max(0, totalCompanies - assignedCompanies);

    // Contacted Companies: Unique companies with at least one interaction
    const interactionQuery = { organizationId };
    if (teamAssignedCompanyIds) {
      interactionQuery.companyId = { $in: teamAssignedCompanyIds };
    }
    const contactedCompanyIds = await Interaction.distinct('companyId', interactionQuery);
    const contactedCompanies = contactedCompanyIds.length;

    const notContactedCompanies = Math.max(0, totalCompanies - contactedCompanies);

    return {
      totalCompanies,
      assignedCompanies,
      unassignedCompanies,
      contactedCompanies,
      notContactedCompanies,
    };
  }

  /**
   * 2. Hiring & Opportunity Metrics (Feedback-Driven from Latest HR Outreach Calls)
   */
  async getHiringMetrics(organizationId, teamMemberId = null, startDate = null, endDate = null) {
    const orgIdObj = new mongoose.Types.ObjectId(organizationId);

    // Build match criteria for Interaction aggregation
    const interactionMatch = { organizationId: orgIdObj };

    if (startDate && endDate) {
      interactionMatch.interactionDate = { $gte: startDate, $lte: endDate };
    }

    if (teamMemberId) {
      const assignments = await Assignment.find({
        organizationId,
        assignedTo: teamMemberId,
        status: 'ACTIVE',
      }).select('companyId');
      const companyIds = assignments.map((a) => a.companyId);
      interactionMatch.companyId = { $in: companyIds };
    }

    // Pipeline to group by company and pick latest feedback per company
    const latestInteractionsAgg = await Interaction.aggregate([
      { $match: interactionMatch },
      { $sort: { interactionDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$companyId',
          latestOutcome: { $first: '$outcome' },
          latestHiringStatus: { $first: '$callDetails.hiringStatus' },
          latestOpenings: { $first: '$callDetails.openings' },
          latestInteractionDate: { $first: '$interactionDate' },
        },
      },
    ]);

    let currentlyHiring = 0;
    let hiringPlanned = 0;
    let notHiring = 0;
    let totalRoles = 0;

    latestInteractionsAgg.forEach((item) => {
      const isHiringNow = item.latestHiringStatus === 'YES' || item.latestOutcome === 'HIRING_NOW';
      const isPlanned = item.latestHiringStatus === 'HIRING_PLANNED' || item.latestOutcome === 'HIRING_PLANNED';
      const isNotHiring = item.latestHiringStatus === 'NO' || item.latestOutcome === 'NOT_HIRING';

      if (isHiringNow) {
        currentlyHiring += 1;
        if (typeof item.latestOpenings === 'number' && item.latestOpenings > 0) {
          totalRoles += item.latestOpenings;
        }
      } else if (isPlanned) {
        hiringPlanned += 1;
      } else if (isNotHiring) {
        notHiring += 1;
      }
    });

    // JobOpportunity secondary metrics
    const oppQuery = { organizationId };
    if (teamMemberId) {
      oppQuery.createdBy = teamMemberId;
    }
    const [onHold, closed, shortlistedOpportunities, totalOpportunities] = await Promise.all([
      JobOpportunity.countDocuments({ ...oppQuery, hiringStatus: 'ON_HOLD' }),
      JobOpportunity.countDocuments({ ...oppQuery, hiringStatus: 'CLOSED' }),
      JobOpportunity.countDocuments({ ...oppQuery, isShortlisted: true }),
      JobOpportunity.countDocuments(oppQuery),
    ]);

    return {
      currentlyHiring,
      hiringPlanned,
      notHiring,
      totalRoles,
      onHold,
      closed,
      shortlistedOpportunities,
      totalOpportunities,
    };
  }

  /**
   * 3. Follow-Up Metrics
   */
  async getFollowUpMetrics(organizationId, teamMemberId = null) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const baseQuery = {
      organizationId,
      status: 'PENDING',
    };

    if (teamMemberId) {
      baseQuery.assignedTo = teamMemberId;
    }

    const [today, upcoming, overdue] = await Promise.all([
      FollowUp.countDocuments({
        ...baseQuery,
        dueDate: { $gte: startOfToday, $lte: endOfToday },
      }),
      FollowUp.countDocuments({
        ...baseQuery,
        dueDate: { $gt: endOfToday },
      }),
      FollowUp.countDocuments({
        ...baseQuery,
        dueDate: { $lt: startOfToday },
      }),
    ]);

    return {
      today,
      upcoming,
      overdue,
      totalPending: today + upcoming + overdue,
    };
  }

  /**
   * 4. Team Performance Table Data
   */
  async getTeamPerformance(organizationId) {
    const teamMembers = await User.find({
      organizationId,
      role: 'TEAM_MEMBER',
      status: 'ACTIVE',
    })
      .select('_id name email')
      .sort({ name: 1 });

    const performance = await Promise.all(
      teamMembers.map(async (member) => {
        const memberIdStr = member._id.toString();

        // 1. Active assigned companies
        const activeAssignments = await Assignment.find({
          organizationId,
          assignedTo: member._id,
          status: 'ACTIVE',
        }).select('companyId');

        const assignedCompanyIds = activeAssignments.map((a) => a.companyId.toString());
        const assigned = assignedCompanyIds.length;

        // 2. Contacted: Unique assigned companies contacted
        let contacted = 0;
        if (assigned > 0) {
          const contactedIds = await Interaction.distinct('companyId', {
            organizationId,
            companyId: { $in: assignedCompanyIds },
          });
          contacted = contactedIds.length;
        }

        // 3. Pending companies
        const pending = Math.max(0, assigned - contacted);

        // 4. Currently Hiring companies for member's assigned companies based on latest feedback
        let currentlyHiring = 0;
        if (assigned > 0) {
          const latestAssignedInteractions = await Interaction.aggregate([
            {
              $match: {
                organizationId: new mongoose.Types.ObjectId(organizationId),
                companyId: { $in: assignedCompanyIds.map((id) => new mongoose.Types.ObjectId(id)) },
              },
            },
            { $sort: { interactionDate: -1, createdAt: -1 } },
            {
              $group: {
                _id: '$companyId',
                latestOutcome: { $first: '$outcome' },
                latestHiringStatus: { $first: '$callDetails.hiringStatus' },
              },
            },
          ]);

          currentlyHiring = latestAssignedInteractions.filter(
            (item) => item.latestHiringStatus === 'YES' || item.latestOutcome === 'HIRING_NOW'
          ).length;
        }

        // 5. Follow-ups pending/overdue owned by member
        const followUps = await FollowUp.countDocuments({
          organizationId,
          assignedTo: member._id,
          status: 'PENDING',
        });

        // 6. Coverage % formula
        const coverage = assigned > 0 ? Math.round((contacted / assigned) * 100 * 10) / 10 : 0;

        return {
          teamMember: {
            id: memberIdStr,
            name: member.name,
            email: member.email,
          },
          assigned,
          contacted,
          pending,
          currentlyHiring,
          followUps,
          coverage,
        };
      })
    );

    return performance;
  }

  /**
   * 5. Dashboard Charts Data
   */
  async getChartData(organizationId, startDate, endDate, teamMemberId = null) {
    const orgIdObj = new mongoose.Types.ObjectId(organizationId);

    // Hiring Status & Opportunity Type Distributions
    const hiringMetrics = await this.getHiringMetrics(organizationId, teamMemberId, startDate, endDate);

    const hiringStatusDistribution = [
      { name: 'Hiring Now', value: hiringMetrics.currentlyHiring, statusKey: 'HIRING_NOW', color: '#10b981' },
      { name: 'Hiring Planned', value: hiringMetrics.hiringPlanned, statusKey: 'HIRING_PLANNED', color: '#3b82f6' },
      { name: 'Not Hiring', value: hiringMetrics.notHiring, statusKey: 'NOT_HIRING', color: '#f43f5e' },
      { name: 'On Hold', value: hiringMetrics.onHold, statusKey: 'ON_HOLD', color: '#f59e0b' },
      { name: 'Closed', value: hiringMetrics.closed, statusKey: 'CLOSED', color: '#64748b' },
    ];

    const oppTypeCounts = await JobOpportunity.aggregate([
      { $match: { organizationId: orgIdObj, ...(teamMemberId ? { createdBy: new mongoose.Types.ObjectId(teamMemberId) } : {}) } },
      { $group: { _id: '$opportunityType', count: { $sum: 1 } } },
    ]);

    const typeMap = oppTypeCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const opportunityTypeDistribution = [
      { name: 'Full-Time', value: typeMap['FULL_TIME'] || 0, typeKey: 'FULL_TIME', color: '#6366f1' },
      { name: 'Internship', value: typeMap['INTERNSHIP'] || 0, typeKey: 'INTERNSHIP', color: '#a855f7' },
      { name: 'Internship + PPO', value: typeMap['INTERNSHIP_PPO'] || 0, typeKey: 'INTERNSHIP_PPO', color: '#f59e0b' },
      { name: 'Multiple Profiles', value: typeMap['MULTIPLE'] || 0, typeKey: 'MULTIPLE', color: '#64748b' },
    ];

    // Team Coverage chart data
    const teamPerf = await this.getTeamPerformance(organizationId);
    const teamCoverage = teamPerf.map((t) => ({
      name: t.teamMember.name,
      id: t.teamMember.id,
      coverage: t.coverage,
      assigned: t.assigned,
      contacted: t.contacted,
    }));

    // Outreach Activity Over Time (Interactions aggregated by date)
    const interactionMatch = {
      organizationId: orgIdObj,
      interactionDate: { $gte: startDate, $lte: endDate },
    };
    if (teamMemberId) {
      interactionMatch.userId = new mongoose.Types.ObjectId(teamMemberId);
    }

    const activityRaw = await Interaction.aggregate([
      { $match: interactionMatch },
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

    // Fill in daily points from startDate to endDate
    const outreachActivity = [];
    const currDate = new Date(startDate);
    while (currDate <= endDate) {
      const dateStr = currDate.toISOString().split('T')[0];
      const displayDate = currDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      outreachActivity.push({
        date: dateStr,
        displayDate,
        interactions: activityMap[dateStr] || 0,
      });
      currDate.setDate(currDate.getDate() + 1);
    }

    return {
      hiringStatusDistribution,
      opportunityTypeDistribution,
      teamCoverage,
      outreachActivity,
    };
  }

  /**
   * 6. Recent Activity Timeline (Top 10 unified events)
   */
  async getRecentActivity(organizationId) {
    const [recentInteractions, recentOpportunities, recentFollowups] = await Promise.all([
      Interaction.find({ organizationId })
        .populate('companyId', 'name companyName')
        .populate('userId', 'name email')
        .sort({ interactionDate: -1 })
        .limit(5),
      JobOpportunity.find({ organizationId })
        .populate('companyId', 'name companyName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
      FollowUp.find({ organizationId, status: 'COMPLETED' })
        .populate('companyId', 'name companyName')
        .populate('assignedTo', 'name email')
        .sort({ updatedAt: -1 })
        .limit(5),
    ]);

    const events = [];

    recentInteractions.forEach((item) => {
      events.push({
        id: `int_${item._id}`,
        type: 'INTERACTION',
        title: `Outreach call logged for ${item.companyId?.name || item.companyId?.companyName || 'Company'}`,
        description: `Outcome: ${item.outcome || 'Logged call'} &bull; Conducted by ${item.userId?.name || 'Member'}`,
        timestamp: item.interactionDate || item.createdAt,
        link: `/pmo/interactions/${item._id}`,
      });
    });

    recentOpportunities.forEach((opp) => {
      events.push({
        id: `opp_${opp._id}`,
        type: 'OPPORTUNITY',
        title: opp.isShortlisted ? `Opportunity shortlisted: ${opp.title}` : `New opportunity added: ${opp.title}`,
        description: `${opp.companyId?.name || 'Company'} &bull; ${opp.opportunityType} &bull; ${opp.salary || 'Package N/A'}`,
        timestamp: opp.createdAt,
        link: `/pmo/opportunities/${opp._id}`,
      });
    });

    recentFollowups.forEach((fu) => {
      events.push({
        id: `fu_${fu._id}`,
        type: 'FOLLOW_UP',
        title: `Follow-up completed for ${fu.companyId?.name || 'Company'}`,
        description: `Reason: ${fu.reason || 'Callback'} &bull; Owned by ${fu.assignedTo?.name || 'Member'}`,
        timestamp: fu.updatedAt || fu.createdAt,
        link: `/pmo/follow-ups`,
      });
    });

    // Sort descending by timestamp and return top 10
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events.slice(0, 10);
  }

  /**
   * Main Consolidated Dashboard Handler
   */
  async getDashboardAnalytics(user, { dateRange, startDate, endDate, teamMemberId }) {
    const organizationId = user.organizationId;
    const { startDate: parsedStart, endDate: parsedEnd } = this.parseDateRange(dateRange, startDate, endDate);

    // Verify teamMemberId belongs to user's organization if provided
    if (teamMemberId) {
      const member = await User.findOne({ _id: teamMemberId, organizationId });
      if (!member) {
        const error = new Error('Team member not found in your organization');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
    }

    const [companies, hiring, followUps, teamPerformance, charts, recentActivity] = await Promise.all([
      this.getCompanyMetrics(organizationId, teamMemberId),
      this.getHiringMetrics(organizationId, teamMemberId),
      this.getFollowUpMetrics(organizationId, teamMemberId),
      this.getTeamPerformance(organizationId),
      this.getChartData(organizationId, parsedStart, parsedEnd, teamMemberId),
      this.getRecentActivity(organizationId),
    ]);

    return {
      dateRangeInfo: {
        dateRange: dateRange || '30d',
        startDate: parsedStart,
        endDate: parsedEnd,
      },
      companies,
      hiring,
      followUps,
      teamPerformance,
      charts,
      recentActivity,
    };
  }
}

export const pmoAnalyticsService = new PMOAnalyticsService();
export default pmoAnalyticsService;
