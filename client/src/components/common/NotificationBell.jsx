import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  CheckCheck,
  Clock,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckSquare,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  selectNotifications,
  selectUnreadCount,
} from '../../features/notifications/notificationSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';

export default function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const user = useSelector(selectCurrentUser);
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);

  // Initial fetch and periodic 60s polling
  useEffect(() => {
    if (user) {
      dispatch(fetchUnreadCount());

      const interval = setInterval(() => {
        dispatch(fetchUnreadCount());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [dispatch, user]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      dispatch(fetchNotifications({ limit: 10 }));
    }
  }, [isOpen, dispatch, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      dispatch(markNotificationAsRead(item.id || item._id));
    }
    setIsOpen(false);

    // Controlled Navigation Mapping based on User Role & Entity
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
        return <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'FOLLOW_UP_DUE':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'COMPANY_ASSIGNED':
      case 'COMPANY_REASSIGNED':
        return <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'OPPORTUNITY_SHORTLISTED':
        return <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'JD_RECEIVED':
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
      default:
        return <Briefcase className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer focus:outline-hidden"
        title="Notifications Center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-800 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bell className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-medium">No recent notifications</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id || item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                    !item.isRead ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs truncate ${!item.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-snug">
                      {item.message}
                    </p>
                  </div>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>View All Notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
