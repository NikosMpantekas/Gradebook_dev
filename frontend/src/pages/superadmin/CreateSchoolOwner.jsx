import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from "src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Spinner } from "src/components/ui/spinner";

// Lucide React icons
import {
  User,
  Building2,
  Mail,
  Key,
  Globe,
  MapPin,
  ArrowLeft,
  Save
} from "lucide-react";

import { createSchoolOwner, reset } from '../../features/superadmin/superAdminSlice';
import LoadingState from '../../components/common/LoadingState';

function CreateSchoolOwner() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    schoolName: '',
    schoolAddress: '',
    schoolEmail: '',
    emailDomain: '',
  });

  const { name, email, password, password2, schoolName, schoolAddress, schoolEmail, emailDomain } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { isLoading, isError, isSuccess, message } = useSelector((state) => state.superAdmin);

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    // Redirect if not a superadmin
    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }

    // Only display success message on successful submission
    if (isSuccess) {
      toast.success('School owner created successfully!');
      // Clear success state
      setTimeout(() => {
        dispatch(reset());
      }, 100);
    }

    return () => {
      // Only reset error states on unmount, not success
      if (isError) {
        dispatch(reset());
      }
    };
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  // CRITICAL FIX: Modified form submission to ensure sidebar remains visible
  const onSubmit = (e) => {
    e.preventDefault();
    console.log('CreateSchoolOwner form submitted');

    // Validate form
    if (!name || !email || !password || !schoolName || !schoolAddress || !emailDomain) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== password2) {
      toast.error('Passwords do not match');
      return;
    }

    // Email domain validation (simple check)
    if (!emailDomain.includes('.')) {
      toast.error('Please enter a valid email domain (e.g., school.com)');
      return;
    }

    // Check that admin email uses the domain
    if (!email.endsWith('@' + emailDomain)) {
      toast.error(`Admin email must use the school domain (@${emailDomain})`);
      return;
    }

    const schoolOwnerData = {
      name,
      email,
      password,
      schoolName,
      schoolAddress,
      schoolEmail: schoolEmail || email, // Use the school email if provided, otherwise use the admin email
      emailDomain,
    };
    
    try {
      // Display success message before dispatch to improve user experience
      toast.success('Creating school owner account...');
      
      // Store that we're currently in the superadmin section to ensure sidebar stays open
      localStorage.setItem('currentSection', 'superadmin');
      
      // Dispatch action to create school owner
      dispatch(createSchoolOwner(schoolOwnerData));
      
      // Handle navigation directly here instead of in useEffect
      console.log('Will redirect to superadmin dashboard after processing...');
    } catch (error) {
      console.error('Error in form submission:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">Creating school owner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/superadmin/dashboard')} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Building2 className="mr-2 h-8 w-8" /> Create New School Owner
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a school and its administrator account
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                School Information
              </h2>
              <hr className="mb-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="schoolName"
                      name="schoolName"
                      value={schoolName}
                      onChange={onChange}
                      placeholder="Enter school name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">School Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="schoolAddress"
                      name="schoolAddress"
                      value={schoolAddress}
                      onChange={onChange}
                      placeholder="Enter school address"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailDomain">Email Domain (e.g., school.com) *</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="emailDomain"
                      name="emailDomain"
                      value={emailDomain}
                      onChange={onChange}
                      placeholder="Enter email domain (e.g., school.com)"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">School Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="schoolEmail"
                      name="schoolEmail"
                      value={schoolEmail}
                      onChange={onChange}
                      placeholder="Enter school contact email (optional)"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">
                School Owner (Admin) Account
              </h2>
              <hr className="mb-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="name"
                      name="name"
                      value={name}
                      onChange={onChange}
                      placeholder="Enter school owner name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={onChange}
                      placeholder={`Enter admin email (must use @${emailDomain || 'domain.com'})`}
                      className={`pl-10 ${email && emailDomain && !email.endsWith('@' + emailDomain) ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {email && emailDomain && !email.endsWith('@' + emailDomain) && (
                    <p className="text-sm text-red-500">
                      Email must end with @{emailDomain}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={onChange}
                      placeholder="Enter password"
                      className="pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password2">Confirm Password *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="password2"
                      name="password2"
                      type="password"
                      value={password2}
                      onChange={onChange}
                      placeholder="Confirm password"
                      className={`pl-10 ${password !== password2 && password2 !== '' ? 'border-red-500 focus:border-red-500' : ''}`}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {password !== password2 && password2 !== '' && (
                    <p className="text-sm text-red-500">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/superadmin/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" />
                Create School Owner
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateSchoolOwner;
