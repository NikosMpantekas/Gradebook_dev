import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from './notificationService';

const initialState = {
  notifications: [], // Always initialize as empty array
  notification: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
  lastFetched: null, // Track when notifications were last fetched
};

// Create new notification
export const createNotification = createAsyncThunk(
  'notifications/create',
  async (notificationData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await notificationService.createNotification(notificationData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);



// Get my notifications
export const getMyNotifications = createAsyncThunk(
  'notifications/getMyNotifications',
  async (_, thunkAPI) => {
    try {
      console.log('Dispatching getMyNotifications action');
      const token = thunkAPI.getState().auth.user.token;
      const response = await notificationService.getMyNotifications(token);
      
      // The service now guarantees an array will be returned even on error
      console.log(`Successfully received ${response.length} notifications in action creator`);
      return response;
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      console.error('Error in getMyNotifications action creator:', error);
      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

// Get sent notifications
export const getSentNotifications = createAsyncThunk(
  'notifications/getSentNotifications',
  async (_, thunkAPI) => {
    try {
      console.log('Dispatching getSentNotifications action');
      const token = thunkAPI.getState().auth.user.token;
      const response = await notificationService.getSentNotifications(token);
      
      // The service now guarantees an array will be returned even on error
      console.log(`Successfully received ${response.length} notifications in action creator`);
      return response; 
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      console.error('Error in getSentNotifications action creator:', error);
      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch sent notifications');
    }
  }
);

// Get a specific notification
export const getNotification = createAsyncThunk(
  'notifications/getNotification',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await notificationService.getNotification(id, token);
    } catch (error) {
      // Suppress rejection for cancelled/duplicate requests to prevent UI redirect loops
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }

      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update notification
export const updateNotification = createAsyncThunk(
  'notifications/update',
  async ({ id, notificationData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await notificationService.updateNotification(id, notificationData, token);
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await notificationService.deleteNotification(id, token);
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await notificationService.markNotificationAsRead(id, token);
      // CRITICAL FIX: Include the notification ID in the returned payload
      // so the reducer can properly update the state
      return {
        ...response,
        id: id
      };
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Mark notification as seen
export const markNotificationAsSeen = createAsyncThunk(
  'notifications/markAsSeen',
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await notificationService.markNotificationAsSeen(id, token);
      console.log('markNotificationAsSeen API response:', response);
      return {
        ...response,
        id: id
      };
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Subscribe to push notifications
export const subscribeToPushNotifications = createAsyncThunk(
  'notifications/subscribeToPush',
  async (subscription, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await notificationService.subscribeToPushNotifications(subscription, token);
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get VAPID public key
export const getVapidPublicKey = createAsyncThunk(
  'notifications/getVapidPublicKey',
  async (_, thunkAPI) => {
    try {
      return await notificationService.getVapidPublicKey();
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return thunkAPI.rejectWithValue('CANCELLED');
      }
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    reset: (state) => {
      // Modified reset: preserve notifications array but reset other state flags
      // This prevents the notifications from disappearing when navigating between pages
      return {
        ...initialState,
        notifications: state.notifications, // Keep existing notifications
        lastFetched: state.lastFetched,    // Keep track of when we last fetched
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createNotification.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createNotification.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      .addCase(getMyNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMyNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notifications = action.payload;
      })
      // We don't use rejected case for getMyNotifications anymore since we always return an array
      // This ensures the UI never crashes even on network errors
      .addCase(getMyNotifications.rejected, (state, action) => {
        state.isLoading = false;
        // Only clear notifications if it's a real error, not a cancellation
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
          state.notifications = []; 
        }
      })
      .addCase(getSentNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSentNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notifications = action.payload;
      })
      .addCase(getSentNotifications.rejected, (state, action) => {
        state.isLoading = false;
        // Only clear notifications if it's a real error, not a cancellation
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
          state.notifications = [];
        }
        state.message = ''; // Clear any error messages
      })
      .addCase(getNotification.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.notification = action.payload;
      })
      .addCase(getNotification.rejected, (state, action) => {
        state.isLoading = false;
        // Only set isError if it wasn't a suppression/cancellation
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(updateNotification.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notifications = state.notifications.map((notification) =>
          notification._id === action.payload._id ? action.payload : notification
        );
      })
      .addCase(updateNotification.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(deleteNotification.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notifications = state.notifications.filter(
          (notification) => notification._id !== action.payload.id
        );
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(markNotificationAsRead.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        if (state.notifications && state.notifications.length > 0) {
          state.notifications = state.notifications.map(notification => {
            if (notification._id === action.payload._id) {
              return { ...notification, isRead: true };
            }
            return notification;
          });
        }
        if (state.notification && state.notification._id === action.payload._id) {
          state.notification = { ...state.notification, isRead: true };
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(markNotificationAsSeen.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(markNotificationAsSeen.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        console.log('Redux: markNotificationAsSeen fulfilled', action.payload);
        
        // Update notifications array
        if (state.notifications && state.notifications.length > 0) {
          state.notifications = state.notifications.map((notification) => {
            if (notification._id === action.payload.id) {
              console.log('Redux: Updating notification in array', notification._id);
              return { ...notification, isSeen: true, seen: true };
            }
            return notification;
          });
        }
        
        // Update single notification
        if (state.notification && state.notification._id === action.payload.id) {
          console.log('Redux: Updating single notification', state.notification._id);
          state.notification = { ...state.notification, isSeen: true, seen: true };
        }
      })
      .addCase(markNotificationAsSeen.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(subscribeToPushNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(subscribeToPushNotifications.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(subscribeToPushNotifications.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      })
      .addCase(getVapidPublicKey.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(getVapidPublicKey.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload !== 'CANCELLED') {
          state.isError = true;
          state.message = action.payload;
        }
      });
  },
});

export const { reset } = notificationSlice.actions;
export default notificationSlice.reducer;
