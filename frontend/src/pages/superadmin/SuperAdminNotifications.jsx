import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Textarea } from '../../components/ui/textarea';
import {
  Send as SendIcon,
  Bell as NotificationsIcon,
  Users as PeopleIcon,
  School as SchoolIcon,
  User as PersonIcon,
  ShieldCheck as AdminIcon,
  Search as SearchIcon,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { API_URL } from '../../config/appConfig';

const SuperAdminNotifications = () => {
  const { user } = useSelector((state) => state.auth);
  
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
  
  const recipientOptions = [
    { value: 'all_admins', label: 'All Admin Accounts', icon: AdminIcon, description: 'Send to all school administrators' },
    { value: 'all_users', label: 'All Users', icon: PeopleIcon, description: 'Send to all users (admins, teachers, students)' },
    { value: 'specific_school', label: 'Specific School', icon: SchoolIcon, description: 'Send to all users in a particular school' },
    { value: 'specific_user', label: 'Specific User', icon: PersonIcon, description: 'Send to a single user' }
  ];

  // Load schools when component mounts
  useEffect(() => {
    fetchSchools();
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
      if (!user?.token) {
        console.error('No authentication token available for fetching schools');
        return;
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        timeout: 10000
      };

      console.log('Fetching schools from:', `${API_URL}/api/superadmin/schools`);
      const response = await axios.get(`${API_URL}/api/superadmin/schools`, config);
      
      if (response.data && Array.isArray(response.data)) {
        setSchools(response.data);
        console.log(`Loaded ${response.data.length} schools`);
      } else {
        console.warn('Unexpected schools response format:', response.data);
        setSchools([]);
      }
    } catch (error) {
      console.error('Error fetching schools:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(`Failed to load schools: ${error.response?.data?.message || error.message}`);
    }
  };

  const searchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    
    if (!user?.token) {
      console.error('No authentication token available for user search');
      toast.error('Authentication required. Please log in again.');
      return;
    }
    
    setSearchLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        timeout: 10000
      };

      const params = new URLSearchParams({
        query: userSearchQuery.trim()
      });

      console.log('Searching users:', `${API_URL}/api/superadmin/users/search?${params}`);
      const response = await axios.get(`${API_URL}/api/superadmin/users/search?${params}`, config);
      
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
        console.log(`Found ${response.data.length} users matching '${userSearchQuery}'`);
      } else {
        console.warn('Unexpected user search response format:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        query: userSearchQuery
      });
      
      if (error.response?.status === 404) {
        // No users found - not really an error
        setUsers([]);
      } else {
        toast.error(`Failed to search users: ${error.response?.data?.message || error.message}`);
      }
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
    
    // Reset dependent fields when recipient type changes
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
    
    // Enhanced validation
    if (!formData.title.trim()) {
      toast.error('Please provide a notification title');
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error('Please provide a notification message');
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

    // Validate token exists
    if (!user?.token) {
      toast.error('Authentication token not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      // Prepare request payload with proper validation
      const requestPayload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        recipientType: formData.recipientType
      };
      
      // Add conditional fields only if they exist and are valid
      if (formData.recipientType === 'specific_school' && formData.schoolId) {
        requestPayload.schoolId = formData.schoolId;
      }
      
      if (formData.recipientType === 'specific_user' && formData.userId) {
        requestPayload.userId = formData.userId;
      }
      
      console.log('Sending notification request:', {
        url: `${API_URL}/api/superadmin/notifications`,
        payload: requestPayload,
        recipientType: formData.recipientType
      });

      const config = {
        headers: {
          'Content-Type': 'application/json',  
          Authorization: `Bearer ${user.token}`
        },
        timeout: 30000 // 30 second timeout
      };

      const response = await axios.post(`${API_URL}/api/superadmin/notifications`, requestPayload, config);
      
      console.log('Notification sent successfully:', response.data);
      
      // Handle different response formats
      const recipientCount = response.data?.recipientCount || response.data?.count || 'unknown';
      toast.success(`✅ Notification sent successfully to ${recipientCount} recipient(s)!`);
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        recipientType: 'all_admins',
        schoolId: '',
        userId: ''
      });
      setSelectedUser(null);
      setUserSearchQuery('');
      
    } catch (error) {
      console.error('Detailed error sending notification:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Enhanced error messages based on error type
      let errorMessage = 'Failed to send notification';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || 'Invalid request data. Please check your inputs.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to send notifications.';
        } else if (status === 404) {
          errorMessage = 'Notification service not found. Please contact support.';
        } else if (status === 500) {
          errorMessage = data?.message || 'Server error occurred. Please try again later.';
        } else {
          errorMessage = data?.message || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        // Other error
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRecipientInfo = () => {
    const option = recipientOptions.find(opt => opt.value === formData.recipientType);
    return option || recipientOptions[0];
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <NotificationsIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">SuperAdmin Notifications</h1>
              <p className="text-muted-foreground">Send targeted notifications to users across the platform with easy-to-use filters.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SendIcon className="h-5 w-5" />
                <span>Send Notification</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient Type Selection */}
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
                              <IconComponent className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* School Selection for specific school */}
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

                {/* User Selection for specific user */}
                {formData.recipientType === 'specific_user' && (
                  <div className="space-y-2">
                    <Label htmlFor="userSearch">Search and Select User</Label>
                    <div className="relative">
                      <Input
                        id="userSearch"
                        type="text"
                        placeholder="Type name or email to search..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        disabled={loading}
                        className="pr-8"
                      />
                      {searchLoading && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin" />
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
                          <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-muted-foreground">{user.email} • {user.role}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Notification Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Notification Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    placeholder="Enter a clear, descriptive title..."
                  />
                </div>

                {/* Notification Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Notification Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    rows={4}
                    placeholder="Enter your message here..."
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Notification Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-primary">Recipient Type:</Label>
                <Badge variant="outline" className="mt-1 flex w-fit items-center space-x-1">
                  {(() => {
                    const recipientInfo = getRecipientInfo();
                    const IconComponent = recipientInfo.icon;
                    return (
                      <>
                        <IconComponent className="h-3 w-3" />
                        <span>{recipientInfo.label}</span>
                      </>
                    );
                  })()}
                </Badge>
              </div>

              {formData.schoolId && (
                <div>
                  <Label className="text-sm font-medium text-primary">Selected School:</Label>
                  <p className="text-sm mt-1">
                    {schools.find(s => s._id === formData.schoolId)?.name || 'Loading...'}
                  </p>
                </div>
              )}

              {selectedUser && (
                <div>
                  <Label className="text-sm font-medium text-primary">Selected User:</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-sm font-medium text-primary">Title:</Label>
                <p className={`text-sm mt-1 ${formData.title ? '' : 'italic text-muted-foreground'}`}>
                  {formData.title || 'Enter notification title...'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-primary">Message:</Label>
                <p className={`text-sm mt-1 ${formData.message ? '' : 'italic text-muted-foreground'}`}>
                  {formData.message || 'Enter notification message...'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm">All Admins</h4>
                  <p className="text-xs text-muted-foreground">Sends to all school administrators across all schools</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">All Users</h4>
                  <p className="text-xs text-muted-foreground">Sends to every user in the system (admins, teachers, students)</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Specific School</h4>
                  <p className="text-xs text-muted-foreground">Sends to all users within a selected school</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Specific User</h4>
                  <p className="text-xs text-muted-foreground">Sends to one individual user by searching their name or email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminNotifications;
