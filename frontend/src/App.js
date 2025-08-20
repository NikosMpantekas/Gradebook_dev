import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import { useSelector, useDispatch } from 'react-redux';
import './globals.css';

// Initialize i18n
import './i18n/i18n';


// CRITICAL FIX: Import error handling and safety guard systems
import { initGlobalErrorHandlers, trackError } from './utils/errorHandler';
import { applyGlobalSafetyGuards } from './utils/safetyGuards';

// Layout Components
import Layout from './components/layout/Layout';
import ScrollFix from './components/layout/ScrollFix';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import TeacherRoute from './components/TeacherRoute';
import StudentProgressRoute from './components/StudentProgressRoute';
import ParentRoute from './components/ParentRoute';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import PasswordChange from './components/PasswordChange';
import Maintenance from './pages/Maintenance';

// Common Pages
import StandaloneDashboard from './pages/StandaloneDashboard';
import DiagnosticPage from './pages/DiagnosticPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotificationDetail from './pages/NotificationDetail';
import UserContactMessages from './pages/UserContactMessages';
import ContactMessages from './pages/ContactMessages';
import Calendar from './pages/Calendar';
import Schedule from './pages/common/Schedule';
import StudentStats from './pages/common/StudentStats';
import StudentStatsPrint from './pages/common/StudentStatsPrint';
import PrintGradePage from './pages/print/PrintGradePage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentGrades from './pages/student/StudentGrades';
import GradeDetail from './pages/student/GradeDetail';
import RatingSubmission from './pages/student/RatingSubmission';

// Parent Pages
import ParentDashboard from './pages/ParentDashboard';
import ParentGrades from './pages/parent/ParentGrades';

// Teacher Pages
import ManageGrades from './pages/teacher/ManageGrades';
import CreateGradeSimple from './pages/teacher/CreateGradeSimple';
import NotificationsManager from './pages/teacher/TeacherNotifications';
import CreateNotification from './pages/teacher/CreateNotification';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
// CRITICAL FIX: Use error-wrapped version of CreateUser to fix the TypeError in direction selection
import CreateUserErrorWrapper from './pages/admin/CreateUserErrorWrapper';
import EditUser from './pages/admin/EditUser';
import StudentProgress from './pages/admin/StudentProgress';
import AdminContactMessages from './pages/admin/ContactMessages';
import ManageDirections from './pages/admin/ManageDirections';
import ManageClasses from './pages/admin/ManageClasses';
import ManageSubjects from './pages/admin/ManageSubjects';
import SchoolBranchManager from './pages/admin/SchoolBranchManager';
import RatingManager from './pages/admin/RatingManager';
import RatingStatistics from './pages/admin/RatingStatistics';
import SystemMaintenance from './pages/admin/SystemMaintenance';
import ErrorBoundary from './components/common/ErrorBoundary';

// SuperAdmin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import CreateSchoolOwner from './pages/superadmin/CreateSchoolOwner';
import SchoolOwnerDetails from './pages/superadmin/SchoolOwnerDetails';
import ManageSchoolFeatures from './pages/superadmin/ManageSchoolFeatures';
import SuperAdminNotifications from './pages/superadmin/SuperAdminNotifications';
import SchoolPermissionsManager from './components/superadmin/SchoolPermissionsManager';
import SystemLogs from './pages/superadmin/SystemLogs';

// Modern Push notification service
import PushNotificationManager from './services/PushNotificationManager';
import setupAxios from './app/setupAxios';
import logger from './services/loggerService';
// Using the ErrorBoundary from ./components/ErrorBoundary
import { appConfig, initAppConfig } from './config/appConfig';

// Feature toggles context provider
import { FeatureToggleProvider } from './context/FeatureToggleContext';

// Custom components
import HomeScreenPrompt from './components/HomeScreenPrompt';
import AndroidInstallPrompt from './components/AndroidInstallPrompt';
import FloatingPushToggle from './components/FloatingPushToggle';

function App() {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const [configInitialized, setConfigInitialized] = useState(false);
  
  // Log important application state on mount and auth changes
  useEffect(() => {
    logger.info('APP', 'Application state updated', {
      isAuthenticated: !!user,
      userRole: user?.role,
      authLoading: isLoading,
      darkMode,
      currentPath: window.location.pathname,
      userState: user ? {
        hasId: !!user._id,
        hasRole: !!user.role,
        hasToken: !!user.token,
        role: user.role,
        hasSchool: !!user.school,
        hasSchoolId: !!user.schoolId
      } : 'No user'
    });
    
    // Special logging for superadmin users
    if (user?.role === 'superadmin') {
      logger.info('APP', 'Superadmin user detected', {
        id: user._id || user.id || 'Missing ID',
        token: user.token ? 'Present' : 'Missing',
        currentPath: window.location.pathname,
        userKeys: Object.keys(user)
      });
    }
  }, [user, isLoading, darkMode]);

  // Initialize app configuration and error handlers safely
  useEffect(() => {
    try {
      // First, initialize the global error handlers
      console.log('[App] Initializing global error handlers (v' + appConfig.version + ')');
      initGlobalErrorHandlers();
      
      // CRITICAL FIX: Apply global safety guards to prevent TypeErrors
      // This prevents the "x(...) is undefined" errors by providing safe fallbacks
      // for all array operations and object property access
      console.log('[App] Applying global safety guards to prevent TypeErrors');
      const safetyApplied = applyGlobalSafetyGuards();
      console.log(`[App] Global safety guards ${safetyApplied ? 'successfully applied' : 'failed to apply'}`);
      
      // Then initialize app configuration
      console.log('[App] Initializing app configuration');
      const initResult = initAppConfig();
      setConfigInitialized(initResult);
      
      if (!initResult) {
        console.error('[App] Failed to initialize app configuration');
        trackError(new Error('App configuration initialization failed'), 'App');
      }
    } catch (error) {
      console.error('[App] Error during initialization:', error);
      trackError(error, 'App.initialization');
      setConfigInitialized(false);
    }
  }, [setConfigInitialized]);
  
  // Initialize axios interceptors for token management
  useEffect(() => {
    console.log('Setting up global axios interceptors');
    setupAxios();
  }, []);

  // Initialize modern push notification service when user is logged in - AUTO-ENABLE FOR ALL USERS
  useEffect(() => {
    if (user && user.token && configInitialized) {
      console.log('[App] User is logged in, auto-enabling push notifications for all users');
      
      // Initialize and auto-enable push notifications
      const initializePushNotifications = async () => {
        try {
          const pushManager = new PushNotificationManager();
          
          // Register the modern service worker
          const result = await pushManager.initializeServiceWorker();
          
          if (result.success) {
            console.log('[App] Modern push notifications initialized successfully');
            
            // Auto-enable push notifications after a short delay
            setTimeout(async () => {
              try {
                console.log('[App] Auto-enabling push notifications for user');
                const enableResult = await pushManager.enablePushNotifications();
                
                if (enableResult.success) {
                  console.log('[App] Push notifications auto-enabled successfully');
                } else {
                  console.log('[App] Push notifications auto-enable failed:', enableResult.error);
                }
              } catch (enableError) {
                console.error('[App] Auto-enable push notifications error:', enableError);
              }
            }, 3000); // Wait 3 seconds to ensure everything is loaded
            
          } else {
            console.log('[App] Modern push notifications initialization failed:', result.error);
          }
        } catch (error) {
          console.error('[App] Modern push notifications initialization error:', error);
        }
      };
      
      initializePushNotifications();
    }
  }, [user, configInitialized]);

  // Add service worker update handling
  useEffect(() => {
    // This effect handles service worker updates for PWA
    if ('serviceWorker' in navigator) {
      // Listen for service worker controller changes (which happen after updates)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed - new version available');
        // Optional: can reload automatically or show a notification
        // window.location.reload();
      });
      
      // Force update check on page load (for home screen launches)
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    }
  }, []);
  
  // Special initialization to ensure Redux is synced with storage
  useEffect(() => {
    // If Redux has no user but session storage does, we need to forcibly sync
    if (!user) {
      try {
        const sessionUser = sessionStorage.getItem('user');
        const localUser = localStorage.getItem('user');
        
        let userData = null;
        if (sessionUser) {
          userData = JSON.parse(sessionUser);
          console.log('Found user in sessionStorage, syncing with Redux');
        } else if (localUser) {
          userData = JSON.parse(localUser);
          console.log('Found user in localStorage, syncing with Redux');
        }
        
        if (userData && userData.token) {
          // Create a manual login action to update Redux state
          dispatch({
            type: 'auth/login/fulfilled',
            payload: userData
          });
        }
      } catch (err) {
        console.error('Error syncing storage with Redux:', err);
      }
    }
  }, [user, dispatch]);

  // Theme colors are now handled by the ThemeProvider component

  // Push notifications are now handled by the first useEffect above that checks for user authentication

  // Console log initial state - helps with debugging
  console.log('App rendering with auth state:', { isLoggedIn: !!user });

  // Global error handler for uncaught exceptions
  useEffect(() => {
    const handleGlobalError = (event) => {
      event.preventDefault();
      
      logger.critical('GLOBAL', 'Unhandled error caught by window.onerror', {
        message: event.message,
        source: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        error: event.error?.stack || 'No stack trace available',
        currentPath: window.location.pathname
      });
      
      // Set routing error if related to routing
      if (event.message?.includes('router') || event.message?.includes('navigate')) {
        // setRoutingError(event.message); // This line was removed as per the edit hint
      }
    };
    
    // Handle unhandled promise rejections
    const handlePromiseRejection = (event) => {
      logger.critical('GLOBAL', 'Unhandled Promise rejection', {
        reason: event.reason?.message || event.reason,
        stack: event.reason?.stack || 'No stack trace',
        currentPath: window.location.pathname
      });
    };
    
/*     // Handle React errors
    const handleReactError = (error, errorInfo) => {
      logger.critical('REACT', 'Error in React component tree', {
        error: error.message,
        componentStack: errorInfo?.componentStack,
        stack: error.stack,
        currentPath: window.location.pathname
      });
    }; */
    
    // Register handlers
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []); // Changed dependency array to []

  return (
    <ErrorBoundary fallback={<DiagnosticPage />} componentName="Application Root">
    <ThemeProvider>
      <ScrollFix /> {/* Fix for Safari elastic scroll */}
      <FeatureToggleProvider>
        <HomeScreenPrompt />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<PasswordChange />} />
            <Route path="/register" element={<Register />} />
            <Route path="/diagnostics" element={<DiagnosticPage />} />
            <Route path="/maintenance" element={<Maintenance />} />
          
          {/* Root redirect based on role */}
          <Route path="/" element={
            (() => {
              console.log('=== ROOT ROUTE REDIRECT LOGIC ===');
              console.log('Current URL:', window.location.href);
              console.log('User object:', user);
              console.log('User role:', user?.role);
              console.log('Auth state:', { isAuthenticated: !!user, hasToken: !!user?.token });
              
              if (!user) {
                console.log('ROOT REDIRECT: No user found, redirecting to /home');
                return <Navigate to="/home" replace />;
              }
              
              const redirectPath = 
                user.role === 'superadmin' ? '/superadmin/dashboard' :
                user.role === 'admin' ? '/app/admin' :
                user.role === 'teacher' ? '/app/teacher' :
                user.role === 'student' ? '/app/student' :
                user.role === 'parent' ? '/app/parent' :
                '/login';
              
              console.log(`ROOT REDIRECT: User role ${user.role} redirecting to ${redirectPath}`);
              return <Navigate to={redirectPath} replace />;
            })()
          } />

          {/* Legacy dashboard redirects */}
          <Route path="/app/dashboard" element={
            (() => {
              console.log('=== LEGACY DASHBOARD REDIRECT ===');
              console.log('Current URL:', window.location.href);
              console.log('User:', user);
              console.log('User role:', user?.role);
              
              if (!user?.role) {
                console.log('LEGACY REDIRECT: No user role, redirecting to /login');
                return <Navigate to="/login" replace />;
              }
              
              const redirectPath = 
                user.role === 'admin' ? '/app/admin' :
                user.role === 'teacher' ? '/app/teacher' :
                user.role === 'student' ? '/app/student' :
                user.role === 'parent' ? '/app/parent' :
                '/login';
              
              console.log(`LEGACY REDIRECT: ${user.role} redirecting to ${redirectPath}`);
              return <Navigate to={redirectPath} replace />;
            })()
          } />
            
          {/* Simple direct Dashboard route - using standalone component designed to work without Layout */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <StandaloneDashboard />
            </PrivateRoute>
          } />
          
          {/* Protected Routes with Layout */}
          <Route element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            {/* Dashboard Routes */}
            <Route path="/app/admin" element={<AdminDashboard />} />
            <Route path="/app/teacher" element={<TeacherDashboard />} />
            <Route path="/app/student" element={<StudentDashboard />} />
            <Route path="/app/parent" element={<ParentDashboard />} />
            
            <Route path="/app/profile" element={<Profile />} />
            {/* General notifications route */}
            <Route path="/app/notifications" element={<Notifications />} />
            {/* Notification detail route still available for deep linking */}
            <Route path="/app/notifications/:id" element={<NotificationDetail />} />
            {/* Contact routes for all account types */}
            <Route path="/app/admin/contact" element={<ContactMessages />} />
            <Route path="/app/teacher/contact" element={<ContactMessages />} />
            <Route path="/app/student/contact" element={<ContactMessages />} />
            <Route path="/app/parent/contact" element={<ContactMessages />} />
            {/* Legacy contact routes */}
            <Route path="/app/contact-messages" element={<ContactMessages />} />
            <Route path="/app/contact-support" element={<ContactMessages />} />
            {/* Calendar for all users */}
            <Route path="/app/calendar" element={<Calendar />} />
            {/* Schedule for all users */}
            <Route path="/app/schedule" element={<Schedule />} />
            
            {/* Student Routes */}
            <Route path="/app/grades" element={<StudentGrades />} />
            <Route path="/app/grades/:id" element={<GradeDetail />} />
            <Route path="/app/ratings" element={<RatingSubmission />} />
            
            {/* Student-specific routes (same content, different paths) */}
            <Route path="/app/student/grades" element={<StudentGrades />} />
            <Route path="/app/student/grades/:id" element={<GradeDetail />} />
            <Route path="/app/student/notifications" element={<Notifications />} />
            <Route path="/app/student/notifications/:id" element={<NotificationDetail />} />
            <Route path="/app/student/schedule" element={<Schedule />} />
            
            
            {/* STEP 2: DUPLICATE ALL ADMIN FUNCTIONS FOR STUDENT ROLE */}
            <Route path="/app/student/users" element={
              <StudentProgressRoute>
                <ManageUsers />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/users/create" element={
              <StudentProgressRoute>
                <CreateUserErrorWrapper />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/users/:id" element={
              <StudentProgressRoute>
                <EditUser />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/classes" element={
              <StudentProgressRoute>
                <ManageClasses />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/students" element={
              <StudentProgressRoute>
                <ManageUsers />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/teachers" element={
              <StudentProgressRoute>
                <ManageUsers />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/grades/create" element={
              <StudentProgressRoute>
                <CreateGradeSimple />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/grades/manage" element={
              <StudentProgressRoute>
                <ManageGrades />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/student-stats" element={
              <StudentProgressRoute>
                <StudentStats />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/notifications/create" element={
              <StudentProgressRoute>
                <CreateNotification />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/notifications/manage" element={
              <StudentProgressRoute>
                <NotificationsManager />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/schools" element={
              <StudentProgressRoute>
                <SchoolBranchManager />
              </StudentProgressRoute>
            } />
            <Route path="/app/student/schedule" element={
              <StudentProgressRoute>
                <Schedule />
              </StudentProgressRoute>
            } />
            
            {/* Teacher Routes */}
            <Route path="/app/teacher/grades/manage" element={
              <TeacherRoute>
                <ManageGrades />
              </TeacherRoute>
            } />
            <Route path="/app/teacher/grades/create" element={
              <TeacherRoute>
                <ErrorBoundary componentName="Create Grade">
                  <CreateGradeSimple />
                </ErrorBoundary>
              </TeacherRoute>
            } />
            <Route path="/app/teacher/notifications" element={
              <TeacherRoute>
                <NotificationsManager />
              </TeacherRoute>
            } />
            <Route path="/app/teacher/notifications/create" element={
              <TeacherRoute>
                <CreateNotification />
              </TeacherRoute>
            } />
            <Route path="/app/teacher/notifications/:id" element={
              <TeacherRoute>
                <NotificationDetail />
              </TeacherRoute>
            } />
            {/* Add back the teacher student-stats route */}
            <Route path="/app/teacher/student-stats" element={
              <TeacherRoute>
                <StudentStats />
              </TeacherRoute>
            } />
            
            {/* STEP 2: TEACHER FUNCTIONS (REFINED - REMOVED MANAGEMENT FUNCTIONS PER USER REQUEST) */}
            {/* NOTE: Removed /app/teacher/users, /app/teacher/classes, /app/teacher/students, /app/teacher/teachers, /app/teacher/schools per user request */}
            <Route path="/app/teacher/schedule" element={
              <TeacherRoute>
                <Schedule />
              </TeacherRoute>
            } />
            
            {/* Admin Routes */}
            {/* Admin Dashboard - add both /app/admin and /app/admin/dashboard routes */}
            <Route path="/app/admin/users" element={
              <AdminRoute>
                <ManageUsers />
              </AdminRoute>
            } />
            <Route path="/app/admin/progress" element={
              <AdminRoute>
                <StudentProgress />
              </AdminRoute>
            } />
            <Route path="/app/admin/progress/:studentId" element={
              <AdminRoute>
                <StudentProgress />
              </AdminRoute>
            } />
            <Route path="/app/admin/student-stats" element={
              <AdminRoute>
                <StudentStats />
              </AdminRoute>
            } />
            {/* Admin notifications - add missing base route that redirects to manage */}
            <Route path="/app/admin/notifications" element={
              <AdminRoute>
                <NotificationsManager />
              </AdminRoute>
            } />
            <Route path="/app/admin/notifications/create" element={
              <AdminRoute>
                <CreateNotification />
              </AdminRoute>
            } />
            <Route path="/app/admin/notifications/manage" element={
              <AdminRoute>
                <NotificationsManager />
              </AdminRoute>
            } />
            <Route path="/app/admin/notifications/:id" element={
              <AdminRoute>
                <NotificationDetail />
              </AdminRoute>
            } />
            <Route path="/app/admin/grades/create" element={
              <AdminRoute>
                <CreateGradeSimple />
              </AdminRoute>
            } />
            <Route path="/app/admin/grades/manage" element={
              <AdminRoute>
                <ManageGrades />
              </AdminRoute>
            } />
            <Route path="/app/admin/users/create" element={
              <AdminRoute>
                <CreateUserErrorWrapper />
              </AdminRoute>
            } />

            <Route path="/app/admin/users/:id" element={
              <AdminRoute>
                <EditUser />
              </AdminRoute>
            } />
            {/* Contact Messages moved to superadmin - route left here for backward compatibility */}
            <Route path="/app/admin/contact" element={
              <AdminRoute>
                <Navigate to="/superadmin/contact" replace />
              </AdminRoute>
            } />
            <Route path="/app/admin/schools" element={
              <AdminRoute>
                <SchoolBranchManager />
              </AdminRoute>
            } />
            <Route path="/app/admin/directions" element={
              <AdminRoute>
                <ManageDirections />
              </AdminRoute>
            } />
            <Route path="/app/admin/classes" element={
              <AdminRoute>
                <ManageClasses />
              </AdminRoute>
            } />
            <Route path="/app/admin/subjects" element={
              <AdminRoute>
                <ManageSubjects />
              </AdminRoute>
            } />
            <Route path="/app/admin/ratings" element={
              <AdminRoute>
                <RatingManager />
              </AdminRoute>
            } />
            <Route path="/app/admin/rating-statistics" element={
              <AdminRoute>
                <ErrorBoundary componentName="Rating Statistics">
                  <RatingStatistics />
                </ErrorBoundary>
              </AdminRoute>
            } />
            {/* System Maintenance - SuperAdmin Only */}
            <Route path="/app/admin/system-maintenance" element={
              <SuperAdminRoute>
                <SystemMaintenance />
              </SuperAdminRoute>
            } />
            <Route path="/app/admin/schedule" element={
              <AdminRoute>
                <Schedule />
              </AdminRoute>
            } />
            <Route path="/app/admin/student-stats" element={
              <AdminRoute>
                <StudentStats />
              </AdminRoute>
            } />
            <Route path="/app/teacher/student-stats" element={
              <TeacherRoute>
                <StudentStats />
              </TeacherRoute>
            } />

            
            {/* Parent Routes */}
            <Route path="/app/parent" element={
              <ParentRoute>
                <ParentDashboard />
              </ParentRoute>
            } />
            <Route path="/app/parent/dashboard" element={
              <ParentRoute>
                <ParentDashboard />
              </ParentRoute>
            } />
            <Route path="/app/parent/grades" element={
              <ParentRoute>
                <ParentGrades />
              </ParentRoute>
            } />
            <Route path="/app/parent/notifications" element={
              <ParentRoute>
                <Notifications />
              </ParentRoute>
            } />
            <Route path="/app/parent/notifications/:id" element={
              <ParentRoute>
                <NotificationDetail />
              </ParentRoute>
            } />
            <Route path="/app/parent/contact" element={
              <ParentRoute>
                <UserContactMessages />
              </ParentRoute>
            } />

          </Route>

          {/* SuperAdmin Routes - Using PrivateRoute + Layout + SuperAdminRoute pattern */}
          <Route element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route path="/superadmin/dashboard" element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/create-school-owner" element={
              <SuperAdminRoute>
                <CreateSchoolOwner />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/school-owner/:id" element={
              <SuperAdminRoute>
                <SchoolOwnerDetails />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/contact" element={
              <SuperAdminRoute>
                <AdminContactMessages />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/patch-notes" element={
              <SuperAdminRoute>
                <ContactMessages />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/notifications" element={
              <SuperAdminRoute>
                <SuperAdminNotifications />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/notifications/:id" element={
              <SuperAdminRoute>
                <NotificationDetail />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/school-features" element={
              <SuperAdminRoute>
                <ManageSchoolFeatures />
              </SuperAdminRoute>
            } />
            <Route path="/superadmin/school-permissions" element={
              <SuperAdminRoute>
                <SchoolPermissionsManager />
              </SuperAdminRoute>
            } />

            <Route path="/superadmin/system-logs" element={
              <SuperAdminRoute>
                <SystemLogs />
              </SuperAdminRoute>
            } />
          </Route>
          
          {/* Print Grade Page - Standalone route without layout */}
          <Route path="/print-grades" element={<PrintGradePage />} />
          
          {/* Student Stats Print Page - Standalone route without layout */}
          <Route path="/student-stats/print" element={<StudentStatsPrint />} />
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
      {/* Modern Push notification settings component is now embedded in other pages when needed */}
      {/* Android PWA Installation Prompt */}
      <AndroidInstallPrompt />
      {/* Floating Push Notification Toggle */}
      <FloatingPushToggle />
      </FeatureToggleProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
