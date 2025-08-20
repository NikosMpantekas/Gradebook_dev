import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Building,
  Shield,
  Eye,
  EyeOff,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';

const UserForm = ({ 
  user = null, 
  onSubmit, 
  onCancel, 
  isEditing = false, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    role: '',
    school: '',
    department: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    permissions: {
      canManageUsers: false,
      canManageGrades: false,
      canSendNotifications: false,
      canViewReports: false
    }
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || '',
        role: user.role || '',
        school: user.school || '',
        department: user.department || '',
        password: '',
        confirmPassword: '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        permissions: {
          canManageUsers: user.permissions?.canManageUsers || false,
          canManageGrades: user.permissions?.canManageGrades || false,
          canSendNotifications: user.permissions?.canSendNotifications || false,
          canViewReports: user.permissions?.canViewReports || false
        }
      });
    }
  }, [user]);

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

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required for new users';
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    // Prepare data for submission (exclude confirmPassword)
    const submitData = {
      ...formData,
      confirmPassword: undefined
    };
    
    onSubmit(submitData);
  };

  const roleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'admin', label: 'Administrator' },
    { value: 'superadmin', label: 'Super Administrator' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'border-destructive' : ''}
                placeholder="Enter full name"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'border-destructive' : ''}
                placeholder="user@example.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="6912345678"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5" />
            <span>Academic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                name="school"
                value={formData.school}
                onChange={handleInputChange}
                placeholder="School name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Department name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="isActive">Account Status</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor="isActive" className="text-sm font-normal">
                  Active account
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? 'New Password' : 'Password *'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
                  className={errors.password ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {isEditing ? 'Confirm New Password' : 'Confirm Password *'}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm password"
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
          </div>
          
          {isEditing && (
            <p className="text-sm text-muted-foreground">
              Leave password fields empty if you don't want to change the password.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Permissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canManageUsers"
                checked={formData.permissions.canManageUsers}
                onCheckedChange={(checked) => handlePermissionChange('canManageUsers', checked)}
              />
              <Label htmlFor="canManageUsers" className="text-sm font-normal">
                Manage Users
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canManageGrades"
                checked={formData.permissions.canManageGrades}
                onCheckedChange={(checked) => handlePermissionChange('canManageGrades', checked)}
              />
              <Label htmlFor="canManageGrades" className="text-sm font-normal">
                Manage Grades
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canSendNotifications"
                checked={formData.permissions.canSendNotifications}
                onCheckedChange={(checked) => handlePermissionChange('canSendNotifications', checked)}
              />
              <Label htmlFor="canSendNotifications" className="text-sm font-normal">
                Send Notifications
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canViewReports"
                checked={formData.permissions.canViewReports}
                onCheckedChange={(checked) => handlePermissionChange('canViewReports', checked)}
              />
              <Label htmlFor="canViewReports" className="text-sm font-normal">
                View Reports
              </Label>
            </div>
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
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update User' : 'Create User'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default UserForm; 