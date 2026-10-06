import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckSquare,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  selectNotifications,
  selectUnreadCount,
  selectNotificationPagination,
  selectNotificationLoading,
} from '../features/notifications/notificationSlice';
import { selectCurrentUser } from '../features/auth/authSlice';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector(selectCurrentUser);
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const pagination = useSelector(selectNotificationPagination);
  const isLoading = useSelector(selectNotificationLoading);

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'FOLLOW_UP' | 'ASSIGNMENT' | 'OPPORTUNITY'
  const [page, setPage] = useState(1);
  const limit = 15;

  const loadData = (currentPage = page, tab = activeTab) => {
    const params = { page: currentPage, limit };
    if (tab === 'UNREAD') {
      params.isRead = 'false';
    } else if (tab === 'FOLLOW_UP') {
      // Backend supports filtering or client filter. Let's pass type filter if supported or fetch all & filter
    }
    dispatch(fetchNotifications(params));
    dispatch(fetchUnreadCount());
  };

  useEffect(() => {
    if (user) {
      loadData(page, activeTab);
    }
  }, [dispatch, user, page, activeTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
  };

  const handleMarkRead = (id, e) => {
    e.stopPropagation();
    dispatch(markNotificationAsRead(id));
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  const handleItemClick = (item) => {
    if (!item.isRead) {
      dispatch(markNotificationAsRead(item.id || item._id));
    }

    const role = user?.role;
    const type = item.type;

    if (type === 'FOLLOW_UP_DUE' || type === 'FOLLOW_UP_OVERDUE') {
      if (role === 'PMO') navigate('/pmo/follow-ups');
      else if (role === 'TEAM_MEMBER') navigate('/team-member/follow-ups');
    } else if (type === 'COMPANY_ASSIGNED' || type === 'COMPANY_REASSIGNED') {
      if (role === 'TEAM_MEMBER') {
        if (item.entityId) navigate(`/team-member/companies/${item.entityId}`);
        else navigate('/team-member/companies');
      } else if (role === 'PMO') {
        navigate('/pmo/companies');
      }
    } else if (type === 'OPPORTUNITY_SHORTLISTED' || type === 'JD_RECEIVED') {
      if (role === 'PMO') {
        if (item.entityId && type === 'OPPORTUNITY_SHORTLISTED') navigate(`/pmo/opportunities/${item.entityId}`);
        else navigate('/pmo/opportunities');
      } else if (role === 'TEAM_MEMBER') {
        if (item.entityId) navigate(`/team-member/opportunities/${item.entityId}`);
        else navigate('/team-member/opportunities');
      }
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'FOLLOW_UP_OVERDUE':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'FOLLOW_UP_DUE':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'COMPANY_ASSIGNED':
      case 'COMPANY_REASSIGNED':
        return <Building2 className="w-5 h-5 text-indigo-600" />;
      case 'OPPORTUNITY_SHORTLISTED':
        return <CheckSquare className="w-5 h-5 text-emerald-600" />;
      case 'JD_RECEIVED':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'FOLLOW_UP_OVERDUE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">Overdue Follow-Up</span>;
      case 'FOLLOW_UP_DUE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">Due Follow-Up</span>;
      case 'COMPANY_ASSIGNED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Company Assigned</span>;
      case 'COMPANY_REASSIGNED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">Company Reassigned</span>;
      case 'OPPORTUNITY_SHORTLISTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Opportunity Shortlisted</span>;
      case 'JD_RECEIVED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">JD Uploaded</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  // Filter notifications based on tab selection
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.isRead;
    if (activeTab === 'FOLLOW_UP') return item.type === 'FOLLOW_UP_DUE' || item.type === 'FOLLOW_UP_OVERDUE';
    if (activeTab === 'ASSIGNMENT') return item.type === 'COMPANY_ASSIGNED' || item.type === 'COMPANY_REASSIGNED';
    if (activeTab === 'OPPORTUNITY') return item.type === 'OPPORTUNITY_SHORTLISTED' || item.type === 'JD_RECEIVED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Notification Center</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stay updated on company assignments, follow-up reminders, and job opportunities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(page, activeTab)}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleTabChange('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Notifications ({pagination?.totalDocs || notifications.length})
            </button>
            <button
              onClick={() => handleTabChange('UNREAD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'UNREAD'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => handleTabChange('FOLLOW_UP')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'FOLLOW_UP'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Follow-Ups
            </button>
            <button
              onClick={() => handleTabChange('ASSIGNMENT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ASSIGNMENT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => handleTabChange('OPPORTUNITY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'OPPORTUNITY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Opportunities
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {isLoading && notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Inbox className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No notifications found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'UNREAD'
                  ? 'You are all caught up! There are no unread notifications.'
                  : 'No notifications available under this filter.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id || item._id}
                onClick={() => handleItemClick(item)}
                className={`p-4 flex items-start gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                  !item.isRead ? 'bg-indigo-50/20' : ''
                }`}
              >
                {/* Type Icon */}
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5 group-hover:bg-white transition-colors">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm ${!item.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {item.title}
                      </h3>
                      {getTypeBadge(item.type)}
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <div className="mt-2 text-[11px] font-mono bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded inline-block border border-slate-200">
                      {item.metadata.companyName && `Company: ${item.metadata.companyName}`}
                      {item.metadata.companyName && item.metadata.jobTitle && ' • '}
                      {item.metadata.jobTitle && `Role: ${item.metadata.jobTitle}`}
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {!item.isRead ? (
                    <button
                      onClick={(e) => handleMarkRead(item.id || item._id, e)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded">
                      Read
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalDocs} notifications)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
