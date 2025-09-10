import React, { useState, useEffect, useRef } from 'react';
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
  BadgeAlert,
  Wrench,
  UserCheck,
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
  const [logoutAnimating, setLogoutAnimating] = useState(false);
  const pageRef = useRef(null);
  
  const handleLogoutClick = () => setLogoutDialogOpen(true);
  
  const startLogoutAnimation = () => {
    console.log('Starting logout zoom-out animation');
    setLogoutAnimating(true);
    setLogoutDialogOpen(false);
    
    // New: Sleek fade + subtle blur overlay (short duration)
    // Add a class to trigger content fade/blur
    document.body.classList.add('logout-fade');
    
    // Create and mount a temporary overlay
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay';
    document.body.appendChild(overlay);
    
    // Navigate to login after animation completes
    setTimeout(() => {
      dispatch(logout());
      navigate('/login');
      
      // Cleanup
      document.body.classList.remove('logout-fade');
      try { overlay.remove(); } catch (e) {}
      setLogoutAnimating(false);
    }, 350);
  };
  
  const handleLogoutConfirm = () => {
    startLogoutAnimation();
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
        { icon: Shield, label: t('navigation.superAdmin'), path: '/superadmin/dashboard' },
        { icon: Building, label: t('navigation.schoolManagement'), path: '/superadmin/school-permissions' },
        { icon: Users, label: t('navigation.userManagement'), path: '/superadmin/create-school-owner' },
        { icon: Mail, label: t('navigation.contactMessages'), path: '/superadmin/contact' },
        { icon: BarChart3, label: t('navigation.systemLogs'), path: '/superadmin/system-logs' },
        { icon: Wrench, label: t('navigation.maintenanceAnnouncements'), path: '/superadmin/maintenance-announcements' },
        { icon: BadgeAlert, label: t('navigation.maintenance'), path: '/superadmin/system-maintenance' },
        { icon: Megaphone, label: t('navigation.patchNotes'), path: '/superadmin/patch-notes' },
      ];
    }

    const items = [];

    if (isAdmin) {
      // Admin items - check permissions for each feature
      if (isFeatureEnabled('enableUserManagement')) {
        items.push({ icon: Users, label: t('navigation.userManagement'), path: '/app/admin/users' });
      }
      
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: Users2, label: t('navigation.classManagement'), path: '/app/admin/classes' });
      }
      
      if (isFeatureEnabled('enableSchoolSettings')) {
        items.push({ icon: Building, label: t('navigation.schoolBranches'), path: '/app/admin/schools' });
      }
      
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: t('navigation.gradeManagement'), path: '/app/admin/grades/manage' });
      }
      
      if (isFeatureEnabled('enableAnalytics')) {
        items.push({ icon: BarChart3, label: t('navigation.studentProgress'), path: '/app/admin/student-stats' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: t('navigation.notifications'), path: '/app/admin/notifications' });
      }
      
      if (isFeatureEnabled('enableRatings')) {
        items.push({ icon: Star, label: t('navigation.ratings'), path: '/app/admin/ratings' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: t('navigation.schedule'), path: '/app/admin/schedule' });
      }
      
      if (isFeatureEnabled('enablePayments')) {
        items.push({ icon: CreditCard, label: t('navigation.payments'), path: '/app/admin/payments' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/admin/contact' });
      }
      
      // Attendance System - Admin can manage everything
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: UserCheck, label: t('navigation.attendanceManagement'), path: '/app/admin/attendance' });
      }
    }

    if (isTeacher) {
      // Teacher items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: t('navigation.gradeManagement'), path: '/app/teacher/grades/manage' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: t('navigation.notifications'), path: '/app/teacher/notifications' });
      }
      
      if (isFeatureEnabled('enableAnalytics')) {
        items.push({ icon: BarChart3, label: t('navigation.studentStats'), path: '/app/teacher/student-stats' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: t('navigation.schedule'), path: '/app/teacher/schedule' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/teacher/contact' });
      }
      
      // Attendance System - Temporarily disabled for teachers
      // if (isFeatureEnabled('enableClasses')) {
      //   items.push({ icon: UserCheck, label: t('navigation.attendance'), path: '/app/teacher/attendance' });
      // }
    }

    if (isStudent) {
      // Student items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: t('navigation.myGrades'), path: '/app/student/grades' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: t('navigation.notifications'), path: '/app/student/notifications' });
      }
      
      if (isFeatureEnabled('enableSchedule')) {
        items.push({ icon: Clock, label: t('navigation.schedule'), path: '/app/student/schedule' });
      }
      
      if (isFeatureEnabled('enableRatings')) {
        items.push({ icon: Star, label: t('navigation.ratingSubmission'), path: '/app/student/ratings' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/student/contact' });
      }
      
      // Attendance System - Students can view their attendance
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: UserCheck, label: t('navigation.myAttendance'), path: '/app/student/attendance' });
      }
    }

    if (isParent) {
      // Parent items - check permissions for each feature
      if (isFeatureEnabled('enableGrades')) {
        items.push({ icon: BookOpen, label: t('navigation.childGrades'), path: '/app/parent/grades' });
      }
      
      if (isFeatureEnabled('enableNotifications')) {
        items.push({ icon: Bell, label: t('navigation.notifications'), path: '/app/parent/notifications' });
      }
      
      if (isFeatureEnabled('enablePayments')) {
        items.push({ icon: CreditCard, label: t('navigation.payments'), path: '/app/parent/payments' });
      }
      
      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/parent/contact' });
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
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-card">
      {/* User Profile Section */}
      <div className="p-4 bg-gradient-to-br from-primary/5 via-background/50 to-secondary/5 border-b border-border/50">
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-16 w-16 hover:scale-105 transition-transform duration-200 border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
            <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="font-semibold text-sm text-foreground">{user?.name || 'User'}</h3>
            <p className="text-xs text-primary/80 capitalize font-medium">
              {user?.role === 'admin' ? t('sidebar.administrator') : user?.role === 'teacher' ? t('sidebar.teacher') : user?.role === 'student' ? t('sidebar.student') : user?.role === 'parent' ? t('sidebar.parent') : t('sidebar.user')}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Divider */}
      <div className="px-4 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4 space-y-1 bg-gradient-to-b from-card/20 to-transparent">
        <nav className="space-y-2">
        {/* Dashboard Button - Role Specific */}
        <Button
          variant={isPathSelected(getDashboardPath()) ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-auto py-3 px-4 rounded-lg transition-all duration-300 ease-in-out group relative overflow-hidden",
            isPathSelected(getDashboardPath()) 
              ? "bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-lg border border-primary/20 hover:from-primary/20 hover:to-secondary/15" 
              : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:shadow-md hover:border hover:border-primary/10 hover:text-foreground"
          )}
          onClick={() => handleNavigation(getDashboardPath())}
        >
          <LayoutDashboard className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors", 
            isPathSelected(getDashboardPath()) ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
          <span className="text-sm font-medium">{t('navigation.dashboard')}</span>
          {isPathSelected(getDashboardPath()) && (
            <div className="absolute right-2 w-2 h-2 rounded-full bg-primary/60"></div>
          )}
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
                "w-full justify-start h-auto py-3 px-4 rounded-lg transition-all duration-300 ease-in-out group relative overflow-hidden",
                isSelected 
                  ? "bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-lg border border-primary/20 hover:from-primary/20 hover:to-secondary/15" 
                  : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:shadow-md hover:border hover:border-primary/10 hover:text-foreground"
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors", 
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
              <span className="text-sm font-medium">{item.label}</span>
              {isSelected && (
                <div className="absolute right-2 w-2 h-2 rounded-full bg-primary/60"></div>
              )}
            </Button>
          );
        })}
        </nav>
      </ScrollArea>

      {/* Enhanced Divider */}
      <div className="px-4 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      </div>

      {/* Profile and Logout Section */}
      <div className="p-3 space-y-2 bg-gradient-to-br from-secondary/5 to-primary/5 border-t border-border/50">
        {/* Profile Button - Always available */}
        <Button
          variant={isPathSelected('/app/profile') ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-auto py-3 px-4 rounded-lg transition-all duration-300 ease-in-out group relative overflow-hidden",
            isPathSelected('/app/profile') 
              ? "bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-lg border border-primary/20 hover:from-primary/20 hover:to-secondary/15" 
              : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 hover:shadow-md hover:border hover:border-primary/10 hover:text-foreground"
          )}
          onClick={() => handleNavigation('/app/profile')}
        >
          <User className={cn("mr-3 h-5 w-5 transition-colors", 
            isPathSelected('/app/profile') ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
          <span className="text-sm font-medium">{t('navigation.profile')}</span>
          {isPathSelected('/app/profile') && (
            <div className="absolute right-2 w-2 h-2 rounded-full bg-primary/60"></div>
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start py-3 px-4 rounded-lg text-destructive hover:text-destructive hover:bg-gradient-to-r hover:from-destructive/10 hover:to-destructive/5 hover:shadow-md hover:border hover:border-destructive/20 transition-all duration-300 group"
          onClick={handleLogoutClick}
        >
          <LogOut className="mr-3 h-5 w-5 transition-colors group-hover:text-destructive" />
          <span className="text-sm font-medium">{t('sidebar.logout')}</span>
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
            <DialogTitle>{t('sidebar.logoutConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('sidebar.logoutConfirmDescription')}
            {t('sidebar.logoutConfirmText')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogoutCancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleLogoutConfirm}>
              {t('sidebar.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar; 