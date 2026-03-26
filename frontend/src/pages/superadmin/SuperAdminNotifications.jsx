import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Send as SendIcon,
  Bell as NotificationsIcon,
  Users as PeopleIcon,
  School as SchoolIcon,
  User as PersonIcon,
  ShieldCheck as AdminIcon,
  Search as SearchIcon,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../app/axios';
import { useSelector } from 'react-redux';
import { API_URL } from '../../config/appConfig';
import NotificationsList from '../../components/notifications/NotificationsList';
import { useNavigate } from 'react-router-dom';

const SuperAdminNotifications = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipientType: 'all_admins',
    schoolId: '',
    userId: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Management state
  const [notifications, setNotifications] = useState([]);
  const [fetchingNotifications, setFetchingNotifications] = useState(false);
  
  const recipientOptions = [
    { value: 'all_admins', label: 'All Admin Accounts', icon: AdminIcon, description: 'Send to all school administrators' },
    { value: 'all_users', label: 'All Users', icon: PeopleIcon, description: 'Send to all users (admins, teachers, students)' },
    { value: 'specific_school', label: 'Specific School', icon: SchoolIcon, description: 'Send to all users in a particular school' },
    { value: 'specific_user', label: 'Specific User', icon: PersonIcon, description: 'Send to a single user' }
  ];

  // Load initial data
  useEffect(() => {
    fetchSchools();
    fetchNotifications();
  }, []);

  // Search users when needed
  useEffect(() => {
    if (formData.recipientType === 'specific_user' && userSearchQuery.length > 2) {
      const delayedSearch = setTimeout(() => {
        searchUsers();
      }, 500);
      return () => clearTimeout(delayedSearch);
    }
  }, [userSearchQuery, formData.recipientType]);

  const fetchSchools = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/api/superadmin/schools`);
      
      if (response.data && Array.isArray(response.data)) {
        setSchools(response.data);
      } else {
        setSchools([]);
      }
    } catch (error) {
      if (error.name === 'CanceledError') return;
      console.error('Error fetching schools:', error);
      toast.error(`Failed to load schools: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchNotifications = async () => {
    setFetchingNotifications(true);
    try {
      const response = await axiosInstance.get(`${API_URL}/api/notifications?limit=100`);
      setNotifications(response.data || []);
    } catch (error) {
      if (error.name === 'CanceledError') return;
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications history');
    } finally {
      setFetchingNotifications(false);
    }
  };

  const searchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        query: userSearchQuery.trim()
      });

      const response = await axiosInstance.get(`${API_URL}/api/superadmin/users/search?${params}`);
      
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      if (error.name === 'CanceledError') return;
      if (error.response?.status !== 404) {
        toast.error(`Failed to search users: ${error.response?.data?.message || error.message}`);
      }
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (name === 'recipientType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        schoolId: '',
        userId: ''
      }));
      setSelectedUser(null);
      setUserSearchQuery('');
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u._id === userId);
    setSelectedUser(user || null);
    setFormData({
      ...formData,
      userId: userId || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please provide both title and message');
      return;
    }

    if (formData.recipientType === 'specific_school' && !formData.schoolId) {
      toast.error('Please select a school');
      return;
    }

    if (formData.recipientType === 'specific_user' && !formData.userId) {
      toast.error('Please select a user');
      return;
    }

    setLoading(true);

    try {
      const requestPayload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        recipientType: formData.recipientType
      };
      
      if (formData.recipientType === 'specific_school') requestPayload.schoolId = formData.schoolId;
      if (formData.recipientType === 'specific_user') requestPayload.userId = formData.userId;

      const response = await axiosInstance.post(`${API_URL}/api/superadmin/notifications`, requestPayload);
      
      toast.success(`✅ Notification sent successfully!`);
      
      setFormData({
        title: '',
        message: '',
        recipientType: 'all_admins',
        schoolId: '',
        userId: ''
      });
      setSelectedUser(null);
      setUserSearchQuery('');
      
      // Refresh list
      fetchNotifications();
      
    } catch (error) {
      if (error.name === 'CanceledError') return;
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosInstance.delete(`${API_URL}/api/notifications/${id}`);
      toast.success('Notification deleted successfully');
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups = {};
    
    notifications.forEach(notification => {
      const schoolName = notification.schoolId?.name || 'System-wide / Global';
      if (!groups[schoolName]) {
        groups[schoolName] = [];
      }
      groups[schoolName].push(notification);
    });
    
    return groups;
  }, [notifications]);

  const getRecipientInfo = () => {
    const option = recipientOptions.find(opt => opt.value === formData.recipientType);
    return option || recipientOptions[0];
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <NotificationsIcon className="h-8 w-8 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications Hub</h1>
            <p className="text-sm text-muted-foreground">Manage platform communications system-wide.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="send">Send New</TabsTrigger>
          <TabsTrigger value="manage">Manage Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <SendIcon className="h-5 w-5" />
                    <span>Create Notification</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="recipientType">Recipient Type</Label>
                      <Select
                        value={formData.recipientType}
                        onValueChange={(value) => handleChange({ target: { name: 'recipientType', value } })}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recipientOptions.map((option) => {
                            const IconComponent = option.icon;
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center space-x-2">
                                  <IconComponent className="h-4 w-4 shrink-0" />
                                  <div>
                                    <div className="font-medium text-sm">{option.label}</div>
                                    <div className="text-[10px] text-muted-foreground leading-none">{option.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.recipientType === 'specific_school' && (
                      <div className="space-y-2">
                        <Label htmlFor="schoolId">Select School</Label>
                        <Select
                          value={formData.schoolId}
                          onValueChange={(value) => handleChange({ target: { name: 'schoolId', value } })}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a school..." />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school._id} value={school._id}>
                                <div>
                                  <div className="font-medium">{school.name}</div>
                                  <div className="text-xs text-muted-foreground">{school.emailDomain}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.recipientType === 'specific_user' && (
                      <div className="space-y-2">
                        <Label htmlFor="userSearch">Search User</Label>
                        <div className="relative">
                          <Input
                            id="userSearch"
                            type="text"
                            placeholder="Name or email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            disabled={loading}
                            className="pr-8"
                          />
                          {searchLoading && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {users.length > 0 && (
                          <Select
                            value={formData.userId}
                            onValueChange={handleUserSelect}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select user result..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u._id} value={u._id}>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-[10px]">
                                        {u.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                      <div className="text-sm font-medium leading-none">{u.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{u.email} • {u.role}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        disabled={loading}
                        required
                        placeholder="Notification heading..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        disabled={loading}
                        required
                        rows={4}
                        placeholder="Details of the notification..."
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <SendIcon className="mr-2 h-4 w-4" />
                          Send Notification
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">To:</span>
                    <Badge variant="outline" className="text-[10px]">
                      {getRecipientInfo().label}
                    </Badge>
                  </div>
                  {formData.schoolId && (
                    <div className="text-xs flex justify-between">
                      <span className="text-muted-foreground">School:</span>
                      <span className="font-medium text-primary">
                        {schools.find(s => s._id === formData.schoolId)?.name}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-bold truncate">
                      {formData.title || "Subject Title"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {formData.message || "Message body will appear here..."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Helpful Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] space-y-2 text-muted-foreground">
                  <p>• <strong>Global Notifications</strong> reach everyone in the system.</p>
                  <p>• Use <strong>Specific User</strong> for maintenance warnings or billing alerts.</p>
                  <p>• Schools without domains will be filtered by ID.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sent Notifications</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchNotifications}
                disabled={fetchingNotifications}
              >
                {fetchingNotifications ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Refresh List</span>
              </Button>
            </div>

            {fetchingNotifications && notifications.length === 0 ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(groupedNotifications).length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No sent notifications found</h3>
                <p className="text-sm text-muted-foreground">Sent notifications will appear here grouped by school.</p>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedNotifications).map(([schoolName, schoolNotifications]) => (
                  <div key={schoolName} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <SchoolIcon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-bold">{schoolName}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {schoolNotifications.length}
                      </Badge>
                    </div>
                    <NotificationsList 
                      notifications={schoolNotifications}
                      user={user}
                      tabValue={1} // "Sent" mode for list
                      onDelete={handleDeleteNotification}
                      onNavigate={(path) => navigate(path)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminNotifications;
