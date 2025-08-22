import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Bell,
  Package,
  Euro,
  Star,
  Info,
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

const Profile = () => {
  const { t } = useTranslation();
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
    
    // Refresh user data for admin without page reload
    const refreshUserData = async () => {
      try {
        console.log('[PROFILE] Refreshing admin user data...');
        const response = await authService.getProfile();
        if (response) {
          // Update Redux store with fresh user data
          dispatch(updateProfile(response));
          // Update localStorage to persist the fresh data
          localStorage.setItem('user', JSON.stringify(response));
          console.log('[PROFILE] Admin pack info refreshed:', { 
            packType: response.packType, 
            monthlyPrice: response.monthlyPrice 
          });
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    };
    
    // Only refresh if this is an admin and we haven't refreshed in this session
    if (user.role === 'admin' && !sessionStorage.getItem('profileRefreshed')) {
      sessionStorage.setItem('profileRefreshed', 'true');
      refreshUserData();
    }
    
    // Initialize form data with current user info
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
  }, [user, navigate, dispatch]);

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
      newErrors.name = t('profile.nameRequired');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('profile.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('profile.emailInvalid');
    }
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('profile.passwordMismatch');
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = t('profile.passwordTooShort');
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
        toast.success(t('profile.updateSuccess'));
        setIsEditing(false);
        // Reset password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(response.message || t('profile.updateError'));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t('profile.updateErrorRetry'));
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
          <h1 className="text-3xl font-light tracking-wide">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>{t('profile.editProfile')}</span>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
                <X className="h-4 w-4" />
                <span>{t('common.cancel')}</span>
              </Button>
              <Button onClick={handleSave} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{t('profile.saveChanges')}</span>
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
              <CardTitle>{t('profile.profilePicture')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarFallback className="text-3xl font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                {t('profile.pictureManaged')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('profile.accountInfo')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('profile.role')}:</span>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('profile.school')}:</span>
                <span className="text-sm">{user.school || t('profile.notSpecified')}</span>
              </div>
              {user.department && (
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('profile.department')}:</span>
                  <span className="text-sm">{user.department}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pack Information - Admin Only */}
          {user?.role === 'admin' && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Package className="h-5 w-5" />
                  {t('profile.currentPlan')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      {user.packType === 'pro' ? (
                        <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t('profile.packageType')}</p>
                      <p className="font-semibold text-purple-700 dark:text-purple-300">
                        {user.packType === 'pro' ? t('profile.proPlan') : t('profile.litePlan')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Euro className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t('profile.monthlyPrice')}</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        €{user.monthlyPrice || 0}/{t('profile.perMonth')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t('profile.planStatus')}</p>
                      <Badge variant={user.packType === 'pro' ? 'default' : 'secondary'} className="text-xs">
                        {user.packType === 'pro' ? t('profile.premiumActive') : t('profile.basicActive')}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {user.packType === 'lite' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">
                        {t('profile.upgradeMessage')}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('profile.fullName')} *</Label>
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
                  <Label htmlFor="email">{t('common.email')} *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={true}
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">{t('profile.emailCannotChange')}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('profile.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="6912345678"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t('profile.contactEmail')}</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder={t('profile.contactEmailPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">{t('profile.dateOfBirth')}</Label>
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
                <CardTitle>{t('profile.changePassword')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('profile.currentPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder={t('profile.currentPasswordPlaceholder')}
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
                    <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder={t('profile.newPasswordPlaceholder')}
                      className={errors.newPassword ? 'border-destructive' : ''}
                    />
                    {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={t('profile.confirmPasswordPlaceholder')}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {t('profile.passwordChangeNote')}
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
