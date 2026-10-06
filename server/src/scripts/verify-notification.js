import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notification.service.js';
import assignmentService from '../services/assignment.service.js';
import opportunityService from '../services/opportunity.service.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_management_test';

async function runNotificationVerification() {
  console.log('\n--- STARTING NOTIFICATIONS & FOLLOW-UP REMINDER CENTER VERIFICATION TEST ---\n');

  let orgA, orgB;
  let pmoA, pmoB;
  let memberRahul, memberAmit;
  let companyA;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[1/9] Connected to test database.');

    // Cleanup artifacts
    await Notification.deleteMany({});
    await FollowUp.deleteMany({ notes: { $regex: /^NotifTest_/ } });
    await JobOpportunity.deleteMany({ title: { $regex: /^NotifTest_/ } });
    await Company.deleteMany({ companyName: { $regex: /^NotifTest_/ } });
    await User.deleteMany({ email: { $regex: /^notif\./ } });
    await Organization.deleteMany({ code: { $in: ['NOTIF_ORG_A', 'NOTIF_ORG_B'] } });

    // Setup Test Data
    orgA = await Organization.create({
      name: 'Notif Test Institute A',
      code: 'NOTIF_ORG_A',
      email: 'contact@notifa.edu',
      status: 'ACTIVE',
    });

    orgB = await Organization.create({
      name: 'Notif Test Institute B',
      code: 'NOTIF_ORG_B',
      email: 'contact@notifb.edu',
      status: 'ACTIVE',
    });

    pmoA = await User.create({
      name: 'PMO Lead Org A',
      email: 'notif.pmoa@notifa.edu',
      passwordHash: '$2a$10$e8w617u419',
      role: 'PMO',
      organizationId: orgA._id,
      status: 'ACTIVE',
    });

    pmoB = await User.create({
      name: 'PMO Lead Org B',
      email: 'notif.pmob@notifb.edu',
      passwordHash: '$2a$10$e8w617u419',
      role: 'PMO',
      organizationId: orgB._id,
      status: 'ACTIVE',
    });

    memberRahul = await User.create({
      name: 'Rahul Sharma',
      email: 'notif.rahul@notifa.edu',
      passwordHash: '$2a$10$e8w617u419',
      role: 'TEAM_MEMBER',
      organizationId: orgA._id,
      status: 'ACTIVE',
    });

    memberAmit = await User.create({
      name: 'Amit Kumar',
      email: 'notif.amit@notifb.edu',
      passwordHash: '$2a$10$e8w617u419',
      role: 'TEAM_MEMBER',
      organizationId: orgB._id,
      status: 'ACTIVE',
    });

    console.log('[2/9] Test dataset established.');

    // --- Test 1: Notification Creation & Unread Count ---
    console.log('\n--- Test 1: Notification Creation & Unread Count ---');
    const userRahul = { id: memberRahul._id.toString(), role: 'TEAM_MEMBER', organizationId: orgA._id.toString() };

    const notif1 = await notificationService.createNotification({
      organizationId: orgA._id,
      recipientId: memberRahul._id,
      type: 'COMPANY_ASSIGNED',
      title: 'Company Assigned',
      message: 'Test company assignment notification',
    });

    if (!notif1) throw new Error('Failed to create system notification');

    const unreadRes = await notificationService.getUnreadCount(userRahul);
    if (unreadRes.unreadCount < 1) {
      throw new Error(`Expected unreadCount >= 1, got ${unreadRes.unreadCount}`);
    }

    console.log('[3/9] ✔ PASS: System notification created and unread count calculated.');

    // --- Test 2: Mark Single & Mark All as Read ---
    console.log('\n--- Test 2: Mark Single & Mark All as Read ---');
    const notif1Id = notif1._id ? notif1._id.toString() : notif1.id;
    const markedSingle = await notificationService.markAsRead(userRahul, notif1Id);
    if (!markedSingle.isRead) throw new Error('Failed to mark single notification as read');

    // Create two more notifications
    await notificationService.createNotification({
      organizationId: orgA._id,
      recipientId: memberRahul._id,
      type: 'FOLLOW_UP_DUE',
      title: 'Follow-Up Due',
      message: 'Test message 2',
    });
    await notificationService.createNotification({
      organizationId: orgA._id,
      recipientId: memberRahul._id,
      type: 'OPPORTUNITY_SHORTLISTED',
      title: 'Opportunity Shortlisted',
      message: 'Test message 3',
    });

    await notificationService.markAllAsRead(userRahul);

    const postAllRead = await notificationService.getUnreadCount(userRahul);
    if (postAllRead.unreadCount !== 0) {
      throw new Error(`Expected unreadCount = 0 after markAllAsRead, got ${postAllRead.unreadCount}`);
    }

    console.log('[4/9] ✔ PASS: Mark as read and mark all as read verified.');

    // --- Test 3: Recipient & Tenant Isolation ---
    console.log('\n--- Test 3: Recipient & Tenant Isolation ---');
    const notifAmit = await notificationService.createNotification({
      organizationId: orgB._id,
      recipientId: memberAmit._id,
      type: 'COMPANY_ASSIGNED',
      title: 'Company Assigned',
      message: 'Amit notification',
    });

    // Rahul attempts to mark Amit's notification as read
    let crossReadError;
    try {
      const targetAmitNotifId = notifAmit._id ? notifAmit._id.toString() : notifAmit.id;
      await notificationService.markAsRead(userRahul, targetAmitNotifId);
    } catch (err) {
      crossReadError = err;
    }

    if (!crossReadError || crossReadError.statusCode !== 404) {
      throw new Error('Security Violation: Rahul marked Amit notification as read or did not get 404');
    }

    // Amit queries notifications — must not see Rahul's
    const userAmit = { id: memberAmit._id.toString(), role: 'TEAM_MEMBER', organizationId: orgB._id.toString() };
    const amitNotifs = await notificationService.getNotificationsForUser(userAmit);
    const amitNotifIds = amitNotifs.items.map((n) => n.id);

    if (amitNotifIds.includes(notif1Id)) {
      throw new Error('Security Violation: Amit received Rahul notifications!');
    }

    console.log('[5/9] ✔ PASS: Strict recipient & tenant isolation verified (cross-recipient access rejected with 404).');

    // --- Test 4: Follow-Up Due & Overdue Reminders ---
    console.log('\n--- Test 4: Follow-Up Due & Overdue Reminders ---');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 2);

    const companyTest = await Company.create({
      organizationId: orgA._id,
      companyName: 'NotifTest_TargetCorp',
      normalizedName: 'notiftest_targetcorp',
      createdBy: pmoA._id,
    });

    const followUpDueToday = await FollowUp.create({
      organizationId: orgA._id,
      companyId: companyTest._id,
      assignedTo: memberRahul._id,
      createdBy: memberRahul._id,
      dueDate: today,
      status: 'PENDING',
      notes: 'NotifTest_DueTodayTask',
    });

    const followUpOverdue = await FollowUp.create({
      organizationId: orgA._id,
      companyId: companyTest._id,
      assignedTo: memberRahul._id,
      createdBy: memberRahul._id,
      dueDate: yesterday,
      status: 'PENDING',
      notes: 'NotifTest_OverdueTask',
    });

    // Trigger reminder generation
    await notificationService.checkAndGenerateFollowUpReminders(userRahul);

    const rahulNotifs = await notificationService.getNotificationsForUser(userRahul, { limit: 50 });
    const types = rahulNotifs.items.map((n) => n.type);

    if (!types.includes('FOLLOW_UP_DUE') || !types.includes('FOLLOW_UP_OVERDUE')) {
      throw new Error(`Expected FOLLOW_UP_DUE and FOLLOW_UP_OVERDUE, found: ${types.join(', ')}`);
    }

    console.log('[6/9] ✔ PASS: Follow-up due today and overdue reminders generated dynamically.');

    // --- Test 5: Duplicate Prevention via Deduplication Key ---
    console.log('\n--- Test 5: Duplicate Prevention via Deduplication Key ---');
    const initialCount = rahulNotifs.items.length;

    // Re-trigger reminder generation
    await notificationService.checkAndGenerateFollowUpReminders(userRahul);

    const postReTriggerNotifs = await notificationService.getNotificationsForUser(userRahul, { limit: 50 });
    if (postReTriggerNotifs.items.length !== initialCount) {
      throw new Error(`Duplicate notifications created! Count increased from ${initialCount} to ${postReTriggerNotifs.items.length}`);
    }

    console.log('[7/9] ✔ PASS: Deduplication key prevented duplicate follow-up notifications.');

    // --- Test 6: Business Service Integration (Company Assignment & Shortlisting) ---
    console.log('\n--- Test 6: Business Service Integration ---');
    const pmoUserContext = { id: pmoA._id.toString(), role: 'PMO', organizationId: orgA._id };

    // 1. Assign company to Rahul via assignmentService
    await assignmentService.assignCompany(pmoUserContext, {
      companyId: companyTest._id.toString(),
      assignedTo: memberRahul._id.toString(),
      reason: 'Notification test assignment',
    });

    const postAssignNotifs = await notificationService.getNotificationsForUser(userRahul);
    const hasCompanyAssigned = postAssignNotifs.items.some((n) => n.type === 'COMPANY_ASSIGNED');
    if (!hasCompanyAssigned) {
      throw new Error('COMPANY_ASSIGNED notification was not created during assignCompany call');
    }

    // 2. Create and shortlist opportunity
    const opp = await JobOpportunity.create({
      organizationId: orgA._id,
      companyId: companyTest._id,
      title: 'NotifTest_SoftwareEngineer',
      opportunityType: 'FULL_TIME',
      candidateType: 'FRESHERS',
      createdBy: memberRahul._id,
      hiringStatus: 'HIRING_NOW',
    });

    await opportunityService.shortlistOpportunity(pmoUserContext, opp._id.toString(), {
      isShortlisted: true,
      pmoReviewNote: 'Shortlisted for drive',
    });

    const postShortlistNotifs = await notificationService.getNotificationsForUser(userRahul);
    const hasShortlistedNotif = postShortlistNotifs.items.some((n) => n.type === 'OPPORTUNITY_SHORTLISTED');
    if (!hasShortlistedNotif) {
      throw new Error('OPPORTUNITY_SHORTLISTED notification was not created during shortlistOpportunity call');
    }

    console.log('[8/9] ✔ PASS: Integrated notifications triggered seamlessly on company assignment and opportunity shortlisting.');

    // Cleanup
    await Notification.deleteMany({});
    await FollowUp.deleteMany({ notes: { $regex: /^NotifTest_/ } });
    await JobOpportunity.deleteMany({ title: { $regex: /^NotifTest_/ } });
    await Company.deleteMany({ companyName: { $regex: /^NotifTest_/ } });
    await User.deleteMany({ email: { $regex: /^notif\./ } });
    await Organization.deleteMany({ code: { $in: ['NOTIF_ORG_A', 'NOTIF_ORG_B'] } });

    console.log('[9/9] Verification test database cleaned up.');

    console.log('\n==================================================');
    console.log('SUCCESS: ALL NOTIFICATION CENTER TESTS PASSED!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ NOTIFICATION VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runNotificationVerification();
