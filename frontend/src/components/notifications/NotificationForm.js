import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Users,
  Send,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Target,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { DatePicker } from '../ui/date-picker';

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      // Check for mobile using multiple methods
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileWidth = window.innerWidth < 768
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      setIsMobile(isTouchDevice && (isMobileWidth || isMobileUserAgent))
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

const NotificationForm = ({
  notification = null, 
  recipients = [], 
  subjects = [], 
  classes = [], 
  onSubmit, 
  onCancel, 
  isEditing = false, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    recipients: [],
    subjectId: '',
    classId: '',
    scheduledDate: '',
    scheduledTime: '',
    isScheduled: false,
    requiresConfirmation: false,
    expiresAt: ''
  });
  
  const [errors, setErrors] = useState({});
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'info',
        priority: notification.priority || 'normal',
        recipients: notification.recipients || [],
        subjectId: notification.subjectId || '',
        classId: notification.classId || '',
        scheduledDate: notification.scheduledDate || '',
        scheduledTime: notification.scheduledTime || '',
        isScheduled: notification.isScheduled || false,
        requiresConfirmation: notification.requiresConfirmation || false,
        expiresAt: notification.expiresAt || ''
      });
      
      setSelectedRecipients(notification.recipients || []);
    }
  }, [notification]);

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

  const handleRecipientChange = (recipientId, checked) => {
    let newRecipients;
    if (checked) {
      newRecipients = [...formData.recipients, recipientId];
    } else {
      newRecipients = formData.recipients.filter(id => id !== recipientId);
    }
    
    setFormData(prev => ({
      ...prev,
      recipients: newRecipients
    }));
    
    setSelectedRecipients(newRecipients);
  };

  const handleDateChange = (dateValue) => {
    setFormData(prev => ({
      ...prev,
      scheduledDate: dateValue
    }));
    
    if (errors.scheduledDate) {
      setErrors(prev => ({
        ...prev,
        scheduledDate: ''
      }));
    }
  };

  const handleExpiryDateTimeChange = (dateTimeValue) => {
    setFormData(prev => ({
      ...prev,
      expiresAt: dateTimeValue
    }));
    
    if (errors.expiresAt) {
      setErrors(prev => ({
        ...prev,
        expiresAt: ''
      }));
    }
  };

  const handleSelectAllRecipients = (checked) => {
    if (checked) {
      const allRecipientIds = recipients.map(r => r._id);
      setFormData(prev => ({
        ...prev,
        recipients: allRecipientIds
      }));
      setSelectedRecipients(allRecipientIds);
    } else {
      setFormData(prev => ({
        ...prev,
        recipients: []
      }));
      setSelectedRecipients([]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    if (formData.recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
    }
    
    if (formData.isScheduled) {
      if (!formData.scheduledDate) {
        newErrors.scheduledDate = 'Scheduled date is required';
      }
      if (!formData.scheduledTime) {
        newErrors.scheduledTime = 'Scheduled time is required';
      }
    }
    
    if (formData.expiresAt && new Date(formData.expiresAt) <= new Date()) {
      newErrors.expiresAt = 'Expiration date must be in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      scheduledAt: formData.isScheduled ? `${formData.scheduledDate}T${formData.scheduledTime}` : null
    };
    
    // Remove individual date/time fields
    delete submitData.scheduledDate;
    delete submitData.scheduledTime;
    
    onSubmit(submitData);
  };

  const notificationTypes = [
    { value: 'info', label: 'Information', icon: Info, color: 'bg-blue-100 text-blue-800' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'warning', label: 'Warning', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'error', label: 'Error', icon: XCircle, color: 'bg-red-100 text-red-800' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const getRecipientCount = () => {
    if (formData.subjectId && formData.classId) {
      return recipients.filter(r => 
        r.subjectId === formData.subjectId && r.classId === formData.classId
      ).length;
    } else if (formData.subjectId) {
      return recipients.filter(r => r.subjectId === formData.subjectId).length;
    } else if (formData.classId) {
      return recipients.filter(r => r.classId === formData.classId).length;
    }
    return recipients.length;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={errors.title ? 'border-destructive' : ''}
                placeholder="Enter notification title"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              className={errors.message ? 'border-destructive' : ''}
              placeholder="Enter notification message"
              rows={4}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityLevels.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={priority.color}>
                          {priority.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requiresConfirmation"
                    name="requiresConfirmation"
                    checked={formData.requiresConfirmation}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, requiresConfirmation: checked }))
                    }
                  />
                  <Label htmlFor="requiresConfirmation" className="text-sm font-normal">
                    Requires confirmation
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recipients</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subjectId">Subject (Optional)</Label>
              <Select value={formData.subjectId} onValueChange={(value) => handleSelectChange('subjectId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="classId">Class (Optional)</Label>
              <Select value={formData.classId} onValueChange={(value) => handleSelectChange('classId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Recipients</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllRecipients(true)}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllRecipients(false)}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {getRecipientCount()} recipients available
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {recipients.map((recipient) => {
                  const isSelected = formData.recipients.includes(recipient._id);
                  return (
                    <div key={recipient._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`recipient-${recipient._id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleRecipientChange(recipient._id, checked)}
                      />
                      <Label htmlFor={`recipient-${recipient._id}`} className="text-sm font-normal">
                        {recipient.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {errors.recipients && <p className="text-sm text-destructive">{errors.recipients}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Scheduling</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isScheduled"
              name="isScheduled"
              checked={formData.isScheduled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isScheduled: checked }))
              }
            />
            <Label htmlFor="isScheduled" className="text-sm font-normal">
              Schedule for later
            </Label>
          </div>
          
          {formData.isScheduled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date *</Label>
                {isMobile ? (
                  // Mobile: Use native date input
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    className={errors.scheduledDate ? 'border-destructive' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                ) : (
                  // Desktop: Use shadcn DatePicker
                  <DatePicker
                    id="scheduledDate"
                    placeholder="Select scheduled date"
                    value={formData.scheduledDate}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.scheduledDate ? 'border-destructive' : ''}
                  />
                )}
                {errors.scheduledDate && <p className="text-sm text-destructive">{errors.scheduledDate}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Time *</Label>
                {/* Always use native time input as it works well on both desktop and mobile */}
                <Input
                  id="scheduledTime"
                  name="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                  className={errors.scheduledTime ? 'border-destructive' : ''}
                />
                {errors.scheduledTime && <p className="text-sm text-destructive">{errors.scheduledTime}</p>}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            {/* Use native datetime-local input on both mobile and desktop as it provides better UX */}
            <Input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={handleInputChange}
              className={errors.expiresAt ? 'border-destructive' : ''}
              min={new Date().toISOString().slice(0, 16)}
            />
            {errors.expiresAt && <p className="text-sm text-destructive">{errors.expiresAt}</p>}
            <p className="text-xs text-muted-foreground">
              Leave empty if the notification should not expire
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Sending...</span>
            </div>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Notification' : 'Send Notification'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default NotificationForm; 