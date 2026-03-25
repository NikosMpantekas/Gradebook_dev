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
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
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

const CreateNotificationold = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    type: 'announcement',
    isImportant: false,
    scheduledFor: '',
    expiresAt: '',
    recipients: []
  });
  
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState(new Set(['basic', 'recipients', 'advanced']));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      // Fetch students
      const studentsResponse = await fetch(`${API_URL}/api/users?role=student`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.users || []);
      }

      // Fetch teachers
      const teachersResponse = await fetch(`${API_URL}/api/users?role=teacher`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json();
        setTeachers(teachersData.users || []);
      }

      // Fetch parents
      const parentsResponse = await fetch(`${API_URL}/api/users?role=parent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (parentsResponse.ok) {
        const parentsData = await parentsResponse.json();
        setParents(parentsData.users || []);
      }

    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to fetch recipients');
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

  const handleRecipientToggle = (recipientId, recipientType) => {
    const recipientKey = `${recipientType}_${recipientId}`;
    
    if (formData.recipients.includes(recipientKey)) {
      setFormData(prev => ({
        ...prev,
        recipients: prev.recipients.filter(id => id !== recipientKey)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipientKey]
      }));
    }
  };
  
  const isRecipientSelected = (recipientId, recipientType) => {
    const recipientKey = `${recipientType}_${recipientId}`;
    return formData.recipients.includes(recipientKey);
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

  const filterRecipients = (recipients, type) => {
    let filtered = recipients;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(recipient =>
        recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(recipient => recipient.role === filterRole);
    }
    
    return filtered;
  };

  const getFilteredStudents = () => filterRecipients(students, 'student');
  const getFilteredTeachers = () => filterRecipients(teachers, 'teacher');
  const getFilteredParents = () => filterRecipients(parents, 'parent');

  const selectAllInSection = (recipients, type) => {
    const recipientKeys = recipients.map(recipient => `${type}_${recipient._id}`);
    const newRecipients = [...new Set([...formData.recipients, ...recipientKeys])];
    setFormData(prev => ({ ...prev, recipients: newRecipients }));
  };

  const deselectAllInSection = (recipients, type) => {
    const recipientKeys = recipients.map(recipient => `${type}_${recipient._id}`);
    const newRecipients = formData.recipients.filter(id => !recipientKeys.includes(id));
    setFormData(prev => ({ ...prev, recipients: newRecipients }));
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
    
    if (formData.scheduledFor && formData.expiresAt) {
      const scheduledDate = new Date(formData.scheduledFor);
      const expiryDate = new Date(formData.expiresAt);
      
      if (scheduledDate >= expiryDate) {
        newErrors.expiresAt = 'Expiry date must be after scheduled date';
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Notification created successfully!');
        
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
        navigate('/app/teacher/notifications');
    } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error(error.message || 'Failed to create notification');
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Notification (Legacy)</h1>
            <p className="text-muted-foreground">
              Send important messages to your students, parents, and colleagues
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/teacher/notifications')}>
            <X className="mr-2 h-4 w-4" />
            Cancel
      </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Collapsible open={expandedSections.has('basic')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-6 w-6 text-primary" />
                    <CardTitle>Basic Information</CardTitle>
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
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter notification title..."
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Enter notification message..."
                    rows={4}
                    className={errors.message ? 'border-destructive' : ''}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="isImportant"
                    name="isImportant"
                    checked={formData.isImportant}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isImportant: checked }))}
                  />
                  <Label htmlFor="isImportant" className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span>Mark as Important</span>
                  </Label>
                </div>
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
                    <CardTitle>Select Recipients</CardTitle>
                    {formData.recipients.length > 0 && (
                      <Badge variant="default">{formData.recipients.length} selected</Badge>
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
              <CardContent className="pt-0">
                {/* Search and Filter */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipients by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Filter by role:</Label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="text-sm border border-border rounded px-2 py-1 bg-background"
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Students</option>
                      <option value="teacher">Teachers</option>
                      <option value="parent">Parents</option>
                    </select>
                  </div>
                </div>

                {/* Recipients Sections */}
                <div className="space-y-4">
                  {/* Students Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Students</h4>
                      <div className="flex space-x-2">
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllInSection(getFilteredStudents(), 'student')}
                    >
                      Select All
                    </Button>
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => deselectAllInSection(getFilteredStudents(), 'student')}
                        >
                          Deselect All
                    </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getFilteredStudents().map((student) => (
                        <div key={student._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                          <Checkbox
                            id={`student-${student._id}`}
                            checked={isRecipientSelected(student._id, 'student')}
                            onCheckedChange={() => handleRecipientToggle(student._id, 'student')}
                          />
                          <Label htmlFor={`student-${student._id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{student.name}</span>
                              <span className="text-sm text-muted-foreground">{student.email}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teachers Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Teachers</h4>
                      <div className="flex space-x-2">
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllInSection(getFilteredTeachers(), 'teacher')}
                    >
                      Select All
                    </Button>
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => deselectAllInSection(getFilteredTeachers(), 'teacher')}
                        >
                          Deselect All
                    </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getFilteredTeachers().map((teacher) => (
                        <div key={teacher._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                          <Checkbox
                            id={`teacher-${teacher._id}`}
                            checked={isRecipientSelected(teacher._id, 'teacher')}
                            onCheckedChange={() => handleRecipientToggle(teacher._id, 'teacher')}
                          />
                          <Label htmlFor={`teacher-${teacher._id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{teacher.name}</span>
                              <span className="text-sm text-muted-foreground">{teacher.email}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parents Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Parents</h4>
                      <div className="flex space-x-2">
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllInSection(getFilteredParents(), 'parent')}
                    >
                      Select All
                    </Button>
                    <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => deselectAllInSection(getFilteredParents(), 'parent')}
                        >
                          Deselect All
                    </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getFilteredParents().map((parent) => (
                        <div key={parent._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                          <Checkbox
                            id={`parent-${parent._id}`}
                            checked={isRecipientSelected(parent._id, 'parent')}
                            onCheckedChange={() => handleRecipientToggle(parent._id, 'parent')}
                          />
                          <Label htmlFor={`parent-${parent._id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{parent.name}</span>
                              <span className="text-sm text-muted-foreground">{parent.email}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {errors.recipients && (
                  <p className="text-sm text-destructive mt-2">{errors.recipients}</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Advanced Options Section */}
        <Collapsible open={expandedSections.has('advanced')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Plus className="h-6 w-6 text-primary" />
                    <CardTitle>Advanced Options</CardTitle>
                  </div>
                  {expandedSections.has('advanced') ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Notification Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledFor">Schedule For (Optional)</Label>
                    <Input
                      id="scheduledFor"
                      name="scheduledFor"
                      type="datetime-local"
                      value={formData.scheduledFor}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to send immediately
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                    <Input
                      id="expiresAt"
                      name="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      When this notification should expire
                    </p>
                  </div>
                </div>

                {errors.expiresAt && (
                  <p className="text-sm text-destructive">{errors.expiresAt}</p>
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
            onClick={() => navigate('/app/teacher/notifications')}
            disabled={loading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Notification'}
              </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateNotificationold;
