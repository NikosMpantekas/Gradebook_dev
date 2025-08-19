import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Building,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Spinner } from '../components/ui/spinner';
import { updateProfile } from '../features/auth/authSlice';
import authService from '../features/auth/authService';
import { Badge } from '../components/ui/badge';
import PushNotificationSettings from '../components/PushNotificationSettings';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactEmail: '',
    dateOfBirth: '',
    role: '',
    school: '',
    department: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Initialize form data with user info
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      contactEmail: user.contactEmail || '',
      dateOfBirth: user.dateOfBirth || '',
      role: user.role || '',
      school: user.school || '',
      department: user.department || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
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
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        contactEmail: formData.contactEmail,
        dateOfBirth: formData.dateOfBirth,
        school: formData.school,
        department: formData.department
      };
      
      // Only include password fields if they're being changed
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      const response = await authService.updateProfile(updateData);
      
      if (response.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        // Reset password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original user data
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      contactEmail: user.contactEmail || '',
      dateOfBirth: user.dateOfBirth || '',
      role: user.role || '',
      school: user.school || '',
      department: user.department || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner className="text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-wide">Profile</h1>
          <p className="text-muted-foreground">Manage your account information and settings</p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button onClick={handleSave} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Basic Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarFallback className="text-3xl font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Profile pictures are managed by your administrator
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Role:</span>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">School:</span>
                <span className="text-sm">{user.school || 'Not specified'}</span>
              </div>
              {user.department && (
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Department:</span>
                  <span className="text-sm">{user.department}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
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
                    disabled={!isEditing}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={errors.email ? 'border-destructive' : ''}
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
                    disabled={!isEditing}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your contact email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Enter current password"
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Enter new password"
                      className={errors.newPassword ? 'border-destructive' : ''}
                    />
                    {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Leave password fields empty if you don't want to change your password.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Push Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Push Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PushNotificationSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
