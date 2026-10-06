import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '../../services/notification.service';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await notificationService.getNotifications(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const data = await notificationService.getUnreadCount();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch unread count');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAsRead(notificationId);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const data = await notificationService.markAllAsRead();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to mark all notifications as read');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.data || [];
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
        if (typeof action.payload.unreadCount === 'number') {
          state.unreadCount = action.payload.unreadCount;
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchUnreadCount
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        if (action.payload?.data?.unreadCount !== undefined) {
          state.unreadCount = action.payload.data.unreadCount;
        }
      })

      // markNotificationAsRead
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const updatedId = action.payload?.data?.id || action.payload?.data?._id;
        if (updatedId) {
          state.notifications = state.notifications.map((n) =>
            n.id === updatedId || n._id === updatedId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          );
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // markAllNotificationsAsRead
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      });
  },
});

export const { clearNotificationError } = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationLoading = (state) => state.notifications.loading;
export const selectNotificationPagination = (state) => state.notifications.pagination;

export default notificationSlice.reducer;
