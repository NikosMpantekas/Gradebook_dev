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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Spinner } from '../../components/ui/spinner';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';
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
  const [data, setData] = useState({ all: [], sent: [], received: [] });
  const [panelLoading, setPanelLoading] = useState({ all: false, sent: false, received: false });
  const [initialized, setInitialized] = useState(false);
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
  const { t } = useTranslation();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  useEffect(() => {
    if (authToken && !initialized) {
      // Preload default tabs without blocking the page
      Promise.all([
        loadTab('all'),
        loadTab('sent')
      ]).finally(() => setInitialized(true));
    }
  }, [authToken, initialized]);

  const loadTab = async (tab) => {
    try {
      setPanelLoading(prev => ({ ...prev, [tab]: true }));
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      };

      let endpoint = '';
      if (tab === 'sent') endpoint = `${API_URL}/api/notifications/sent`;
      else endpoint = `${API_URL}/api/notifications`;

      const response = await fetch(endpoint, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API Response for ${tab}:`, data);
      
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
      setData(prev => ({
        ...prev,
        [tab]: notificationsArray,
        // Keep received in sync with all if loaded from the same endpoint
        ...(tab !== 'sent' ? { received: notificationsArray, all: notificationsArray } : {})
      }));
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error(t('teacherNotifications.loadFailed'));
      setData(prev => ({ ...prev, [tab]: [] }));
    } finally {
      setPanelLoading(prev => ({ ...prev, [tab]: false }));
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
      
      // Update across tabs
      setData(prev => ({
        all: prev.all.map(n => n._id === notificationId ? { ...n, read: true } : n),
        sent: prev.sent.map(n => n._id === notificationId ? { ...n, read: true } : n),
        received: prev.received.map(n => n._id === notificationId ? { ...n, read: true } : n),
      }));
      
      toast.success(t('teacherNotifications.markedAsRead'));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error(t('teacherNotifications.markAsReadFailed'));
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
      
      // Update across tabs with both seen and isSeen properties for compatibility
      setData(prev => ({
        all: prev.all.map(n => n._id === notificationId ? { ...n, seen: true, isSeen: true } : n),
        sent: prev.sent.map(n => n._id === notificationId ? { ...n, seen: true, isSeen: true } : n),
        received: prev.received.map(n => n._id === notificationId ? { ...n, seen: true, isSeen: true } : n),
      }));
      
      console.log('Updated local state - notification marked as seen:', notificationId);
      
      toast.success(t('teacherNotifications.markedAsSeen'));
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      toast.error(t('teacherNotifications.markAsSeenFailed'));
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
    if (!window.confirm(t('teacherNotifications.deleteConfirm'))) {
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
      
      // Remove from local state across tabs
      setData(prev => ({
        all: prev.all.filter(n => n._id !== notificationId),
        sent: prev.sent.filter(n => n._id !== notificationId),
        received: prev.received.filter(n => n._id !== notificationId),
      }));
      
      toast.success(t('teacherNotifications.deleted'));
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error(t('teacherNotifications.deleteFailed'));
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
      
      // Update across tabs
      setData(prev => ({
        all: prev.all.map(n => n._id === editingNotification._id ? { ...n, ...updatedNotification } : n),
        sent: prev.sent.map(n => n._id === editingNotification._id ? { ...n, ...updatedNotification } : n),
        received: prev.received.map(n => n._id === editingNotification._id ? { ...n, ...updatedNotification } : n),
      }));
      
      toast.success(t('teacherNotifications.updated'));
      setEditModalOpen(false);
      setEditingNotification(null);
      setEditForm({ title: '', message: '', isImportant: false });
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error(t('teacherNotifications.updateFailed'));
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

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="text-primary" />
          <p className="text-muted-foreground">{t('teacherNotifications.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('teacherNotifications.title')}</h1>
          <p className="text-muted-foreground">
            {t('teacherNotifications.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t('teacherNotifications.create')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('teacherNotifications.center')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Dropdown Selector */}
          <div className="block md:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('contactMessages.selectTab')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('teacherNotifications.all')}</SelectItem>
                <SelectItem value="sent">{t('teacherNotifications.sent')}</SelectItem>
                <SelectItem value="received">{t('teacherNotifications.received')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: Panels for selected tab */}
          <div className="md:hidden">
            {activeTab === 'all' && (
              <div className="space-y-4 mt-4">
                {data.all.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptyAllTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('teacherNotifications.emptyAllDesc')}
                    </p>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={data.all}
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
            )}

            {activeTab === 'sent' && (
              <div className="space-y-4 mt-4">
                {data.sent.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptySentTitle')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('teacherNotifications.emptySentDesc')}
                    </p>
                    <Button onClick={handleCreateNew} variant="outline" className="w-full sm:w-auto">
                      {t('teacherNotifications.emptySentCta')}
                    </Button>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={data.sent}
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
            )}

            {activeTab === 'received' && (
              <div className="space-y-4 mt-4">
                {data.received.length === 0 ? (
                  <div className="text-center py-8">
                    <MailOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptyReceivedTitle')}</h3>
                    <p className="text-muted-foreground">
                      {t('teacherNotifications.emptyReceivedDesc')}
                    </p>
                  </div>
                ) : (
                  <NotificationsList
                    notifications={data.received}
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
            )}
          </div>

          {/* Desktop: Tabs */}
          <div className="hidden md:block">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="all">{t('teacherNotifications.all')}</TabsTrigger>
                <TabsTrigger value="sent">{t('teacherNotifications.sent')}</TabsTrigger>
                <TabsTrigger value="received">{t('teacherNotifications.received')}</TabsTrigger>
              </TabsList>
          
              <TabsContent value="all" className="mt-6">
                <div className="space-y-4">
                  {data.all.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptyAllTitle')}</h3>
                      <p className="text-muted-foreground">
                        {t('teacherNotifications.emptyAllDesc')}
                      </p>
                    </div>
                  ) : (
                    <NotificationsList
                      notifications={data.all}
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
                  {data.sent.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptySentTitle')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('teacherNotifications.emptySentDesc')}
                      </p>
                      <Button onClick={handleCreateNew} variant="outline">
                        {t('teacherNotifications.emptySentCta')}
                      </Button>
                    </div>
                  ) : (
                    <NotificationsList
                      notifications={data.sent}
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
                  {data.received.length === 0 ? (
                    <div className="text-center py-8">
                      <MailOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('teacherNotifications.emptyReceivedTitle')}</h3>
                      <p className="text-muted-foreground">
                        {t('teacherNotifications.emptyReceivedDesc')}
                      </p>
                    </div>
                  ) : (
                    <NotificationsList
                      notifications={data.received}
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
          </div>
            
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