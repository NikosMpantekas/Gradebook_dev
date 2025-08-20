import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  User,
  UserCog,
  Users,
  Building,
  FolderOpen,
  FileText,
  BarChart3,
  Shield,
  Calendar,
  Clock,
  Star,
  Megaphone,
  Users2,
  Settings,
  LogOut,
  MessageSquare,
  CreditCard,
  Home,
  GraduationCap,
  School,
  Mail,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback} from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Sheet, SheetContent } from '../ui/sheet';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { API_URL } from '../../config/appConfig';
import { ScrollArea } from '../ui/scroll-area';
import { useFeatureToggles } from '../../context/FeatureToggleContext';

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: permissionsLoading } = useFeatureToggles();
  
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  const handleLogoutClick = () => setLogoutDialogOpen(true);
  const handleLogoutConfirm = () => {
    dispatch(logout());
    navigate('/login');
    setLogoutDialogOpen(false);
  };
  const handleLogoutCancel = () => setLogoutDialogOpen(false);
  

  
  // User role checks
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const isParent = user?.role === 'parent';
  
  // Navigation items based on user role and school permissions
  const getNavigationItems = () => {
    console.log('🔍 SIDEBAR MENU DEBUG: Building navigation for role:', user?.role);
    console.log('🔍 SIDEBAR MENU DEBUG: Permissions loading:', permissionsLoading);
    
    if (isSuperAdmin) {
      return [
        { icon: Shield, label: 'Super Admin', path: '/superadmin/dashboard' },
        { icon: Building, label: 'School Management', path: '/superadmin/school-permissions' },
        { icon: Users, label: 'User Management', path: '/superadmin/create-school-owner' },
        { icon: Mail, label: 'Contact Messages', path: '/superadmin/contact' },
        { icon: BarChart3, label: 'System Logs', path: '/superadmin/system-logs' },
        { icon: Megaphone, label: 'Patch Notes', path: '/superadmin/patch-notes' },
      ];
    }

    const items = [];

    if (isAdmin) {
      // Admin items - check permissions for each feature
      if (isFeatureEnabled('enableUserManagement')) {
        items.push({ icon: Users, label: 'Manage Users', path: '/app/admin/users' });
      }
      
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: Users2, label: 'Manage Classes', path: '/app/admin/classes' });
      }
      
      if (isFeatureEnabled('enableSchoolSettings')) {
        items.push({ icon: Building, label: 'School Branches', path: '/app/admin/schools' });
      }
      
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: 'Grade Management', path: '/app/admin/grades/manage' });
      }
      
      if (isFeatureEnabled('enableAnalytics')) {
        items.push({ icon: BarChart3, label: 'Student Progress', path: '/app/admin/student-stats' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: 'Notifications', path: '/app/admin/notifications' });
      }
      
      if (isFeatureEnabled('enableRatings')) {
        items.push({ icon: Star, label: 'Ratings', path: '/app/admin/ratings' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: 'Schedule', path: '/app/admin/schedule' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: 'Contact Messages', path: '/app/admin/contact' });
      }
      
      if (isFeatureEnabled('enablePayments')) {
        items.push({ icon: CreditCard, label: 'Payments', path: '/app/admin/payments' });
      }
    }

    if (isTeacher) {
      // Teacher items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: 'Manage Grades', path: '/app/teacher/grades/manage' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: 'Notifications', path: '/app/teacher/notifications' });
      }
      
      if (isFeatureEnabled('enableAnalytics')) {
        items.push({ icon: BarChart3, label: 'Student Stats', path: '/app/teacher/student-stats' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: 'Schedule', path: '/app/teacher/schedule' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: 'Contact Messages', path: '/app/teacher/contact' });
      }
    }

    if (isStudent) {
      // Student items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: 'My Grades', path: '/app/student/grades' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: 'Notifications', path: '/app/student/notifications' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: 'Schedule', path: '/app/student/schedule' });
      }
      
      if (isFeatureEnabled('enableRatings')) {
        items.push({ icon: Star, label: 'Submit Ratings', path: '/app/student/ratings' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: 'Contact Messages', path: '/app/student/contact' });
      }
    }

    if (isParent) {
      // Parent items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: 'Child Grades', path: '/app/parent/grades' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: 'Notifications', path: '/app/parent/notifications' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: 'Contact Messages', path: '/app/parent/contact' });
      }
      
      if (isFeatureEnabled('enablePayments')) {
        items.push({ icon: CreditCard, label: 'Payments', path: '/app/parent/payments' });
      }
    }

    console.log('🔍 SIDEBAR MENU DEBUG: Final items count:', items.length);
    console.log('🔍 SIDEBAR MENU DEBUG: Final items:', items.map(item => item.label));
    
    return items;
  };

  const navigationItems = getNavigationItems();

  // Get role-specific dashboard path
  const getDashboardPath = () => {
    if (isSuperAdmin) return '/superadmin/dashboard';
    if (isAdmin) return '/app/admin';
    if (isTeacher) return '/app/teacher';
    if (isStudent) return '/app/student';
    if (isParent) return '/app/parent';
    return '/app/dashboard';
  };

  const isPathSelected = (path) => {
    if (path === getDashboardPath()) {
      return location.pathname === path || location.pathname === '/app';
    }
    
    // For admin grade management, check if we're in any grade-related path
    if (path === '/app/admin/grades/manage') {
      return location.pathname.startsWith('/app/admin/grades');
    }
    
    // For teacher navigation items, check if we're in a sub-path
    if (path === '/app/teacher/grades/manage') {
      return location.pathname.startsWith('/app/teacher/grades');
    }
    if (path === '/app/teacher/notifications') {
      return location.pathname.startsWith('/app/teacher/notifications');
    }
    if (path === '/app/teacher/student-stats') {
      return location.pathname.startsWith('/app/teacher/student-stats');
    }
    if (path === '/app/teacher/schedule') {
      return location.pathname.startsWith('/app/teacher/schedule');
    }
    if (path === '/app/teacher/contact') {
      return location.pathname.startsWith('/app/teacher/contact');
    }
    
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path) => {
    navigate(path);
    // Close mobile sidebar after navigation
    if (mobileOpen && handleDrawerToggle) {
      handleDrawerToggle();
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-16 w-16 hover:scale-105 transition-transform duration-200 border border-background">
            <AvatarFallback className="text-lg font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="font-semibold text-sm">{user?.name || 'User'}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role || 'User'} Account
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Divider */}
      <div className="px-4 pb-2">
        <div className="h-px bg-background"></div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4 space-y-1">
        <nav className="space-y-1">
        {/* Dashboard Button - Role Specific */}
        <Button
          variant={isPathSelected(getDashboardPath()) ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-auto py-3 px-3 rounded-md transition-all duration-300 ease-in-out",
            isPathSelected(getDashboardPath()) 
              ? "bg-background text-primary shadow-sm hover:bg-background" 
              : "hover:shadow-md hover:border-primary hover:bg-background hover:text-foreground"
          )}
          onClick={() => handleNavigation(getDashboardPath())}
        >
          <LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Dashboard</span>
        </Button>

        {/* Role-specific navigation items */}
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isSelected = isPathSelected(item.path);
          
          return (
            <Button
              key={item.path}
              variant={isSelected ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-auto py-3 px-3 rounded-md transition-all duration-300 ease-in-out",
                isSelected 
                  ? "bg-background text-primary shadow-sm hover:bg-background" 
                  : "hover:shadow-md hover:border-primary hover:bg-background hover:text-foreground"
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Button>
          );
        })}
        </nav>
      </ScrollArea>

      {/* Modern Divider */}
      <div className="px-4 py-2">
        <div className="h-px bg-background"></div>
      </div>

      {/* Profile and Logout Section */}
      <div className="p-3 space-y-1">
        {/* Profile Button - Always available */}
        <Button
          variant={isPathSelected('/app/profile') ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-auto py-3 px-3 rounded-md transition-all duration-300 ease-in-out",
            isPathSelected('/app/profile') 
              ? "bg-background text-primary shadow-sm hover:bg-background" 
              : "hover:shadow-md hover:border-primary hover:bg-background hover:text-foreground"
          )}
          onClick={() => handleNavigation('/app/profile')}
        >
          <User className="mr-3 h-5 w-5" />
          <span className="text-sm font-medium">Profile</span>
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200"
          onClick={handleLogoutClick}
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span className="text-sm font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={handleDrawerToggle}>
        <SheetContent 
          side="left" 
          className="w-64 p-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-border overflow-hidden sidebar-animation"
        >
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-primary/50">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - No animations */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border no-animation overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-primary/50">
        {sidebarContent}
      </aside>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="w-[90vw] max-w-sm sm:max-w-md fade-in">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to logout? You will be redirected to the login page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogoutCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogoutConfirm}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar; 