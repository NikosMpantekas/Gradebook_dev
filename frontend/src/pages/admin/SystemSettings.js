import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Users,
  Database,
  Globe,
  Palette,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

const SystemSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General Settings
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    academicYear: '',
    semester: '',
    timezone: 'UTC',
    language: 'en',
    
    // Feature Toggles
    enableNotifications: true,
    enableGrades: true,
    enableAttendance: true,
    enableSchedule: true,
    enableReports: true,
    enableParentPortal: true,
    
    // Security Settings
    passwordMinLength: 8,
    requirePasswordChange: false,
    passwordChangeDays: 90,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    enableTwoFactor: false,
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    notificationRetention: 30,
    
    // Grade Settings
    gradeScale: 'percentage',
    passingGrade: 60,
    gradeRounding: 'nearest',
    allowGradeOverrides: false,
    requireGradeApproval: false,
    
    // System Settings
    maintenanceMode: false,
    debugMode: false,
    logLevel: 'info',
    backupFrequency: 'daily',
    dataRetention: 365
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      toast.error('Access denied. Administrator privileges required.');
      navigate('/app/dashboard');
      return;
    }
    
    // Load current settings
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from API
      // For now, using default values
      console.log('Loading system settings...');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
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

  const handleSwitchChange = (name, checked) => {
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSelectChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateSettings = () => {
    const newErrors = {};
    
    if (!settings.schoolName.trim()) {
      newErrors.schoolName = 'School name is required';
    }
    
    if (!settings.schoolEmail.trim()) {
      newErrors.schoolEmail = 'School email is required';
    } else if (!/\S+@\S+\.\S+/.test(settings.schoolEmail)) {
      newErrors.schoolEmail = 'Valid email is required';
    }
    
    if (settings.passwordMinLength < 6) {
      newErrors.passwordMinLength = 'Minimum password length must be at least 6';
    }
    
    if (settings.maxLoginAttempts < 1) {
      newErrors.maxLoginAttempts = 'Maximum login attempts must be at least 1';
    }
    
    if (settings.lockoutDuration < 1) {
      newErrors.lockoutDuration = 'Lockout duration must be at least 1 minute';
    }
    
    if (settings.passingGrade < 0 || settings.passingGrade > 100) {
      newErrors.passingGrade = 'Passing grade must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }
    
    try {
      setSaving(true);
      // In a real app, this would save to API
      console.log('Saving system settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('System settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      loadSettings();
      toast.info('Settings reset to default values');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-wide">System Settings</h1>
          <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>General Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                id="schoolName"
                name="schoolName"
                value={settings.schoolName}
                onChange={handleInputChange}
                className={errors.schoolName ? 'border-destructive' : ''}
                placeholder="Enter school name"
              />
              {errors.schoolName && <p className="text-sm text-destructive">{errors.schoolName}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolEmail">School Email *</Label>
              <Input
                id="schoolEmail"
                name="schoolEmail"
                type="email"
                value={settings.schoolEmail}
                onChange={handleInputChange}
                className={errors.schoolEmail ? 'border-destructive' : ''}
                placeholder="admin@school.com"
              />
              {errors.schoolEmail && <p className="text-sm text-destructive">{errors.schoolEmail}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schoolPhone">School Phone</Label>
              <Input
                id="schoolPhone"
                name="schoolPhone"
                value={settings.schoolPhone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                name="academicYear"
                value={settings.academicYear}
                onChange={handleInputChange}
                placeholder="2024-2025"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="schoolAddress">School Address</Label>
            <Textarea
              id="schoolAddress"
              name="schoolAddress"
              value={settings.schoolAddress}
              onChange={handleInputChange}
              placeholder="Enter complete school address"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="semester">Current Semester</Label>
              <Select value={settings.semester} onValueChange={(value) => handleSelectChange('semester', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => handleSelectChange('timezone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={settings.language} onValueChange={(value) => handleSelectChange('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Feature Toggles</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications System</Label>
                <p className="text-sm text-muted-foreground">Enable push and email notifications</p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => handleSwitchChange('enableNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Grade Management</Label>
                <p className="text-sm text-muted-foreground">Enable grade entry and management</p>
              </div>
              <Switch
                checked={settings.enableGrades}
                onCheckedChange={(checked) => handleSwitchChange('enableGrades', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Attendance Tracking</Label>
                <p className="text-sm text-muted-foreground">Enable attendance recording</p>
              </div>
              <Switch
                checked={settings.enableAttendance}
                onCheckedChange={(checked) => handleSwitchChange('enableAttendance', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Schedule Management</Label>
                <p className="text-sm text-muted-foreground">Enable class scheduling</p>
              </div>
              <Switch
                checked={settings.enableSchedule}
                onCheckedChange={(checked) => handleSwitchChange('enableSchedule', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reports & Analytics</Label>
                <p className="text-sm text-muted-foreground">Enable reporting features</p>
              </div>
              <Switch
                checked={settings.enableReports}
                onCheckedChange={(checked) => handleSwitchChange('enableReports', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Parent Portal</Label>
                <p className="text-sm text-muted-foreground">Enable parent access</p>
              </div>
              <Switch
                checked={settings.enableParentPortal}
                onCheckedChange={(checked) => handleSwitchChange('enableParentPortal', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
              <Input
                id="passwordMinLength"
                name="passwordMinLength"
                type="number"
                min="6"
                max="20"
                value={settings.passwordMinLength}
                onChange={handleInputChange}
                className={errors.passwordMinLength ? 'border-destructive' : ''}
              />
              {errors.passwordMinLength && <p className="text-sm text-destructive">{errors.passwordMinLength}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                name="maxLoginAttempts"
                type="number"
                min="1"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={handleInputChange}
                className={errors.maxLoginAttempts ? 'border-destructive' : ''}
              />
              {errors.maxLoginAttempts && <p className="text-sm text-destructive">{errors.maxLoginAttempts}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                name="lockoutDuration"
                type="number"
                min="1"
                max="60"
                value={settings.lockoutDuration}
                onChange={handleInputChange}
                className={errors.lockoutDuration ? 'border-destructive' : ''}
              />
              {errors.lockoutDuration && <p className="text-sm text-destructive">{errors.lockoutDuration}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passwordChangeDays">Password Change Days</Label>
              <Input
                id="passwordChangeDays"
                name="passwordChangeDays"
                type="number"
                min="0"
                max="365"
                value={settings.passwordChangeDays}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
            </div>
            <Switch
              checked={settings.enableTwoFactor}
              onCheckedChange={(checked) => handleSwitchChange('enableTwoFactor', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Password Change</Label>
              <p className="text-sm text-muted-foreground">Force password changes periodically</p>
            </div>
            <Switch
              checked={settings.requirePasswordChange}
              onCheckedChange={(checked) => handleSwitchChange('requirePasswordChange', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grade Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Grade Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeScale">Grade Scale</Label>
              <Select value={settings.gradeScale} onValueChange={(value) => handleSelectChange('gradeScale', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (0-100)</SelectItem>
                  <SelectItem value="letter">Letter Grades (A-F)</SelectItem>
                  <SelectItem value="gpa">GPA (0.0-4.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passingGrade">Passing Grade</Label>
              <Input
                id="passingGrade"
                name="passingGrade"
                type="number"
                min="0"
                max="100"
                value={settings.passingGrade}
                onChange={handleInputChange}
                className={errors.passingGrade ? 'border-destructive' : ''}
              />
              {errors.passingGrade && <p className="text-sm text-destructive">{errors.passingGrade}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gradeRounding">Grade Rounding</Label>
              <Select value={settings.gradeRounding} onValueChange={(value) => handleSelectChange('gradeRounding', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">Nearest</SelectItem>
                  <SelectItem value="up">Round Up</SelectItem>
                  <SelectItem value="down">Round Down</SelectItem>
                  <SelectItem value="none">No Rounding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Grade Overrides</Label>
                <p className="text-sm text-muted-foreground">Allow teachers to override final grades</p>
              </div>
              <Switch
                checked={settings.allowGradeOverrides}
                onCheckedChange={(checked) => handleSwitchChange('allowGradeOverrides', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Grade Approval</Label>
                <p className="text-sm text-muted-foreground">Require admin approval for grade changes</p>
              </div>
              <Switch
                checked={settings.requireGradeApproval}
                onCheckedChange={(checked) => handleSwitchChange('requireGradeApproval', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logLevel">Log Level</Label>
              <Select value={settings.logLevel} onValueChange={(value) => handleSelectChange('logLevel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="backupFrequency">Backup Frequency</Label>
              <Select value={settings.backupFrequency} onValueChange={(value) => handleSelectChange('backupFrequency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataRetention">Data Retention (days)</Label>
              <Input
                id="dataRetention"
                name="dataRetention"
                type="number"
                min="30"
                max="3650"
                value={settings.dataRetention}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notificationRetention">Notification Retention (days)</Label>
              <Input
                id="notificationRetention"
                name="notificationRetention"
                type="number"
                min="7"
                max="365"
                value={settings.notificationRetention}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Enable system maintenance mode</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSwitchChange('maintenanceMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Mode</Label>
                <p className="text-sm text-muted-foreground">Enable debug logging and features</p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => handleSwitchChange('debugMode', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings; 