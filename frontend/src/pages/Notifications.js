import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  getMyNotifications, 
  getSentNotifications,
  markNotificationAsRead,
  deleteNotification,
  updateNotification,
  reset,
} from '../features/notifications/notificationSlice';
import NotificationsList from '../components/notifications/NotificationsList';
import NotificationEditDialog from '../components/notifications/NotificationEditDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { RefreshCw } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { notifications, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.notifications
  );

  const [tabValue, setTabValue] = useState('received');
  const [displayedNotifications, setDisplayedNotifications] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    message: '',
    isImportant: false
  });

  // Calculate unread notifications count
  const unreadCount = Array.isArray(displayedNotifications) 
    ? displayedNotifications.filter(n => !n.isRead && tabValue === 'received').length 
    : 0;

  // Load notifications when component mounts
  useEffect(() => {
    console.log('Notifications component mounted');
    console.log('Initial notifications state:', {
      count: notifications?.length || 0,
      isLoading,
      isError,
      userRole: user?.role
    });

    if (tabValue === 'received' && notifications && notifications.length > 0) {
      console.log('Using existing notifications from store:', notifications.length);
      setDisplayedNotifications(notifications);
    }
  }, []);

  // Load notifications when tab changes
  useEffect(() => {
    console.log(`Loading notifications, tab: ${tabValue === 'received' ? 'Received' : 'Sent'}`);
    if (tabValue === 'received') {
      console.log('Dispatching getMyNotifications for tab: Received');
      dispatch(getMyNotifications())
        .unwrap()
        .then((result) => {
          console.log(`Successfully loaded ${result.length} notifications for the current user`);
        })
        .catch((error) => {
          console.error('Failed to load notifications:', error);
          toast.error('Failed to load notifications');
        });
    } else {
      console.log('Dispatching getSentNotifications for tab: Sent');
      dispatch(getSentNotifications())
        .unwrap()
        .then((result) => {
          console.log(`Successfully loaded ${result.length} sent notifications`);
        })
        .catch((error) => {
          console.error('Failed to load sent notifications:', error);
          toast.error('Failed to load sent notifications');
        });
    }
  }, [tabValue, dispatch]);

  // Update displayed notifications when store changes
  useEffect(() => {
    if (notifications && Array.isArray(notifications)) {
      console.log(`Updating displayed notifications: ${notifications.length} total`);
      setDisplayedNotifications(notifications);
    }
  }, [notifications]);

  // Handle tab change
  const handleChangeTab = useCallback((newValue) => {
    console.log(`Switching to tab ${newValue === 'received' ? 'Received' : 'Sent'}`);
    setTabValue(newValue);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (tabValue === 'received') {
      dispatch(getMyNotifications());
    } else {
      dispatch(getSentNotifications());
    }
  }, [tabValue, dispatch]);

  // Handle mark as read
  const handleMarkAsRead = useCallback((notificationId) => {
    console.log(`Marking notification ${notificationId} as read`);
    dispatch(markNotificationAsRead(notificationId))
      .unwrap()
      .then(() => {
        toast.success('Notification marked as read');
        // CRITICAL FIX: Don't immediately refresh - Redux state already updated
        // dispatch(getMyNotifications()); // REMOVED: Causes race condition with stale cache
        
        // Dispatch custom event to refresh header counts
        window.dispatchEvent(new CustomEvent('refreshHeaderCounts'));
      })
      .catch((error) => {
        console.error('Failed to mark notification as read:', error);
        toast.error('Failed to mark notification as read');
      });
  }, [dispatch]);

  // Handle edit notification
  const handleEdit = useCallback((event, notification) => {
    event.preventDefault();
    console.log('Editing notification:', notification._id);
    setCurrentNotification(notification);
    setEditForm({
      title: notification.title,
      message: notification.message,
      isImportant: notification.isImportant || false
    });
    setEditDialogOpen(true);
  }, []);

  // Handle delete notification
  const handleDelete = useCallback((notificationId) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      console.log(`Deleting notification ${notificationId}`);
      dispatch(deleteNotification(notificationId))
        .unwrap()
        .then(() => {
          toast.success('Notification deleted successfully');
          handleRefresh();
        })
        .catch((error) => {
          console.error('Failed to delete notification:', error);
          toast.error('Failed to delete notification');
        });
    }
  }, [dispatch, handleRefresh]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!currentNotification) return;

    console.log('Saving notification edit:', currentNotification._id);
    dispatch(updateNotification({
      id: currentNotification._id,
      notificationData: editForm
    }))
      .unwrap()
      .then(() => {
        toast.success('Notification updated successfully');
        setEditDialogOpen(false);
        setCurrentNotification(null);
        handleRefresh();
      })
      .catch((error) => {
        console.error('Failed to update notification:', error);
        toast.error('Failed to update notification');
      });
  }, [currentNotification, editForm, dispatch, handleRefresh]);

  // Handle form change
  const handleFormChange = useCallback((field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle navigate to notification detail
  const handleNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              Notifications
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Manually refreshing notifications');
                handleRefresh();
                toast.info('Refreshing notifications...');
              }}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={tabValue} onValueChange={handleChangeTab} className="w-full">
            <TabsList className={`grid w-full ${(user?.role === 'teacher' || user?.role === 'admin') ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="received" className="relative flex items-center justify-center">
                <span>Received</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <TabsTrigger value="sent">Sent</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="received" className="mt-4">
              <NotificationsList
                notifications={displayedNotifications}
                tabValue="received"
                user={user}
                onMarkAsRead={handleMarkAsRead}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            </TabsContent>
            
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <TabsContent value="sent" className="mt-4">
                <NotificationsList
                  notifications={displayedNotifications}
                  tabValue="sent"
                  user={user}
                  onMarkAsRead={handleMarkAsRead}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <NotificationEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        notification={currentNotification}
        editForm={editForm}
        onFormChange={handleFormChange}
        onSave={handleSaveEdit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Notifications;
