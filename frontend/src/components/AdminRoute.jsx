import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useFeatureToggles } from '../contexts/FeatureToggleContext';
import LoadingState from './common/LoadingState';

// AdminRoute component that checks if user is an admin or a secretary with appropriate permissions
// If not, redirects to dashboard
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useSelector((state) => state.auth);
  const location = useLocation();
  const { isFeatureEnabled } = useFeatureToggles(); // Use database-driven feature checks

  // Minimal logging for debugging
  if (!user) {
  }

  if (user && user.role === 'secretary') {
  }

  // Show loading state while authentication is in progress
  if (isLoading) {
    return <LoadingState fullPage={true} message="Checking admin access..." />;
  }

  // CHECK 1: Verify user exists
  if (!user) {
    return <Navigate to="/login" />;
  }

  // CHECK 2: Allow superadmin access to all routes EXCEPT ratings
  if (user.role === 'superadmin') {
    // Block superadmins from ratings-related routes completely
    if (location.pathname.includes('/app/admin/ratings') || 
        location.pathname.includes('/app/admin/rating-statistics') ||
        location.pathname.includes('/app/teacher/ratings') ||
        location.pathname.includes('/app/ratings')) {
      return <Navigate to="/app/dashboard" />;
    }
    
    // Grant access to all other routes
    return children;
  }

  // CHECK 3: Allow admin access but check feature toggles
  if (user.role === 'admin') {
    
    // COMPREHENSIVE FEATURE FLAG ENFORCEMENT FOR ALL ADMIN ROUTES
    
    // Classes Management
    if (location.pathname.includes('/app/admin/classes')) {
      if (!isFeatureEnabled('enableClasses')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Grades Management
    if (location.pathname.includes('/app/admin/grades')) {
      if (!isFeatureEnabled('enableGrades')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Notifications Management
    if (location.pathname.includes('/app/admin/notifications')) {
      if (!isFeatureEnabled('enableNotifications')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // User Management
    if (location.pathname.includes('/app/admin/users')) {
      if (!isFeatureEnabled('enableUserManagement')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // School Settings
    if (location.pathname.includes('/app/admin/school-settings')) {
      if (!isFeatureEnabled('enableSchoolSettings')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // School Branches Management
    if (location.pathname.includes('/app/admin/school-branches')) {
      if (!isFeatureEnabled('enableSchoolSettings')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Schedule Management
    if (location.pathname.includes('/app/admin/schedule')) {
      if (!isFeatureEnabled('enableSchedule')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Students Management
    if (location.pathname.includes('/app/admin/students')) {
      if (!isFeatureEnabled('enableStudents')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Teachers Management
    if (location.pathname.includes('/app/admin/teachers')) {
      if (!isFeatureEnabled('enableTeachers')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    

    // Analytics/Statistics
    if (location.pathname.includes('/app/admin/analytics') || location.pathname.includes('/app/admin/statistics')) {
      if (!isFeatureEnabled('enableAnalytics')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Bug Reports
    if (location.pathname.includes('/app/admin/bug-reports')) {
      if (!isFeatureEnabled('enableBugReports')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Patch Notes
    if (location.pathname.includes('/app/admin/patch-notes')) {
      if (!isFeatureEnabled('enablePatchNotes')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Student Progress
    if (location.pathname.includes('/app/admin/progress')) {
      if (!isFeatureEnabled('enableStudentProgress')) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // Rating routes check already handled for superadmin
    
    // Check for ratings-related routes for other users
    if ((location.pathname.includes('/app/admin/ratings') || 
         location.pathname.includes('/app/admin/rating-statistics') || 
         location.pathname.includes('/app/teacher/ratings') || 
         location.pathname.includes('/app/ratings')) && 
        !isFeatureEnabled('enableRatingSystem')) {
      return <Navigate to="/app/dashboard" />;
    }
    

    if (location.pathname.includes('/app/admin/progress') && !isFeatureEnabled('enableStudentProgress')) {
      return <Navigate to="/app/dashboard" />;
    }
    
    if (location.pathname.includes('/app/admin/rating') && !isFeatureEnabled('enableRatingSystem')) {
      return <Navigate to="/app/dashboard" />;
    }
    
    // Force refresh state to ensure admin has all necessary data
    localStorage.setItem('admin_last_access', Date.now());
    return children;
  }
  
  // CHECK 4: For secretary, check both role permissions AND feature toggles
  if (user.role === 'secretary') {
    // Enable enhanced logging for secretary access attempts
    
    // For student progress - check school feature only
    if (location.pathname.includes('/app/admin/progress')) {
      const isFeatureActive = isFeatureEnabled('enableAnalytics');
      
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      
      return children;
    }
    
    // For user management - check school feature only
    if (location.pathname.includes('/app/admin/users')) {
      const isFeatureActive = isFeatureEnabled('enableUserManagement');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For school management - check school feature only
    if (location.pathname.includes('/app/admin/schools')) {
      const isFeatureActive = isFeatureEnabled('enableSchoolSettings');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For classes management - check school feature only  
    if (location.pathname.includes('/app/admin/classes')) {
      const isFeatureActive = isFeatureEnabled('enableClasses');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For grades management - check school feature only
    if (location.pathname.includes('/app/admin/grades')) {
      const isFeatureActive = isFeatureEnabled('enableGrades');
      
      
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // For notifications management - check school feature only
    if (location.pathname.includes('/app/admin/notifications')) {
      const isFeatureActive = isFeatureEnabled('enableNotifications');
      
      
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
    }
    
    // For schedule management - check school feature only
    if (location.pathname.includes('/app/admin/schedule')) {
      const isFeatureActive = isFeatureEnabled('enableSchedule');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For rating system - check school feature only
    if (location.pathname.includes('/app/admin/rating')) {
      const isFeatureActive = isFeatureEnabled('enableRatings');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For contact system - check school feature only
    if (location.pathname.includes('/app/admin/contact')) {
      const isFeatureActive = isFeatureEnabled('enableContact');
      if (!isFeatureActive) {
        return <Navigate to="/app/dashboard" />;
      }
      return children;
    }
    
    // For admin dashboard
    if (location.pathname === '/app/admin') {
      // Always grant access to the main admin dashboard
      return children;
    }
  }

  // Redirect to dashboard if they don't have permission
  return <Navigate to="/app/dashboard" />;
};

export default AdminRoute;

