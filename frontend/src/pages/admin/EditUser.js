import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

import { Spinner } from '../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Save, 
  User, 
  Lock, 
  Phone, 
  Mail,
  Building,
  Users,
  BookOpen,
  Bell,
  FileText,
  Shield,
  Settings,
  GraduationCap,
  Link,
  Unlink
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getUserById, updateUser, reset } from '../../features/users/userSlice';
import { updateCurrentUserPermissions } from '../../features/auth/authSlice';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';

const EditUser = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth);
  const { isLoading: userLoading, isError: userError, message: userMessage } = useSelector((state) => state.users);
  
  // Create refs to track component state
  const initialMount = useRef(true);
  const hasSubmitted = useRef(false);
  const dataLoaded = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState(null);
  
  // State for schools data
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  
  // State for parent linking functionality
  const [availableParents, setAvailableParents] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [parentLinkingLoading, setParentLinkingLoading] = useState(false);
  const [linkParentDialogOpen, setLinkParentDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobilePhone: '',
    personalEmail: '',
    role: '',
    changePassword: false,
    password: '',
    confirmPassword: '',
    // Teacher permission flags - default to true for backward compatibility
    canSendNotifications: true,
    canAddGradeDescriptions: true,
    // Secretary permission flags - all default to false
    secretaryPermissions: {
      canManageGrades: false,
      canSendNotifications: false,
      canManageUsers: false,
      canManageSchools: false,
      canManageDirections: false,
      canManageSubjects: false,
      canAccessStudentProgress: false,
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    mobilePhone: '',
    personalEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch user data when component mounts
  useEffect(() => {
    if (id && currentUser?.token) {
      fetchUserData();
    }
  }, [id, currentUser?.token]);

  // Fetch schools data
  useEffect(() => {
    if (currentUser?.token) {
      fetchSchools();
    }
  }, [currentUser?.token]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const user = await response.json();
        setUserData(user);
        
        // Populate form data
        setFormData({
          name: user.name || '',
          email: user.email || '',
          mobilePhone: user.mobilePhone || '',
          personalEmail: user.personalEmail || '',
          role: user.role || '',
          changePassword: false,
          password: '',
          confirmPassword: '',
          canSendNotifications: user.canSendNotifications !== false,
          canAddGradeDescriptions: user.canAddGradeDescriptions !== false,
          secretaryPermissions: {
            canManageGrades: user.secretaryPermissions?.canManageGrades || false,
            canSendNotifications: user.secretaryPermissions?.canSendNotifications || false,
            canManageUsers: user.secretaryPermissions?.canManageUsers || false,
            canManageSchools: user.secretaryPermissions?.canManageSchools || false,
            canManageDirections: user.secretaryPermissions?.canManageDirections || false,
            canManageSubjects: user.secretaryPermissions?.canManageSubjects || false,
            canAccessStudentProgress: user.secretaryPermissions?.canAccessStudentProgress || false,
          },
        });
        
        dataLoaded.current = true;
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to fetch user data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      setSchoolsLoading(true);
      const response = await fetch(`${API_URL}/api/schools`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const schoolsData = await response.json();
        setSchools(schoolsData);
      } else {
        console.error('Failed to fetch schools');
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear the error for this field when it's modified
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSwitchChange = (name, checked) => {
    if (name.startsWith('secretary_')) {
      const permissionKey = name.replace('secretary_', '');
      setFormData({
        ...formData,
        secretaryPermissions: {
          ...formData.secretaryPermissions,
          [permissionKey]: checked
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: checked,
      });
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = t('admin.createUserPage.editUserPage.form.fullName');
      isValid = false;
    }

    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
      isValid = false;
    }

    // Validate personal email if provided
    if (formData.personalEmail && !/\S+@\S+\.\S+/.test(formData.personalEmail)) {
              errors.personalEmail = t('admin.createUserPage.editUserPage.validation.emailInvalid');
      isValid = false;
    }

    // Validate mobile phone if provided
    if (formData.mobilePhone && !/^[\d\s\-+()]+$/.test(formData.mobilePhone)) {
      errors.mobilePhone = 'Invalid phone number format';
      isValid = false;
    }

    // Validate password fields if changing password
    if (formData.changePassword) {
      if (!formData.password) {
        errors.password = 'Password is required';
        isValid = false;
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
        isValid = false;
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobilePhone: formData.mobilePhone?.trim() || '',
        personalEmail: formData.personalEmail?.trim().toLowerCase() || '',
        canSendNotifications: formData.canSendNotifications,
        canAddGradeDescriptions: formData.canAddGradeDescriptions,
        secretaryPermissions: formData.secretaryPermissions,
      };

      if (formData.changePassword) {
        updateData.password = formData.password;
      }

      console.log('Updating user with data:', updateData);

      // Set the submission flag to true
      hasSubmitted.current = true;
      
      // Dispatch the update action
      dispatch(updateUser({ id, userData: updateData }));
      
    } catch (error) {
      console.error('Error updating user:', error);
      setSubmitting(false);
    }
  };

  // Handle API response effects
  useEffect(() => {
    // Skip effects on initial component mount
    if (initialMount.current) {
      initialMount.current = false;
      dispatch(reset());
      return;
    }

    if (userError) {
      toast.error(userMessage || 'Failed to update user');
      setSubmitting(false);
      hasSubmitted.current = false;
    }
    
    if (userLoading === false && hasSubmitted.current) {
      toast.success('User updated successfully');
      setSubmitting(false);
      hasSubmitted.current = false;
      
      // Navigate back to users list
      setTimeout(() => {
        dispatch(reset());
        navigate('/app/admin/users');
      }, 100);
    }
    
  }, [userError, userLoading, userMessage, navigate, dispatch]);

  const handleBack = () => {
    navigate('/app/admin/users');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Loading user data...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button
          variant="outline"
          onClick={handleBack}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.createUserPage.editUserPage.backToUsers')}
        </Button>
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            {errorMessage || 'Failed to load user data'}
          </p>
        </div>
      </div>
    );
  }

  // Show submitting state
  if (submitting) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.createUserPage.editUserPage.backToUsers')}
        </Button>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">{t('admin.createUserPage.editUserPage.actions.updatingUser')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <Button
        variant="outline"
        onClick={handleBack}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('admin.createUserPage.editUserPage.backToUsers')}
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            {t('admin.createUserPage.editUserPage.title')}: {userData?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Separator className="mb-6" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('admin.createUserPage.editUserPage.form.fullName')} *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('admin.createUserPage.editUserPage.form.fullNamePlaceholder')}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('admin.createUserPage.editUserPage.form.loginEmail')} *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('admin.createUserPage.editUserPage.form.loginEmailPlaceholder')}
                  className={formErrors.email ? 'border-red-500' : ''}
                  required
                />
                {formErrors.email && (
                  <p className="text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mobilePhone" className="text-sm font-medium">
                  {t('admin.createUserPage.editUserPage.form.mobilePhone')}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.editUserPage.form.optional')}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.createUserPage.editUserPage.form.optional')}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personalEmail" className="text-sm font-medium">
                  {t('admin.createUserPage.editUserPage.form.personalEmail')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="personalEmail"
                    name="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.editUserPage.form.optional')}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.createUserPage.editUserPage.form.optional')}</p>
              </div>
            </div>

            {/* Role Display */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.createUserPage.editUserPage.form.role')}</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {formData.role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('admin.createUserPage.editUserPage.form.roleCannotBeChanged')}
                </span>
              </div>
            </div>

            {/* Password Change Section */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">{t('admin.createUserPage.editUserPage.changePassword.title')}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="changePassword"
                      checked={formData.changePassword}
                      onCheckedChange={(checked) => setFormData({ ...formData, changePassword: checked })}
                    />
                    <Label htmlFor="changePassword">{t('admin.createUserPage.editUserPage.changePassword.description')}</Label>
                  </div>
                  
                  {formData.changePassword && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">
                          {t('admin.createUserPage.editUserPage.changePassword.newPassword')} *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('admin.createUserPage.editUserPage.changePassword.newPasswordPlaceholder')}
                            className={`pl-10 ${formErrors.password ? 'border-red-500' : ''}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClickShowPassword}
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {formErrors.password && (
                          <p className="text-sm text-red-500">{formErrors.password}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          {t('admin.createUserPage.editUserPage.changePassword.confirmPassword')} *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder={t('admin.createUserPage.editUserPage.changePassword.confirmPasswordPlaceholder')}
                            className={`pl-10 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClickShowConfirmPassword}
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {formErrors.confirmPassword && (
                          <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Teacher Permissions */}
            {formData.role === 'teacher' && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">{t('admin.createUserPage.editUserPage.permissions.teacherPermissions')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canSendNotifications"
                        checked={formData.canSendNotifications}
                        onCheckedChange={(checked) => handleSwitchChange('canSendNotifications', checked)}
                      />
                      <Label htmlFor="canSendNotifications">{t('admin.createUserPage.editUserPage.permissions.canSendNotifications')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canAddGradeDescriptions"
                        checked={formData.canAddGradeDescriptions}
                        onCheckedChange={(checked) => handleSwitchChange('canAddGradeDescriptions', checked)}
                      />
                      <Label htmlFor="canAddGradeDescriptions">{t('admin.createUserPage.editUserPage.permissions.canAddGradeDescriptions')}</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secretary Permissions */}
            {formData.role === 'secretary' && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">{t('admin.createUserPage.editUserPage.permissions.secretaryPermissions')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.createUserPage.editUserPage.permissions.configureSecretaryAccess')}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canManageGrades"
                        checked={formData.secretaryPermissions.canManageGrades}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canManageGrades', checked)}
                      />
                      <Label htmlFor="secretary_canManageGrades">{t('admin.createUserPage.editUserPage.permissions.canManageGrades')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canSendNotifications"
                        checked={formData.secretaryPermissions.canSendNotifications}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canSendNotifications', checked)}
                      />
                      <Label htmlFor="secretary_canSendNotifications">{t('admin.createUserPage.editUserPage.permissions.canSendNotifications')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canManageUsers"
                        checked={formData.secretaryPermissions.canManageUsers}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canManageUsers', checked)}
                      />
                      <Label htmlFor="secretary_canManageUsers">{t('admin.createUserPage.editUserPage.permissions.canManageUsers')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canManageSchools"
                        checked={formData.secretaryPermissions.canManageSchools}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canManageSchools', checked)}
                      />
                      <Label htmlFor="secretary_canManageUsers">{t('admin.createUserPage.editUserPage.permissions.canManageSchools')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canManageDirections"
                        checked={formData.secretaryPermissions.canManageDirections}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canManageDirections', checked)}
                      />
                      <Label htmlFor="secretary_canManageDirections">{t('admin.createUserPage.editUserPage.permissions.canManageDirections')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canManageSubjects"
                        checked={formData.secretaryPermissions.canManageSubjects}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canManageSubjects', checked)}
                      />
                      <Label htmlFor="secretary_canManageSubjects">{t('admin.createUserPage.editUserPage.permissions.canManageSubjects')}</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secretary_canAccessStudentProgress"
                        checked={formData.secretaryPermissions.canAccessStudentProgress}
                        onCheckedChange={(checked) => handleSwitchChange('secretary_canAccessStudentProgress', checked)}
                      />
                      <Label htmlFor="secretary_canAccessStudentProgress">{t('admin.createUserPage.editUserPage.permissions.canAccessStudentProgress')}</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={userLoading}
                className="gap-2 px-8 py-2"
              >
                {userLoading ? (
                                      <>
                      <Spinner size="sm" />
                      {t('admin.createUserPage.editUserPage.actions.updatingUser')}
                    </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('admin.createUserPage.editUserPage.actions.updateUser')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUser;