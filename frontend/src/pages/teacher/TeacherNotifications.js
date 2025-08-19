import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Bell, 
  Users,
  MailOpen,
  Trash2,
  Edit,
  AlertCircle,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Spinner } from '../../components/ui/spinner';
import { API_URL } from '../../config/appConfig';
import { 
  getMyNotifications, 
  getSentNotifications,
  markNotificationAsRead,
  markNotificationAsSeen,
  deleteNotification,
  updateNotification
} from '../../features/notifications/notificationSlice';
import NotificationsList from '../../components/notifications/NotificationsList';
import NotificationEditDialog from '../../components/notifications/NotificationEditDialog';

const TeacherNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    message: '',
    isImportant: false
  });
  const [editLoading, setEditLoading] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  useEffect(() => {
    if (authToken) {
      loadNotifications();
    }
  }, [authToken, activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      let endpoint = '';
      if (activeTab === 'sent') {
        endpoint = `${API_URL}/api/notifications/sent`;
      } else {
        // For received and all, use the main notifications endpoint
        endpoint = `${API_URL}/api/notifications`;
      }

      const response = await fetch(endpoint, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API Response for ${activeTab}:`, data);
      
      // Handle different response formats
      let notificationsArray = [];
      if (Array.isArray(data)) {
        // Direct array response (e.g., from /sent endpoint)
        notificationsArray = data;
      } else if (data.notifications && Array.isArray(data.notifications)) {
        // Object with notifications array
        notificationsArray = data.notifications;
      } else {
        console.warn('Unexpected response format:', data);
        notificationsArray = [];
      }
      
      console.log(`Processed notifications array:`, notificationsArray);
      setNotifications(notificationsArray);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const config = {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
        // No body needed for this endpoint
      };

      const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAsSeen = async (notificationId) => {
    try {
      const config = {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(`${API_URL}/api/notifications/${notificationId}/seen`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update local state with both seen and isSeen properties for compatibility
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, seen: true, isSeen: true }
            : notif
        )
      );
      
      console.log('Updated local state - notification marked as seen:', notificationId);
      
      toast.success('Notification marked as seen');
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      toast.error('Failed to mark notification as seen');
    }
  };

  const handleEdit = (notification) => {
    if (notification && notification._id) {
      setEditingNotification(notification);
      setEditForm({
        title: notification.title || '',
        message: notification.message || '',
        isImportant: notification.urgent || false
      });
      setEditModalOpen(true);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const config = {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Remove from local state
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditSave = async () => {
    if (!editingNotification) return;
    
    setEditLoading(true);
    try {
      const config = {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editForm.title,
          message: editForm.message,
          urgent: editForm.isImportant
        })
      };

      const response = await fetch(`${API_URL}/api/notifications/${editingNotification._id}`, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedNotification = await response.json();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === editingNotification._id 
            ? { ...notif, ...updatedNotification }
            : notif
        )
      );
      
      toast.success('Notification updated successfully');
      setEditModalOpen(false);
      setEditingNotification(null);
      setEditForm({ title: '', message: '', isImportant: false });
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingNotification(null);
    setEditForm({ title: '', message: '', isImportant: false });
  };

  const handleCreateNew = () => {
    navigate('/app/teacher/notifications/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="text-primary" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and communications
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Notification
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      There are no notifications to display.
                    </p>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={notifications}
                    tabValue={0}
                    user={user}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAsSeen={handleMarkAsSeen}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="sent" className="mt-6">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No sent notifications</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't sent any notifications yet.
                    </p>
                    <Button onClick={handleCreateNew} variant="outline">
                      Send your first notification
                    </Button>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={notifications}
                    tabValue={1}
                    user={user}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAsSeen={handleMarkAsSeen}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="received" className="mt-6">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <MailOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No received notifications</h3>
                    <p className="text-muted-foreground">
                      You haven't received any notifications yet.
                    </p>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={notifications}
                    tabValue={2}
                    user={user}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAsSeen={handleMarkAsSeen}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Notification Modal */}
      <NotificationEditDialog
        open={editModalOpen}
        onClose={handleEditClose}
        notification={editingNotification}
        editForm={editForm}
        onFormChange={handleEditFormChange}
        onSave={handleEditSave}
        isLoading={editLoading}
      />
    </div>
  );
};

export default TeacherNotifications; 