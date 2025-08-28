import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Save, 
  X, 
  Send, 
  Bell, 
  Users,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { API_URL } from '../../config/appConfig';
import NotificationForm from './components/NotificationForm';
import NotificationRecipients from './components/NotificationRecipients';
import { useTranslation } from 'react-i18next';

const CreateNotification = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipients: []
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set(['basic', 'recipients']));
  
  // Add recipients state
  const [recipientsData, setRecipientsData] = useState({
    students: [],
    teachers: [],
    parents: []
  });
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  
  // Add filter options state
  const [filterOptions, setFilterOptions] = useState({
    schoolBranches: [],
    directions: [],
    subjects: []
  });
  const [selectedFilters, setSelectedFilters] = useState({
    schoolBranch: '',
    direction: '',
    subject: ''
  });

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  // Check if user has permission to send notifications
  useEffect(() => {
    if (user?.role === 'teacher' && user?.canSendNotifications === false) {
      // Teacher doesn't have permission to send notifications
      toast.error(t('teacherNotifications.createPage.noPermission'));
      navigate('/app/teacher/dashboard');
    } else if (user?.role === 'admin') {
      // Admin always has permission, nothing to check
      console.log('Admin user accessing notification creation');
    } else if (user?.role === 'secretary' && !user?.secretaryPermissions?.canSendNotifications) {
      // Secretary without proper permissions
      toast.error(t('teacherNotifications.createPage.noPermission'));
      navigate('/app/admin');
    }
  }, [user, navigate]);

  // Load filter options when component mounts
  useEffect(() => {
    if (user?.token) {
      loadFilterOptions();
    }
  }, [user]);

  // Load students when filters change
  useEffect(() => {
    if (selectedFilters.schoolBranch && selectedFilters.direction && selectedFilters.subject && user?.token) {
      loadFilteredUsers();
    } else {
      setRecipientsData({ students: [], teachers: [], parents: [] });
    }
  }, [selectedFilters, user]);

  const loadFilterOptions = async () => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Get filter options first
      const filtersEndpoint = `${API_URL}/api/students/notification/filters`;
      const filtersResponse = await fetch(filtersEndpoint, config);
      
      if (filtersResponse.ok) {
        const filterData = await filtersResponse.json();
        setFilterOptions(filterData);
        console.log('[CreateNotification] Loaded filter options:', filterData);
      } else {
        console.error('Failed to load filter options:', filtersResponse.status);
        setFilterOptions({ schoolBranches: [], directions: [], subjects: [] });
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      setFilterOptions({ schoolBranches: [], directions: [], subjects: [] });
    }
  };

  const loadFilteredUsers = async () => {
    if (!selectedFilters.schoolBranch || !selectedFilters.direction || !selectedFilters.subject) return;
    
    try {
      setRecipientsLoading(true);
      
      const config = {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Build query parameters for filtered users
      const params = new URLSearchParams({
        schoolBranch: selectedFilters.schoolBranch,
        direction: selectedFilters.direction,
        subject: selectedFilters.subject,
        userRole: 'all' // Get all user types
      });
      
      const endpoint = `${API_URL}/api/students/notification/filtered?${params}`;
      const response = await fetch(endpoint, config);
      
      if (response.ok) {
        const users = await response.json();
        
        // Filter users by role
        setRecipientsData({
          students: users.filter(user => user.role === 'student') || [],
          teachers: users.filter(user => user.role === 'teacher') || [],
          parents: users.filter(user => user.role === 'parent') || []
        });
        
        console.log('[CreateNotification] Loaded filtered users:', users);
      } else {
        console.error('Failed to load filtered users:', response.status);
        setRecipientsData({ students: [], teachers: [], parents: [] });
      }
    } catch (error) {
      console.error('Error loading filtered users:', error);
      setRecipientsData({ students: [], teachers: [], parents: [] });
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    // Reset dependent filters
    if (filterName === 'schoolBranch') {
      setSelectedFilters(prev => ({ ...prev, direction: '', subject: '' }));
    } else if (filterName === 'direction') {
      setSelectedFilters(prev => ({ ...prev, subject: '' }));
    }
  };



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRecipientsChange = (recipients) => {
    setFormData(prev => ({
      ...prev,
      recipients
    }));
  };

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = t('teacherNotifications.createPage.titleRequired');
    }
    
    if (!formData.message.trim()) {
      newErrors.message = t('teacherNotifications.createPage.messageRequired');
    }
    
    if (formData.recipients.length === 0) {
      newErrors.recipients = t('teacherNotifications.createPage.recipientsRequired');
    }
    
    if (formData.scheduledFor && formData.expiresAt) {
      const scheduledDate = new Date(formData.scheduledFor);
      const expiryDate = new Date(formData.expiresAt);
      
      if (scheduledDate >= expiryDate) {
        newErrors.expiresAt = t('teacherNotifications.createPage.expiryAfterSchedule');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        type: formData.type,
        isImportant: formData.isImportant,
        scheduledFor: formData.scheduledFor || null,
        expiresAt: formData.expiresAt || null,
        recipients: formData.recipients.map(recipient => {
          const [type, id] = recipient.split('_');
          return { type, id };
        })
      };
      
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(t('teacherNotifications.createPage.createSuccess'));
        
        // Reset form
        setFormData({
          title: '',
          message: '',
          priority: 'normal',
          type: 'announcement',
          isImportant: false,
          scheduledFor: '',
          expiresAt: '',
          recipients: []
        });
        
        // Navigate to notifications list
        const redirectPath = user.role === 'admin' || user.role === 'superadmin' 
          ? '/app/admin/notifications'
          : '/app/teacher/notifications';
        
        console.log(`[CreateNotification] Redirecting ${user.role} to: ${redirectPath}`);
        navigate(redirectPath);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || t('teacherNotifications.createPage.createFailed'));
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error(error.message || t('teacherNotifications.createPage.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'secondary',
      normal: 'default',
      high: 'destructive',
      urgent: 'destructive'
    };
    return colors[priority] || 'default';
  };

  const getTypeIcon = (type) => {
    const icons = {
      announcement: '📢',
      reminder: '⏰',
      alert: '⚠️',
      update: '📝'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {user.role === 'admin' ? t('teacherNotifications.createPage.titleAdmin') : t('teacherNotifications.createPage.titleTeacher')}
            </h1>
            <p className="text-muted-foreground">
              {user.role === 'admin' 
                ? t('teacherNotifications.createPage.subtitleAdmin') : 
                t('teacherNotifications.createPage.subtitleTeacher')
              }
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cancelPath = user.role === 'admin' || user.role === 'superadmin' 
                  ? '/app/admin/notifications'
                  : '/app/teacher/notifications';
                navigate(cancelPath);
              }}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <Collapsible open={expandedSections.has('basic')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-6 w-6 text-primary" />
                      <CardTitle>{t('teacherNotifications.createPage.basicInfoTitle')}</CardTitle>
                    </div>
                    {expandedSections.has('basic') ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
          <NotificationForm
            formData={formData}
                    errors={errors}
            onChange={handleInputChange}
                    disabled={loading}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Recipients Section */}
          <Collapsible open={expandedSections.has('recipients')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-6 w-6 text-primary" />
                      <CardTitle>{t('teacherNotifications.createPage.recipientsTitle')}</CardTitle>
                      {formData.recipients.length > 0 && (
                        <Badge variant="default">{t('teacherNotifications.createPage.selectedCount', { count: formData.recipients.length })}</Badge>
                      )}
                    </div>
                    {expandedSections.has('recipients') ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Filter Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolBranch">{t('teacherNotifications.createPage.schoolBranch')}</Label>
                      <Select 
                        value={selectedFilters.schoolBranch} 
                        onValueChange={(value) => handleFilterChange('schoolBranch', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('teacherNotifications.createPage.branchPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.schoolBranches.map((branch) => (
                            <SelectItem key={branch.value} value={branch.value}>
                              {branch.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direction">{t('teacherNotifications.createPage.direction')}</Label>
                      <Select 
                        value={selectedFilters.direction} 
                        onValueChange={(value) => handleFilterChange('direction', value)}
                        disabled={!selectedFilters.schoolBranch}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('teacherNotifications.createPage.directionPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.directions.map((direction) => (
                            <SelectItem key={direction.value} value={direction.value}>
                              {direction.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">{t('teacherNotifications.createPage.subject')}</Label>
                      <Select 
                        value={selectedFilters.subject} 
                        onValueChange={(value) => handleFilterChange('subject', value)}
                        disabled={!selectedFilters.direction}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('teacherNotifications.createPage.subjectPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.subjects.map((subject) => (
                            <SelectItem key={subject.value} value={subject.value}>
                              {subject.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Recipients Selection */}
                  <NotificationRecipients
                    selectedRecipients={formData.recipients}
                    onRecipientsChange={handleRecipientsChange}
                    error={errors.recipients}
                    disabled={loading}
                    currentUserRole={user?.role}
                    students={recipientsData.students}
                    teachers={recipientsData.teachers}
                    parents={recipientsData.parents}
                    loading={recipientsLoading}
                  />
                  
                  {errors.recipients && (
                    <p className="text-sm text-destructive mt-2">{errors.recipients}</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cancelPath = user.role === 'admin' || user.role === 'superadmin' 
                  ? '/app/admin/notifications'
                  : '/app/teacher/notifications';
                navigate(cancelPath);
              }}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
            <Button type="submit" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? t('teacherNotifications.createPage.creating') : t('teacherNotifications.create')}
            </Button>
          </div>
      </form>
    </div>
  );
};

export default CreateNotification;
