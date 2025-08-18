import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Bell,
  User,
  UserCog,
  Plus,
  Users,
  Building,
  FolderOpen,
  FileText,
  BarChart3,
  Mail,
  Shield,
  UserPlus,
  Calendar,
  Clock,
  Star,
  MessageCircle,
  ContactRound,
  Megaphone,
  Users2,
  TrendingUp,
  HelpCircle,
  Info,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Sheet, SheetContent } from '../ui/sheet';
import { cn } from '../../lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
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
  
  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app/dashboard' },
      { icon: Bell, label: 'Notifications', path: '/app/notifications' },
      { icon: User, label: 'Profile', path: '/app/profile' },
    ];

    if (isSuperAdmin) {
      return [
        ...baseItems,
        { icon: Shield, label: 'Super Admin', path: '/superadmin/dashboard' },
        { icon: Building, label: 'School Management', path: '/superadmin/school-features' },
        { icon: Users, label: 'User Management', path: '/superadmin/create-school-owner' },
        { icon: BarChart3, label: 'System Logs', path: '/superadmin/system-logs' },
      ];
    }

    if (isAdmin) {
      return [
        ...baseItems,
        { icon: UserCog, label: 'Admin Panel', path: '/app/admin' },
        { icon: Users, label: 'Manage Users', path: '/app/admin/users' },
        { icon: Building, label: 'School Branches', path: '/app/admin/schools' },
        { icon: FolderOpen, label: 'Directions', path: '/app/admin/directions' },
        { icon: FileText, label: 'Subjects', path: '/app/admin/subjects' },
        { icon: Users2, label: 'Classes', path: '/app/admin/classes' },
        { icon: BarChart3, label: 'Student Progress', path: '/app/admin/progress' },
        { icon: Star, label: 'Ratings', path: '/app/admin/ratings' },
        { icon: Settings, label: 'System', path: '/app/admin/system-maintenance' },
      ];
    }

    if (isTeacher) {
      return [
        ...baseItems,
        { icon: GraduationCap, label: 'Teacher Panel', path: '/app/teacher' },
        { icon: BookOpen, label: 'Manage Grades', path: '/app/teacher/grades/manage' },
        { icon: Plus, label: 'Create Grade', path: '/app/teacher/grades/create' },
        { icon: Bell, label: 'Send Notifications', path: '/app/teacher/notifications' },
        { icon: BarChart3, label: 'Student Stats', path: '/app/teacher/student-stats' },
        { icon: Clock, label: 'Schedule', path: '/app/teacher/schedule' },
      ];
    }

    if (isStudent) {
      return [
        ...baseItems,
        { icon: BookOpen, label: 'My Grades', path: '/app/grades' },
        { icon: Star, label: 'Submit Ratings', path: '/app/ratings' },
        { icon: Clock, label: 'Schedule', path: '/app/schedule' },
        { icon: Calendar, label: 'Calendar', path: '/app/calendar' },
      ];
    }

    if (isParent) {
      return [
        ...baseItems,
        { icon: BookOpen, label: 'Child Grades', path: '/app/parent/grades' },
        { icon: Bell, label: 'Notifications', path: '/app/parent/notifications' },
        { icon: Clock, label: 'Schedule', path: '/app/parent/schedule' },
        { icon: Calendar, label: 'Calendar', path: '/app/parent/calendar' },
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const isPathSelected = (path) => {
    if (path === '/app/dashboard') {
      return location.pathname === '/app/dashboard' || location.pathname === '/app';
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
      <div className="p-4 border-b border-border">
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-16 w-16">
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

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isSelected = isPathSelected(item.path);
          
          return (
            <Button
              key={item.path}
              variant={isSelected ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-auto py-3 px-3",
                isSelected && "bg-secondary text-secondary-foreground"
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
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
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        {sidebarContent}
      </aside>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
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