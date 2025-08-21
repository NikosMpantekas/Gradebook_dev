import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Plus,
  Users,
  Settings,
  Eye,
  EyeOff,
  Save,
  X,
  Info,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Spinner } from '../../components/ui/spinner';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';

const MaintenanceAnnouncements = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    scheduledStart: '',
    scheduledEnd: '',
    targetRoles: ['admin', 'teacher', 'student', 'parent', 'secretary'],
    affectedServices: [],
    showOnDashboard: true,
    isActive: true
  });

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    }
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/maintenance-announcements`, getAuthConfig());
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load maintenance announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchAnnouncements();
    }
  }, [user]);

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      scheduledStart: '',
      scheduledEnd: '',
      targetRoles: ['admin', 'teacher', 'student', 'parent', 'secretary'],
      affectedServices: [],
      showOnDashboard: true,
      isActive: true
    });
    setEditingAnnouncement(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.message || !formData.scheduledStart || !formData.scheduledEnd) {
        toast.error('Please fill in all required fields');
        return;
      }

      const startDate = new Date(formData.scheduledStart);
      const endDate = new Date(formData.scheduledEnd);

      if (startDate >= endDate) {
        toast.error('End time must be after start time');
        return;
      }

      if (editingAnnouncement) {
        await axios.put(
          `${API_URL}/api/maintenance-announcements/${editingAnnouncement._id}`,
          formData,
          getAuthConfig()
        );
        toast.success('Announcement updated successfully');
      } else {
        await axios.post(`${API_URL}/api/maintenance-announcements`, formData, getAuthConfig());
        toast.success('Announcement created successfully');
      }

      setShowCreateDialog(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      scheduledStart: new Date(announcement.scheduledStart).toISOString().slice(0, 16),
      scheduledEnd: new Date(announcement.scheduledEnd).toISOString().slice(0, 16),
      targetRoles: announcement.targetRoles,
      affectedServices: announcement.affectedServices,
      showOnDashboard: announcement.showOnDashboard,
      isActive: announcement.isActive
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/maintenance-announcements/${id}`, getAuthConfig());
      toast.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement) => {
    try {
      await axios.put(
        `${API_URL}/api/maintenance-announcements/${announcement._id}`,
        { isActive: !announcement.isActive },
        getAuthConfig()
      );
      toast.success(`Announcement ${!announcement.isActive ? 'activated' : 'deactivated'}`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isAnnouncementActive = (announcement) => {
    const now = new Date();
    const start = new Date(announcement.scheduledStart);
    const end = new Date(announcement.scheduledEnd);
    return announcement.isActive && start <= now && end >= now;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner className="text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-wide">Maintenance Announcements</h1>
          <p className="text-muted-foreground">Create and manage scheduled maintenance messages for all users</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Maintenance announcement title"
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Detailed maintenance message"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">{formData.message.length}/500 characters</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledStart">Start Time *</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) => handleInputChange('scheduledStart', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduledEnd">End Time *</Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    value={formData.scheduledEnd}
                    onChange={(e) => handleInputChange('scheduledEnd', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Target Roles</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['admin', 'teacher', 'student', 'parent', 'secretary'].map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={formData.targetRoles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label htmlFor={role} className="capitalize text-sm">{role}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOnDashboard"
                    checked={formData.showOnDashboard}
                    onCheckedChange={(checked) => handleInputChange('showOnDashboard', checked)}
                  />
                  <Label htmlFor="showOnDashboard">Show on Dashboard</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingAnnouncement ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Announcements</h3>
              <p className="text-muted-foreground mb-4">Create your first maintenance announcement to notify users about scheduled maintenance.</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement._id} className={`${isAnnouncementActive(announcement) ? 'border-l-4 border-l-green-500' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(announcement.type)}`}>
                      {getTypeIcon(announcement.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={announcement.isActive ? 'default' : 'secondary'}>
                          {announcement.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {announcement.type}
                        </Badge>
                        {isAnnouncementActive(announcement) && (
                          <Badge variant="default" className="bg-green-500">
                            Currently Showing
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(announcement)}
                    >
                      {announcement.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(announcement._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{announcement.message}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Start Time</p>
                      <p className="text-muted-foreground">
                        {new Date(announcement.scheduledStart).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">End Time</p>
                      <p className="text-muted-foreground">
                        {new Date(announcement.scheduledEnd).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Target Roles</p>
                      <p className="text-muted-foreground">
                        {announcement.targetRoles.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created by {announcement.createdBy?.name}</span>
                    <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MaintenanceAnnouncements;
