import axiosInstance from '../../app/axios';
import { API_URL } from '../../config/appConfig';

const API_NOTIFICATIONS = `${API_URL}/api/notifications`;

// Create new notification
const createNotification = async (notificationData, token) => {
  const timestamp = new Date().toISOString();
  const endpoint = API_NOTIFICATIONS;
  
  console.log('[NOTIFICATION API] Creating notification at:', timestamp);
  console.log('[NOTIFICATION API] Endpoint:', endpoint);
  console.log('[NOTIFICATION API] Request data:', {
    ...notificationData,
    recipients: notificationData.recipients ? `${notificationData.recipients.length} recipients` : 'undefined'
  });
  
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };
  
  console.log('[NOTIFICATION API] Request headers:', {
    Authorization: 'Bearer [REDACTED]',
    'Content-Type': config.headers['Content-Type']
  });

  try {
    const response = await axiosInstance.post(endpoint, notificationData, config);
    
    console.log('[NOTIFICATION API] Success response:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString(),
      responseSize: JSON.stringify(response.data).length
    });
    
    return response.data;
  } catch (error) {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      endpoint,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data,
      requestData: {
        ...notificationData,
        recipients: notificationData.recipients ? `${notificationData.recipients.length} recipients` : 'undefined'
      }
    };
    
    console.error('[NOTIFICATION API] Request failed:', errorDetails);
    
    // Special handling for 404 errors
    if (error.response?.status === 404) {
      console.error('[NOTIFICATION API] 404 ERROR DETAILS:', {
        possibleCauses: [
          'API endpoint not found',
          'Backend server not running',
          'Incorrect API_URL configuration',
          'Route not properly registered'
        ],
        currentApiUrl: API_URL,
        fullEndpoint: endpoint,
        timestamp: errorDetails.timestamp
      });
    }
    
    // Re-throw the error with enhanced context
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.requestDetails = errorDetails;
    throw enhancedError;
  }
};



// Get my notifications
const getMyNotifications = async (token) => {
  try {
    const endpoint = API_NOTIFICATIONS;
    console.log('Fetching my notifications from:', endpoint);
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    console.log('Request config:', { headers: { Authorization: 'Bearer [REDACTED]' } });
    const response = await axiosInstance.get(endpoint, config);
    
    if (response.status === 200) {
      console.log(`Received ${response.data?.length || 0} notifications for me with status ${response.status}`);
      if (response.data?.length === 0) {
        console.log('Received empty array from server - this is normal if user has no notifications');
      }
      return response.data || [];
    } else {
      console.error(`Unexpected status ${response.status} when fetching my notifications`);
      return [];
    }
  } catch (error) {
    console.error('Error fetching my notifications:', error);
    return [];
  }
};

// Get sent notifications
const getSentNotifications = async (token) => {
  try {
    console.log('Fetching sent notifications');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axiosInstance.get(`${API_NOTIFICATIONS}/sent`, config);
    console.log(`Received ${response.data.length} sent notifications`);
    
    // Ensure we always return an array, even if the API returns null/undefined
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('API returned invalid notifications data, defaulting to empty array');
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    // Instead of throwing, return an empty array with error logging
    // This prevents the UI from crashing
    return [];
  }
};

// Get a specific notification
const getNotification = async (notificationId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axiosInstance.get(`${API_NOTIFICATIONS}/${notificationId}`, config);

  return response.data;
};

// Update notification
const updateNotification = async (notificationId, notificationData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axiosInstance.put(
    `${API_NOTIFICATIONS}/${notificationId}`,
    notificationData,
    config
  );

  return response.data;
};

// Delete notification
const deleteNotification = async (notificationId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axiosInstance.delete(`${API_NOTIFICATIONS}/${notificationId}`, config);

  return response.data;
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axiosInstance.put(
    `${API_NOTIFICATIONS}/${notificationId}/read`,
    {},
    config
  );

  return response.data;
};

// Mark notification as seen
const markNotificationAsSeen = async (notificationId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axiosInstance.put(
    `${API_NOTIFICATIONS}/${notificationId}/seen`,
    {},
    config
  );

  return response.data;
};

// Subscribe to push notifications
const subscribeToPushNotifications = async (subscription, token) => {
  // Validate token before making the request
  if (!token) {
    console.error('Token is undefined or null in subscribeToPushNotifications');
    throw new Error('Authentication token is missing');
  }
  
  console.log('[PUSH_SUBSCRIPTION] Registering push subscription with backend');
  console.log('[PUSH_SUBSCRIPTION] Subscription endpoint:', subscription?.endpoint?.substring(0, 50) + '...');
  
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Use the correct backend notification subscription endpoint
  const response = await axiosInstance.post(`${API_NOTIFICATIONS}/subscription`, subscription, config);

  console.log('[PUSH_SUBSCRIPTION] Successfully registered with backend');
  return response.data;
};

// Get VAPID public key
const getVapidPublicKey = async () => {
  const response = await axiosInstance.get(`${API_NOTIFICATIONS}/vapid-public-key`);

  return response.data;
};

const notificationService = {
  createNotification,
  getMyNotifications,
  getSentNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  markNotificationAsRead,
  markNotificationAsSeen,
  subscribeToPushNotifications,
  getVapidPublicKey,
};

export default notificationService;
