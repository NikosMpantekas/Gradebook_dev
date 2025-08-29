import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { API_URL } from '../../config/appConfig';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

import { Spinner } from '../../components/ui/spinner';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Copy, 
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
  UserPlus
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createUser, reset } from '../../features/users/userSlice';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CreateUser = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isLoading, isError, isSuccess, message } = useSelector((state) => state.users);
  const { schools } = useSelector((state) => state.schools);

  // Get admin's school for automatic email generation
  const [adminSchoolInfo, setAdminSchoolInfo] = useState({
    id: "",
    name: "",
    domain: ""
  });
  
  // Username part of the email (before the @)
  const [usernamePrefix, setUsernamePrefix] = useState("");
  
  // ENHANCED FIX: Extract domain from admin/secretary email address
  useEffect(() => {
    if (user) {
      // First try to extract domain from admin's email
      let extractedDomain = "";
      
      if (user.email && user.email.includes('@')) {
        extractedDomain = user.email.split('@')[1];
        console.log(`Extracted domain from admin's email: ${extractedDomain}`);
      }
      
      // If we have an extracted domain, use it directly
      if (extractedDomain) {
        let adminSchoolName = "School";
        let adminSchoolId = "";
        
        // Try to find matching school for the domain
        if (schools && schools.length > 0) {
          // First try to get school from schoolId
          let adminSchool;
          
          if (user.schoolId) {
            adminSchool = schools.find(school => school._id === user.schoolId);
          }
          
          // If that fails, check if user has schools array and take the first one
          if (!adminSchool && user.schools && user.schools.length > 0) {
            const schoolId = typeof user.schools[0] === 'object' ? user.schools[0]._id : user.schools[0];
            adminSchool = schools.find(school => school._id === schoolId);
          }
          
          // Get the school name and ID if we found a school
          if (adminSchool) {
            adminSchoolName = adminSchool.name || "School";
            adminSchoolId = adminSchool._id || "";
            
            // Set the school for students automatically
            setFormData(prev => ({
              ...prev,
              school: adminSchoolId
            }));
          }
        }
        
        // Set admin school info with extracted domain
        setAdminSchoolInfo({
          id: adminSchoolId,
          name: adminSchoolName,
          domain: extractedDomain
        });
        
        console.log(`Using admin's email domain: ${extractedDomain} for new users`);
      } else {
        // Fallback to original behavior if domain extraction fails
        if (schools && schools.length > 0) {
          let adminSchool;
          
          // First try to get school from schoolId
          if (user.schoolId) {
            adminSchool = schools.find(school => school._id === user.schoolId);
          }
          
          // If that fails, check if user has schools array and take the first one
          if (!adminSchool && user.schools && user.schools.length > 0) {
            const schoolId = typeof user.schools[0] === 'object' ? user.schools[0]._id : user.schools[0];
            adminSchool = schools.find(school => school._id === schoolId);
          }
          
          if (adminSchool) {
            // Get the actual school name, not empty or undefined
            const schoolName = adminSchool.name ? adminSchool.name.trim() : "";
            
            // Make sure we have a valid school name before creating domain
            if (schoolName) {
              // Create derived domain from school name if none exists
              // First ensure we have a valid domain - no spaces, lowercase, with .com
              const derivedDomain = adminSchool.domain || 
                schoolName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
              
              console.log(`Setting admin school: ${schoolName} with domain: ${derivedDomain}`);
              
              setAdminSchoolInfo({
                id: adminSchool._id,
                name: schoolName,
                domain: derivedDomain
              });
              
              // Set the school for students automatically
              setFormData(prev => ({
                ...prev,
                school: adminSchool._id
              }));
            } else {
              // Fallback to a default domain if school name is empty
              setAdminSchoolInfo({
                id: adminSchool._id,
                name: "School",
                domain: "school.com"
              });
              console.warn('School name is empty, using default domain');
            }
          } else {
            // Fallback to a default domain if no school found
            setAdminSchoolInfo({
              id: "",
              name: "School",
              domain: "school.com"
            });
            console.warn('Could not determine admin school, using default domain');
          }
        }
      }
    }
  }, [user, schools]);

  // Check if secretary restriction is enabled from URL parameter
  const [restrictSecretary, setRestrictSecretary] = useState(false);
  
  // Check if admin already exists (only one admin allowed per organization)
  const [restrictAdmin, setRestrictAdmin] = useState(false);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    // Check URL parameters to see if secretary role creation should be restricted
    const queryParams = new URLSearchParams(window.location.search);
    const restrictParam = queryParams.get('restrictSecretary');
    if (restrictParam === 'true' || user?.role === 'secretary') {
      setRestrictSecretary(true);
    }
  }, [user]);
  
  // Check for existing admin account on component mount
  useEffect(() => {
    const checkExistingAdmin = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          const hasAdmin = users.some(u => u.role === 'admin');
          
          if (hasAdmin) {
            setAdminExists(true);
            setRestrictAdmin(true);
            console.log('Admin account already exists - preventing creation of second admin');
          }
        } else {
          console.error('Failed to check for existing admin accounts');
        }
      } catch (error) {
        console.error('Error checking for existing admin accounts:', error);
      }
    };
    
    if (user?.token) {
      checkExistingAdmin();
    }
  }, [user?.token]);

  // Additional state for loading options
  const [loadingOptions, setLoadingOptions] = useState({
    schools: false
  });
  const [optionsData, setOptionsData] = useState({
    schools: []
  });
  const [optionsError, setOptionsError] = useState({
    schools: null
  });

  const [submitting, setSubmitting] = useState(false);
  
  // Password generation and email credentials state
  const [passwordGenerated, setPasswordGenerated] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [emailCredentials, setEmailCredentials] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '', // This is now the User ID / login email
    mobilePhone: '', // Optional field for mobile phone
    personalEmail: '', // Optional field for personal email
    password: '',
    confirmPassword: '',
    role: '',
    school: '', // For students
    schools: [], // For teachers (multiple schools)
    canSendNotifications: true,
    canAddGradeDescriptions: true,
    secretaryPermissions: {
      canManageGrades: false,
      canSendNotifications: false,
      canManageUsers: false,
      canManageSchools: false,
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
    role: '',
    school: '',
    schools: '',
  });
  
  // Update email when name changes - automatically generate email address
  useEffect(() => {
    if (formData.name && adminSchoolInfo.domain) {
      // Generate username from name (lowercase, no spaces)
      const username = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      // Set the username prefix for the email
      setUsernamePrefix(username);
      
      // Set the full email address with school domain
      const autoEmail = `${username}@${adminSchoolInfo.domain}`;
      
      console.log(`Auto-generating email: ${autoEmail}`);
      
      // Update the email field in the form
      setFormData(prev => ({
        ...prev,
        email: autoEmail
      }));
    }
  }, [formData.name, adminSchoolInfo.domain]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[CreateUser] Field changed: ${name} = ${Array.isArray(value) ? `Array(${value.length})` : value}`);
    
    // Clear the error for this field when it's modified
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
    
    // Special handling for different fields
    if (name === 'role') {
      // Reset school when role changes
      const newState = {
        ...formData,
        [name]: value,
      };
      
      // If changing to admin, clear school
      if (value === 'admin') {
        newState.school = '';
      }
      
      // If changing to secretary, clear student-specific fields
      if (value === 'secretary') {
        newState.school = '';
      }
      
      setFormData(newState);
    } else if (name.startsWith('secretary_')) {
      // Handle secretary permission toggles
      const permissionKey = name.replace('secretary_', '');
      setFormData({
        ...formData,
        secretaryPermissions: {
          ...formData.secretaryPermissions,
          [permissionKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const handleMouseDownPassword = (e) => {
    e.preventDefault();
  };

  // Password generation functions
  const generateEasyPassword = () => {
    // Generate an easy-to-remember password with format: Word1234!
    const words = [
      'Apple', 'Beach', 'Cloud', 'Dance', 'Eagle', 'Flame', 'Grace', 'Happy',
      'Island', 'Jungle', 'Knight', 'Light', 'Magic', 'Night', 'Ocean', 'Peace',
      'Quick', 'River', 'Smile', 'Trust', 'Unity', 'Voice', 'Water', 'Youth'
    ];
    
    const word = words[Math.floor(Math.random() * words.length)];
    const numbers = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const symbols = ['!', '@', '#', '$', '%'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return `${word}${numbers}${symbol}`;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateEasyPassword();
    setGeneratedPassword(newPassword);
    setFormData({
      ...formData,
      password: newPassword,
      confirmPassword: newPassword
    });
    setPasswordGenerated(true);
    toast.success(t('admin.createUserPage.actions.passwordGenerated'));
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success(t('admin.createUserPage.actions.passwordCopied'));
    } catch (error) {
              toast.error(t('admin.createUserPage.actions.passwordCopyFailed'));
    }
  };

  const handleToggleShowCredentials = () => {
    setShowCredentials(!showCredentials);
  };

  const handleToggleEmailCredentials = () => {
    setEmailCredentials(!emailCredentials);
  };
  
  // Fetch schools when component mounts
  useEffect(() => {
    // Load options for teacher, student, and secretary roles
    if (formData.role === 'teacher' || formData.role === 'student' || formData.role === 'secretary') {
      fetchSchools();
    }
  }, [formData.role]);
  
  // Functions to fetch reference data
  const fetchSchools = async () => {
    try {
      setLoadingOptions(prev => ({ ...prev, schools: true }));
      setOptionsError(prev => ({ ...prev, schools: null }));
      
      console.log('[CreateUser] Using API_URL for secure schools API call:', API_URL);
      const response = await axios.get(`${API_URL}/api/schools`);
      setOptionsData(prev => ({ ...prev, schools: response.data }));
    } catch (error) {
      console.error('Error fetching schools:', error);
      setOptionsError(prev => ({
        ...prev,
        schools: 'Failed to fetch schools. Please try again.'
      }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, schools: false }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = t('admin.createUserPage.validation.nameRequired');
      isValid = false;
    }

    if (!formData.email) {
      errors.email = t('admin.createUserPage.validation.emailRequired');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('admin.createUserPage.validation.emailInvalid');
      isValid = false;
    }

    // Validate personal email if provided
    if (formData.personalEmail && !/\S+@\S+\.\S+/.test(formData.personalEmail)) {
              errors.personalEmail = t('admin.createUserPage.validation.emailInvalid');
      isValid = false;
    }

    // Validate mobile phone if provided
    if (formData.mobilePhone && !/^[\d\s\-+()]+$/.test(formData.mobilePhone)) {
              errors.mobilePhone = t('admin.createUserPage.validation.invalidPhoneFormat');
      isValid = false;
    }

    // Validate required fields based on role
    if (!formData.role) {
              errors.role = t('admin.createUserPage.validation.roleRequired');
    } else if (formData.role === 'student') {
              if (!formData.school) errors.school = t('admin.createUserPage.validation.schoolRequired');
    } else if (formData.role === 'teacher') {
              if (!formData.schools || formData.schools.length === 0) errors.schools = t('admin.createUserPage.validation.atLeastOneSchoolRequired');
    }

    if (!formData.password) {
              errors.password = t('admin.createUserPage.validation.passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
              errors.password = t('admin.createUserPage.validation.passwordTooShort');
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
              errors.confirmPassword = t('admin.createUserPage.validation.passwordsDoNotMatch');
      isValid = false;
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
      // Prepare user data based on role
      let userEmail = formData.email.trim().toLowerCase();
      
      // Check if we need to append the school domain to the email
      if (adminSchoolInfo.domain && !userEmail.includes('@')) {
        userEmail = `${userEmail}@${adminSchoolInfo.domain}`;
        console.log(`Appended school domain to email: ${userEmail}`);
      }
      
      const userData = {
        name: formData.name.trim(),
        email: userEmail,
        password: formData.password,
        role: formData.role,
        mobilePhone: formData.mobilePhone?.trim() || '',
        personalEmail: formData.personalEmail?.trim().toLowerCase() || '',
        // Include saved versions for backup
        savedMobilePhone: formData.mobilePhone?.trim() || null,
        savedPersonalEmail: formData.personalEmail?.trim().toLowerCase() || null
      };
      
      console.log('Submitting user with contact info:', {
        mobilePhone: userData.mobilePhone,
        personalEmail: userData.personalEmail,
        savedMobilePhone: userData.savedMobilePhone,
        savedPersonalEmail: userData.savedPersonalEmail
      });

      if (formData.role === 'student') {
        // For students: Include single school
        userData.school = formData.school || null;
      } else if (formData.role === 'teacher') {
        // Process schools array for teachers
        const schoolsArray = formData.schools && formData.schools.length > 0 ? formData.schools : [];
        
        // Set schools
        userData.schools = schoolsArray;
        userData.school = schoolsArray; // For compatibility
        
        console.log('Teacher schools array being submitted:', schoolsArray);
        
        // Add teacher permission fields
        userData.canSendNotifications = formData.canSendNotifications;
        userData.canAddGradeDescriptions = formData.canAddGradeDescriptions;
      } else if (formData.role === 'secretary') {
        // For secretary accounts, include the permission flags
        userData.secretaryPermissions = formData.secretaryPermissions;
        
        // Set schools only 
        const schoolsArray = formData.schools && formData.schools.length > 0 ? formData.schools : [];
        userData.schools = schoolsArray;
        userData.school = schoolsArray; // For compatibility
          
        console.log('Creating secretary account with permissions:', userData.secretaryPermissions);
        console.log('Secretary schools:', schoolsArray);
      } else {
        // For admins, ensure these fields are null/empty
        userData.school = null;
      }
      
      // Add email credentials data if password was generated
      if (passwordGenerated) {
        userData.emailCredentials = emailCredentials;
        userData.generatedPassword = generatedPassword;
      }
      
      // Add parent account creation data if enabled
      if (formData.createParentAccount && formData.role === 'student') {
        userData.createParentAccount = true;
        userData.parentName = formData.parentName || '';
        userData.parentEmail = formData.parentEmail || (formData.email ? `parent.${formData.email}` : '');
        userData.parentPassword = formData.parentPassword || '';
        userData.parentMobilePhone = formData.parentMobilePhone || '';
        userData.parentPersonalEmail = formData.parentPersonalEmail || '';
        userData.parentEmailCredentials = formData.parentEmailCredentials || false;
        
        // Include parent generated password if available
        if (formData.parentGeneratedPassword) {
          userData.parentGeneratedPassword = formData.parentGeneratedPassword;
        }
        
        console.log('Parent account data added to submission:', {
          createParentAccount: userData.createParentAccount,
          parentName: userData.parentName,
          parentEmail: userData.parentEmail,
          parentEmailCredentials: userData.parentEmailCredentials,
          hasParentPassword: !!userData.parentPassword
        });
      }
      
      console.log('Submitting user data:', {
        ...userData,
        generatedPassword: userData.generatedPassword ? '[HIDDEN]' : undefined
      });
      
      // Set the submission flag to true
      hasSubmitted.current = true;
      
      // Use the Redux action without manual toast/navigation here
      // The useEffect will handle success/error states consistently
      dispatch(createUser(userData));
      
      // Don't handle success/error here - let the useEffect do it
      // to ensure consistent behavior
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitting(false);
    }
  };

  // Create refs to track component state
  const initialMount = useRef(true);
  const hasSubmitted = useRef(false);
  
  // Load schools data when component mounts
  useEffect(() => {
    const fetchSchools = async () => {
      setLoadingOptions(prev => ({ ...prev, schools: true }));
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        console.log('[CreateUser] Using API_URL for secure schools API call:', API_URL);
        const { data } = await axios.get(`${API_URL}/api/schools`, config);
        setOptionsData(prev => ({ ...prev, schools: data }));
        console.log('Schools loaded:', data);
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to load schools';
        setOptionsError(prev => ({ ...prev, schools: message }));
        toast.error(`Error loading schools: ${message}`);
      } finally {
        setLoadingOptions(prev => ({ ...prev, schools: false }));
      }
    };

    // If the user is admin or secretary, load data
    if (user && (user.role === 'admin' || user.role === 'secretary')) {
      fetchSchools();
    }
  }, [user]);

  // Handle API response effects
  useEffect(() => {
    // Skip effects on initial component mount to prevent false success messages
    if (initialMount.current) {
      console.log('CreateUser: Initial mount, skipping effect');
      initialMount.current = false;
      // Make sure we reset any stale state on mount
      dispatch(reset());
      return;
    }

    // Log state for debugging
    console.log('CreateUser effect triggered with state:', { 
      isError, 
      isSuccess, 
      isLoading, 
      hasSubmitted: hasSubmitted.current,
      submitting
    });

    if (isError) {
      console.log('CreateUser: Error occurred:', message);
      toast.error(message || 'Failed to create user');
      setSubmitting(false);
      hasSubmitted.current = false;
    }
    
    if (isSuccess && hasSubmitted.current) {
      console.log('CreateUser: Success after form submission');
              toast.success(t('admin.createUserPage.messages.userCreatedSuccessfully'));
      
      // Important: Reset state and navigate
      setSubmitting(false);
      hasSubmitted.current = false;
      
      // Use a short timeout to ensure state updates before navigation
      setTimeout(() => {
        dispatch(reset());
        navigate('/app/admin/users');
      }, 50);
    }
    
    // If we've been in loading state too long (10 seconds), assume something went wrong
    const loadingTimeout = setTimeout(() => {
      if (submitting && hasSubmitted.current) {
        console.warn('CreateUser: Form submission timeout - resetting state');
        setSubmitting(false);
        toast.error(t('admin.createUserPage.messages.requestTakingTooLong'));
        dispatch(reset());
        hasSubmitted.current = false;
      }
    }, 10000); // 10 second timeout
    
    return () => {
      clearTimeout(loadingTimeout);
      
      // Reset redux state if needed
      if (isSuccess || isError) {
        dispatch(reset());
      }
    };
  }, [isError, isSuccess, message, navigate, dispatch]);

  const handleBack = () => {
    navigate('/app/admin/users');
  };
  
  // Show a loading state when submitting the form
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
          {t('admin.createUserPage.backToUsers')}
        </Button>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Creating user...</span>
        </div>
      </div>
    );
  }

  // Show an error state if there's an error
  if (isError && !submitting) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button
          variant="outline"
          onClick={handleBack}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.createUserPage.backToUsers')}
        </Button>
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to create user: {message || 'Unknown error'}
          </p>
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
          {t('admin.createUserPage.backToUsers')}
        </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            {t('admin.createUserPage.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Separator className="mb-6" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('admin.createUserPage.form.fullName')}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('admin.createUserPage.form.fullNamePlaceholder')}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('admin.createUserPage.form.loginEmail')}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.form.emailAutoGenerated')}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  <Badge className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
                    {t('admin.createUserPage.form.emailEditable')}
                  </Badge>
                </div>
                {formErrors.email && (
                  <p className="text-sm text-red-500">{formErrors.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('admin.createUserPage.form.emailDescription')}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mobilePhone" className="text-sm font-medium">
                  {t('admin.createUserPage.form.mobilePhone')}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.form.optional')}
                    className="pl-10"
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.createUserPage.form.optional')}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personalEmail" className="text-sm font-medium">
                  {t('admin.createUserPage.form.personalEmail')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="personalEmail"
                    name="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.form.optional')}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.createUserPage.form.optional')}</p>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('admin.createUserPage.form.password')} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.form.passwordPlaceholder')}
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
                  {t('admin.createUserPage.form.confirmPassword')} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('admin.createUserPage.form.confirmPasswordPlaceholder')}
                    className={`pl-10 ${formErrors.password ? 'border-red-500' : ''}`}
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

            {/* Password Generation */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">{t('admin.createUserPage.passwordGeneration.title')}</h3>
                  </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('admin.createUserPage.passwordGeneration.generateButton')}
                    </Button>
                    
                    {passwordGenerated && (
                                              <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopyPassword}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {t('admin.createUserPage.passwordGeneration.copyButton')}
                        </Button>
                    )}
                  </div>
                  
                  {passwordGenerated && (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="showCredentials"
                            checked={showCredentials}
                            onCheckedChange={handleToggleShowCredentials}
                          />
                          <Label htmlFor="showCredentials">{t('admin.createUserPage.credentials.showCredentialsToAdmin')}</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="emailCredentials"
                            checked={emailCredentials}
                            onCheckedChange={handleToggleEmailCredentials}
                          />
                          <Label htmlFor="emailCredentials">{t('admin.createUserPage.credentials.emailCredentialsToUser')}</Label>
                        </div>
                      </div>
                      
                      {showCredentials && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>{t('admin.createUserPage.credentials.loginCredentials')}:</strong><br/>
                            {t('admin.createUserPage.labels.email')} {formData.email}<br/>
                            {t('admin.createUserPage.labels.password')} {generatedPassword}
                          </p>
                        </div>
                      )}
                      
                      {emailCredentials && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {t('admin.createUserPage.credentials.credentialsWillBeSentTo')} <strong>{formData.personalEmail || formData.email}</strong><br/>
                            {t('admin.createUserPage.credentials.makeSureEmailCorrect')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Role Selection */}
            <div className="space-y-2">
                              <Label htmlFor="role" className="text-sm font-medium">
                  {t('admin.createUserPage.role.label')} *
                </Label>
              <Select value={formData.role} onValueChange={(value) => handleChange({ target: { name: 'role', value } })}>
                <SelectTrigger className={formErrors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-sm text-red-500">{formErrors.role}</p>
              )}
              {adminExists && (
                <p className="text-sm text-amber-600">
                  ⚠️ An admin account already exists for this organization. Only one admin is allowed.
                </p>
              )}
            </div>

            {/* Secretary Permissions */}
            {formData.role === 'secretary' && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Secretary Permissions</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure which administrative functions this secretary account can access.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canManageGrades"
                        checked={formData.secretaryPermissions.canManageGrades}
                        onCheckedChange={(checked) => handleChange({ target: { name: 'secretary_canManageGrades', value: checked } })}
                      />
                      <Label htmlFor="canManageGrades">Can view and edit grades</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canSendNotifications"
                        checked={formData.secretaryPermissions.canSendNotifications}
                        onCheckedChange={(checked) => handleChange({ target: { name: 'secretary_canSendNotifications', value: checked } })}
                      />
                      <Label htmlFor="canSendNotifications">Can send notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canManageUsers"
                        checked={formData.secretaryPermissions.canManageUsers}
                        onCheckedChange={(checked) => handleChange({ target: { name: 'secretary_canManageUsers', value: checked } })}
                      />
                      <Label htmlFor="canManageUsers">Can manage user accounts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canManageSchools"
                        checked={formData.secretaryPermissions.canManageSchools}
                        onCheckedChange={(checked) => handleChange({ target: { name: 'secretary_canManageSchools', value: checked } })}
                      />
                      <Label htmlFor="canManageSchools">Can manage schools</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teacher Permissions */}
            {formData.role === 'teacher' && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Teacher Permissions</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canSendNotifications"
                        checked={formData.canSendNotifications}
                        onCheckedChange={(checked) => setFormData({ ...formData, canSendNotifications: checked })}
                      />
                      <Label htmlFor="canSendNotifications">Can Send Notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canAddGradeDescriptions"
                        checked={formData.canAddGradeDescriptions}
                        onCheckedChange={(checked) => setFormData({ ...formData, canAddGradeDescriptions: checked })}
                      />
                      <Label htmlFor="canAddGradeDescriptions">Can Add Grade Descriptions</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2 px-8 py-2"
              >
                {isLoading ? (
                                      <>
                      <Spinner size="sm" />
                      {t('admin.createUserPage.actions.creatingUser')}
                    </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {t('admin.createUserPage.actions.createUser')}
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

export default CreateUser;
