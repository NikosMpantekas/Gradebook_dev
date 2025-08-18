import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  LogOut,
  User,
  Bell,
  GraduationCap,
  FileText,
  UserCog,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { logout } from '../features/auth/authSlice';

const StandaloneDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    // Debug logging to help diagnose rendering issues
    console.log('StandaloneDashboard rendering with user:', user ? {
      id: user._id,
      name: user.name,
      role: user.role
    } : 'No user');
    
    // If no user, redirect to login
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  
  // Navigation functions
  const navigateToApp = () => navigate('/app/dashboard');
  const navigateToProfile = () => navigate('/app/profile');
  const navigateToNotifications = () => navigate('/app/notifications');

  // If not logged in, don't render anything
  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-light tracking-wide">GradeBook</h1>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={navigateToApp}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={navigateToProfile}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={navigateToNotifications}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-normal mb-8">Welcome, {user?.name}!</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><span className="font-medium">Name:</span> {user?.name}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Role:</span> {user?.role}</p>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={navigateToProfile} className="h-auto p-4 flex-col">
                    <User className="h-8 w-8 mb-2" />
                    <span>Profile</span>
                  </Button>
                  <Button onClick={navigateToNotifications} className="h-auto p-4 flex-col" variant="outline">
                    <Bell className="h-8 w-8 mb-2" />
                    <span>Notifications</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Navigation Help</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Authentication is working correctly! Use the navigation above to explore the application.
                </p>
                <Button onClick={navigateToApp}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to Full Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StandaloneDashboard;