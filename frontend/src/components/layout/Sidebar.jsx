import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  User,
  Users,
  Building,
  BarChart3,
  Clock,
  Star,
  Megaphone,
  Users2,
  LogOut,
  MessageSquare,
  CreditCard,
  Mail,
  BadgeAlert,
  Wrench,
  UserCheck,
  FlaskConical,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';

import { cn } from '../../lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';

import { ScrollArea } from '../ui/scroll-area';
import { useFeatureToggles } from '../../contexts/FeatureToggleContext';
import { useBeta } from '../../contexts/BetaContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const { isFeatureEnabled, loading: permissionsLoading } = useFeatureToggles();
  const { isBetaRoute } = useBeta();
  const { getCurrentThemeData } = useTheme();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [, setLogoutAnimating] = useState(false);

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

    // After animation, dispatch logout which triggers authService.logout()
    // authService.logout() already does window.location.replace('/login?...'), so we don't need navigate
    setTimeout(() => {
      dispatch(logout());

      // Cleanup overlay (window.location.replace() will reload anyway, but clean up for safety)
      document.body.classList.remove('logout-fade');
      try { overlay.remove(); } catch (e) { }
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
        { icon: Building, label: t('navigation.schoolManagement'), path: '/superadmin/school-permissions' },
        { icon: Bell, label: t('navigation.notifications', 'Notifications'), path: '/superadmin/notifications' },
        { icon: Mail, label: t('navigation.contactMessages'), path: '/superadmin/contact' },
        { icon: BarChart3, label: t('navigation.systemLogs'), path: '/superadmin/system-logs' },
        { icon: Wrench, label: t('navigation.maintenanceAnnouncements'), path: '/superadmin/maintenance-announcements' },
        { icon: BadgeAlert, label: t('navigation.maintenance'), path: '/superadmin/system-maintenance' },
        { icon: Megaphone, label: t('navigation.patchNotes'), path: '/superadmin/patch-notes' },
        { icon: FlaskConical, label: 'Beta Manager', path: '/superadmin/beta-manager' },
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

      // Attendance System - Admin can manage everything
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: UserCheck, label: t('navigation.attendanceManagement'), path: '/app/admin/attendance' });
      }

      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/admin/contact' });
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

      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: UserCheck, label: t('navigation.attendance'), path: '/app/teacher/attendance' });
      }

      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/teacher/contact' });
      }

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

      // Attendance System - Students can view their attendance
      if (isFeatureEnabled('enableClasses')) {
        items.push({ icon: UserCheck, label: t('navigation.myAttendance'), path: '/app/student/attendance' });
      }

      if (isFeatureEnabled('enableContact')) {
        items.push({ icon: MessageSquare, label: t('navigation.contactMessages'), path: '/app/student/contact' });
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

    // For student navigation items
    if (path === '/app/student/grades') {
      return location.pathname.startsWith('/app/student/grades') || location.pathname.startsWith('/app/grades');
    }
    if (path === '/app/student/notifications') {
      return location.pathname.startsWith('/app/student/notifications') || location.pathname.startsWith('/app/notifications');
    }
    if (path === '/app/student/schedule') {
      return location.pathname.startsWith('/app/student/schedule') || location.pathname.startsWith('/app/schedule');
    }
    if (path === '/app/student/ratings') {
      return location.pathname.startsWith('/app/student/ratings') || location.pathname.startsWith('/app/ratings');
    }

    // General notification highlighting for all roles (Admin, Teacher, Student)
    if (path.includes('notifications')) {
      return location.pathname.includes('notifications');
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

  // Get themed background color for sidebar (desktop)
  const getThemedSidebarBg = () => {
    const themeData = getCurrentThemeData();
    if (!themeData) return darkMode ? "bg-[#181b20]/95" : "bg-background/95";

    try {
      const colors = darkMode ? themeData.darkColors || themeData.colors : themeData.colors;
      const bgHex = colors.background.replace('#', '');
      const bgR = parseInt(bgHex.substr(0, 2), 16);
      const bgG = parseInt(bgHex.substr(2, 2), 16);
      const bgB = parseInt(bgHex.substr(4, 2), 16);

      const primaryHex = colors.primary.replace('#', '');
      const pR = parseInt(primaryHex.substr(0, 2), 16);
      const pG = parseInt(primaryHex.substr(2, 2), 16);
      const pB = parseInt(primaryHex.substr(4, 2), 16);

      // Blend a subtle primary tint onto the actual background
      const blend = darkMode ? 0.04 : 0.02;
      const r = Math.round(bgR + (pR - bgR) * blend);
      const g = Math.round(bgG + (pG - bgG) * blend);
      const b = Math.round(bgB + (pB - bgB) * blend);
      const opacity = darkMode ? 0.98 : 0.95;

      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } catch {
      return darkMode ? "bg-[#181b20]/95" : "bg-background/95";
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-16 w-16 hover:scale-105 transition-transform duration-200 bg-primary/10">
            <AvatarFallback className="text-lg font-semibold bg-primary/20 text-primary">
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
        <div className="h-px bg-border/50"></div>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4 space-y-1">
        <nav className="space-y-2">
          {/* Dashboard Button - Role Specific */}
          <Button
            variant={isPathSelected(getDashboardPath()) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start h-auto py-3 px-4 rounded-lg group relative overflow-hidden",
              "transition-colors duration-150 ease-out",
              isPathSelected(getDashboardPath())
                ? "bg-primary/15 text-primary"
                : "hover:bg-primary/5 hover:text-foreground"
            )}
            onClick={() => handleNavigation(getDashboardPath())}
          >
            <LayoutDashboard className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors",
              isPathSelected(getDashboardPath()) ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            <span className="text-sm font-medium truncate overflow-hidden max-w-[160px]">{t('navigation.dashboard')}</span>
            {isBetaRoute(getDashboardPath()) && (
              <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0">BETA</span>
            )}
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
                  "w-full justify-start h-auto py-3 px-4 rounded-lg group relative overflow-hidden",
                  "transition-colors duration-150 ease-out",
                  isSelected
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-primary/5 hover:text-foreground"
                )}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="text-sm font-medium truncate overflow-hidden max-w-[160px]">{item.label}</span>
                {isBetaRoute(item.path) && (
                  <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0">BETA</span>
                )}
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
        <div className="h-px bg-border/50"></div>
      </div>

      {/* Profile and Logout Section */}
      <div className="p-3 space-y-2">
        {/* Profile Button - Always available */}
        <Button
          variant={isPathSelected('/app/profile') ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-auto py-3 px-4 rounded-lg group relative overflow-hidden",
            "transition-colors duration-150 ease-out",
            isPathSelected('/app/profile')
              ? "bg-primary/15 text-primary"
              : "hover:bg-primary/5 hover:text-foreground"
          )}
          onClick={() => handleNavigation('/app/profile')}
        >
          <User className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-colors",
            isPathSelected('/app/profile') ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
          <span className="text-sm font-medium truncate overflow-hidden max-w-[160px]">{t('navigation.profile')}</span>
          {isPathSelected('/app/profile') && (
            <div className="absolute right-2 w-2 h-2 rounded-full bg-primary/60"></div>
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start py-3 px-4 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 ease-out group overflow-hidden"
          onClick={handleLogoutClick}
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 transition-colors group-hover:text-destructive" />
          <span className="text-sm font-medium truncate overflow-hidden max-w-[160px]">{t('sidebar.logout')}</span>
        </Button>
      </div>
    </div>
  );

  // Get themed background for mobile sidebar with frosted glass effect
  const getThemedMobileSidebarBg = () => {
    const themeData = getCurrentThemeData();
    if (!themeData) return darkMode ? "rgba(24, 27, 32, 0.6)" : "rgba(248, 250, 250, 0.7)";

    try {
      const colors = darkMode ? themeData.darkColors || themeData.colors : themeData.colors;
      const bgHex = colors.background.replace('#', '');
      const bgR = parseInt(bgHex.substr(0, 2), 16);
      const bgG = parseInt(bgHex.substr(2, 2), 16);
      const bgB = parseInt(bgHex.substr(4, 2), 16);

      const primaryHex = colors.primary.replace('#', '');
      const pR = parseInt(primaryHex.substr(0, 2), 16);
      const pG = parseInt(primaryHex.substr(2, 2), 16);
      const pB = parseInt(primaryHex.substr(4, 2), 16);

      // Blend a subtle primary tint onto the theme's background color
      const blend = darkMode ? 0.04 : 0.02;
      const r = Math.round(bgR + (pR - bgR) * blend);
      const g = Math.round(bgG + (pG - bgG) * blend);
      const b = Math.round(bgB + (pB - bgB) * blend);
      const opacity = darkMode ? 0.6 : 0.7;

      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } catch {
      return darkMode ? "rgba(24, 27, 32, 0.6)" : "rgba(248, 250, 250, 0.7)";
    }
  };

  const themedSidebarBg = getThemedSidebarBg();
  const themedMobileSidebarBg = getThemedMobileSidebarBg();

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={handleDrawerToggle}>
        <SheetContent
          side="left"
          className="w-64 p-0 backdrop-blur-xl overflow-hidden sidebar-animation transition-all duration-100 border-r border-[#2a3441]/30"
          style={{
            backgroundColor: typeof themedMobileSidebarBg === 'string' && themedMobileSidebarBg.startsWith('rgba') ? themedMobileSidebarBg : undefined
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation menu for the application</SheetDescription>
          </SheetHeader>
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-primary/50 pt-[env(safe-area-inset-top)]">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - No animations */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-64 no-animation overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-primary/50 transition-all duration-100 border-r border-[#2a3441]/30 pt-[env(safe-area-inset-top)]"
        style={{
          backgroundColor: typeof themedSidebarBg === 'string' && themedSidebarBg.startsWith('rgba') ? themedSidebarBg : undefined
        }}
      >
        {sidebarContent}
      </aside>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent
          className={cn(
            "w-[90vw] max-w-sm sm:max-w-md backdrop-blur-xl border-primary/20 transition-all duration-300",
            darkMode ? "text-foreground shadow-2xl shadow-primary/5" : "text-foreground shadow-xl shadow-primary/5"
          )}
          style={{
            backgroundColor: typeof themedMobileSidebarBg === 'string' && themedMobileSidebarBg.startsWith('rgba')
              ? themedMobileSidebarBg.replace(/0\.[67]/, '0.85') // Make it slightly more opaque for readability
              : undefined
          }}
        >
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

