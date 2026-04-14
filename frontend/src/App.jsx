import React, { useEffect, useState, useMemo } from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  createRoutesFromElements, 
  Route, 
  Navigate,
  ScrollRestoration,
  Outlet
} from 'react-router-dom';
import { ThemeProvider as ShadcnThemeProvider } from './components/theme-provider';
import { ThemeProvider } from './contexts/ThemeContext';
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
import GlobalErrorElement from './components/GlobalErrorElement';
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
import { MaintenanceStatusChecker } from './pages/MaintenancePage';
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
import TeacherAttendance from './pages/teacher/TeacherAttendance';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentGrades from './pages/student/StudentGrades';
import GradeDetail from './pages/student/GradeDetail';
import RatingSubmission from './pages/student/RatingSubmission';

// Parent Pages
import ParentDashboard from './pages/ParentDashboard';
import ParentGrades from './pages/parent/ParentGrades';
import ParentPayments from './pages/parent/Payments';

// Teacher Pages
import ManageGrades from './pages/teacher/ManageGrades';
import CreateGradeSimple from './pages/teacher/CreateGradeSimple';
import NotificationsManager from './pages/teacher/TeacherNotifications';
import CreateNotification from './pages/teacher/CreateNotification';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
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
import SystemMaintenance from './pages/superadmin/SystemMaintenance';
import AdminPayments from './pages/admin/Payments';
import WeeklyAttendanceManagement from './pages/admin/WeeklyAttendanceManagement';
import StudentAttendanceView from './pages/student/StudentAttendanceView';
import ErrorBoundary from './components/common/ErrorBoundary';

// SuperAdmin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import CreateSchoolOwner from './pages/superadmin/CreateSchoolOwner';
import SchoolOwnerDetails from './pages/superadmin/SchoolOwnerDetails';
import ManageSchoolFeatures from './pages/superadmin/ManageSchoolFeatures';
import SuperAdminNotifications from './pages/superadmin/SuperAdminNotifications';
import MaintenanceAnnouncements from './pages/superadmin/MaintenanceAnnouncements';
import SchoolPermissionsManager from './components/superadmin/SchoolPermissionsManager';
import SystemLogs from './pages/superadmin/SystemLogs';

// Modern Push notification service
import PushNotificationManager from './services/PushNotificationManager';
import setupAxios from './app/setupAxios';
import logger from './services/loggerService';
import { appConfig, initAppConfig } from './config/appConfig';

// Feature toggles context provider
import { FeatureToggleProvider } from './contexts/FeatureToggleContext';

// Custom components
import HomeScreenPrompt from './components/HomeScreenPrompt';

/**
 * RootWrapper component to include ScrollRestoration and MaintenanceStatusChecker
 * in the data router context.
 */
const RootWrapper = () => {
  return (
    <MaintenanceStatusChecker>
      <ScrollRestoration />
      <div className="flex flex-col min-h-screen">
        <Outlet />
      </div>
    </MaintenanceStatusChecker>
  );
};

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
  }, [user, isLoading, darkMode]);

  // Initialize app configuration and error handlers safely
  useEffect(() => {
    try {
      initGlobalErrorHandlers();
      applyGlobalSafetyGuards();
      const initResult = initAppConfig();
      setConfigInitialized(initResult);
    } catch (error) {
      console.error('[App] Error during initialization:', error);
      trackError(error, 'App.initialization');
      setConfigInitialized(false);
    }
  }, []);

  // Initialize axios interceptors
  useEffect(() => {
    setupAxios();
  }, []);

  // Initialize push notifications
  useEffect(() => {
    if (user && user.token && configInitialized) {
      const initializePushNotifications = async () => {
        try {
          const pushManager = new PushNotificationManager();
          await pushManager.initializeServiceWorker();
        } catch (error) {
          console.error('[App] Push notifications init error:', error);
        }
      };
      initializePushNotifications();
    }
  }, [user, configInitialized]);

  // Define the router with modern Data Router API
  const router = useMemo(() => createBrowserRouter(
    createRoutesFromElements(
      <Route element={<RootWrapper />} errorElement={<GlobalErrorElement />}>
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
          (!user) ? <Navigate to="/home" replace /> :
          (user.role === 'superadmin') ? <Navigate to="/superadmin/dashboard" replace /> :
          (user.role === 'admin') ? <Navigate to="/app/admin" replace /> :
          (user.role === 'teacher') ? <Navigate to="/app/teacher" replace /> :
          (user.role === 'student') ? <Navigate to="/app/student" replace /> :
          (user.role === 'parent') ? <Navigate to="/app/parent" replace /> :
          <Navigate to="/login" replace />
        } />

        {/* Legacy dashboard redirects */}
        <Route path="/app/dashboard" element={
          (!user?.role) ? <Navigate to="/login" replace /> :
          (user.role === 'admin') ? <Navigate to="/app/admin" replace /> :
          (user.role === 'teacher') ? <Navigate to="/app/teacher" replace /> :
          (user.role === 'student') ? <Navigate to="/app/student" replace /> :
          (user.role === 'parent') ? <Navigate to="/app/parent" replace /> :
          <Navigate to="/login" replace />
        } />

        {/* Simple direct Dashboard route */}
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
          <Route path="/app/admin" element={<AdminDashboard />} />
          <Route path="/app/teacher" element={<TeacherDashboard />} />
          <Route path="/app/student" element={<StudentDashboard />} />
          <Route path="/app/parent" element={<ParentDashboard />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/notifications" element={<Notifications />} />
          <Route path="/app/notifications/:id" element={<NotificationDetail />} />
          <Route path="/app/admin/contact" element={<ContactMessages />} />
          <Route path="/app/teacher/contact" element={<ContactMessages />} />
          <Route path="/app/student/contact" element={<ContactMessages />} />
          <Route path="/app/parent/contact" element={<ContactMessages />} />
          <Route path="/app/contact-messages" element={<ContactMessages />} />
          <Route path="/app/calendar" element={<Calendar />} />
          <Route path="/app/schedule" element={<Schedule />} />
          <Route path="/app/grades" element={<StudentGrades />} />
          <Route path="/app/grades/:id" element={<GradeDetail />} />
          <Route path="/app/ratings" element={<RatingSubmission />} />
          
          {/* Explicit Student Routes */}
          <Route path="/app/student/grades" element={<StudentGrades />} />
          <Route path="/app/student/grades/:id" element={<GradeDetail />} />
          <Route path="/app/student/notifications" element={<Notifications />} />
          <Route path="/app/student/notifications/:id" element={<NotificationDetail />} />
          <Route path="/app/student/schedule" element={<Schedule />} />
          
          <Route path="/app/student/users" element={<StudentProgressRoute><ManageUsers /></StudentProgressRoute>} />
          <Route path="/app/student/users/create" element={<StudentProgressRoute><CreateUserErrorWrapper /></StudentProgressRoute>} />
          <Route path="/app/student/users/:id" element={<StudentProgressRoute><EditUser /></StudentProgressRoute>} />
          <Route path="/app/student/classes" element={<StudentProgressRoute><ManageClasses /></StudentProgressRoute>} />
          <Route path="/app/student/students" element={<StudentProgressRoute><ManageUsers /></StudentProgressRoute>} />
          <Route path="/app/student/teachers" element={<StudentProgressRoute><ManageUsers /></StudentProgressRoute>} />
          <Route path="/app/student/grades/create" element={<StudentProgressRoute><CreateGradeSimple /></StudentProgressRoute>} />
          <Route path="/app/student/grades/manage" element={<StudentProgressRoute><ManageGrades /></StudentProgressRoute>} />
          <Route path="/app/student/student-stats" element={<StudentProgressRoute><StudentStats /></StudentProgressRoute>} />
          <Route path="/app/student/notifications/create" element={<StudentProgressRoute><CreateNotification /></StudentProgressRoute>} />
          <Route path="/app/student/notifications/manage" element={<StudentProgressRoute><NotificationsManager /></StudentProgressRoute>} />
          <Route path="/app/student/schools" element={<StudentProgressRoute><SchoolBranchManager /></StudentProgressRoute>} />
          <Route path="/app/student/attendance" element={<StudentProgressRoute><StudentAttendanceView /></StudentProgressRoute>} />

          {/* Teacher Routes */}
          <Route path="/app/teacher/grades/manage" element={<TeacherRoute><ManageGrades /></TeacherRoute>} />
          <Route path="/app/teacher/grades/create" element={<TeacherRoute><ErrorBoundary componentName="Create Grade"><CreateGradeSimple /></ErrorBoundary></TeacherRoute>} />
          <Route path="/app/teacher/notifications" element={<TeacherRoute><NotificationsManager /></TeacherRoute>} />
          <Route path="/app/teacher/notifications/create" element={<TeacherRoute><CreateNotification /></TeacherRoute>} />
          <Route path="/app/teacher/notifications/:id" element={<TeacherRoute><NotificationDetail /></TeacherRoute>} />
          <Route path="/app/teacher/student-stats" element={<TeacherRoute><StudentStats /></TeacherRoute>} />
          <Route path="/app/teacher/schedule" element={<TeacherRoute><Schedule /></TeacherRoute>} />
          <Route path="/app/teacher/attendance" element={<TeacherRoute><TeacherAttendance /></TeacherRoute>} />

          {/* Admin Routes */}
          <Route path="/app/admin/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
          <Route path="/app/admin/progress" element={<AdminRoute><StudentProgress /></AdminRoute>} />
          <Route path="/app/admin/progress/:studentId" element={<AdminRoute><StudentProgress /></AdminRoute>} />
          <Route path="/app/admin/student-stats" element={<AdminRoute><StudentStats /></AdminRoute>} />
          <Route path="/app/admin/notifications" element={<AdminRoute><NotificationsManager /></AdminRoute>} />
          <Route path="/app/admin/notifications/create" element={<AdminRoute><CreateNotification /></AdminRoute>} />
          <Route path="/app/admin/notifications/manage" element={<AdminRoute><NotificationsManager /></AdminRoute>} />
          <Route path="/app/admin/notifications/:id" element={<AdminRoute><NotificationDetail /></AdminRoute>} />
          <Route path="/app/admin/grades/create" element={<AdminRoute><CreateGradeSimple /></AdminRoute>} />
          <Route path="/app/admin/grades/manage" element={<AdminRoute><ManageGrades /></AdminRoute>} />
          <Route path="/app/admin/users/create" element={<AdminRoute><CreateUserErrorWrapper /></AdminRoute>} />
          <Route path="/app/admin/users/:id" element={<AdminRoute><EditUser /></AdminRoute>} />
          <Route path="/app/admin/schools" element={<AdminRoute><SchoolBranchManager /></AdminRoute>} />
          <Route path="/app/admin/directions" element={<AdminRoute><ManageDirections /></AdminRoute>} />
          <Route path="/app/admin/classes" element={<AdminRoute><ManageClasses /></AdminRoute>} />
          <Route path="/app/admin/subjects" element={<AdminRoute><ManageSubjects /></AdminRoute>} />
          <Route path="/app/admin/ratings" element={<AdminRoute><RatingManager /></AdminRoute>} />
          <Route path="/app/admin/rating-statistics" element={<AdminRoute><ErrorBoundary componentName="Rating Statistics"><RatingStatistics /></ErrorBoundary></AdminRoute>} />
          <Route path="/app/admin/schedule" element={<AdminRoute><Schedule /></AdminRoute>} />
          <Route path="/app/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
          <Route path="/app/admin/attendance" element={<AdminRoute><WeeklyAttendanceManagement /></AdminRoute>} />
          
          {/* Parent Routes */}
          <Route path="/app/parent" element={<ParentRoute><ParentDashboard /></ParentRoute>} />
          <Route path="/app/parent/dashboard" element={<ParentRoute><ParentDashboard /></ParentRoute>} />
          <Route path="/app/parent/grades" element={<ParentRoute><ParentGrades /></ParentRoute>} />
          <Route path="/app/parent/notifications" element={<ParentRoute><Notifications /></ParentRoute>} />
          <Route path="/app/parent/notifications/:id" element={<ParentRoute><NotificationDetail /></ParentRoute>} />
          <Route path="/app/parent/payments" element={<ParentRoute><ParentPayments /></ParentRoute>} />
          <Route path="/app/parent/contact" element={<ParentRoute><UserContactMessages /></ParentRoute>} />
        </Route>

        {/* SuperAdmin Routes */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/superadmin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
          <Route path="/superadmin/create-school-owner" element={<SuperAdminRoute><CreateSchoolOwner /></SuperAdminRoute>} />
          <Route path="/superadmin/school-owner/:id" element={<SuperAdminRoute><SchoolOwnerDetails /></SuperAdminRoute>} />
          <Route path="/superadmin/contact" element={<SuperAdminRoute><AdminContactMessages /></SuperAdminRoute>} />
          <Route path="/superadmin/patch-notes" element={<SuperAdminRoute><ContactMessages /></SuperAdminRoute>} />
          <Route path="/superadmin/notifications" element={<SuperAdminRoute><SuperAdminNotifications /></SuperAdminRoute>} />
          <Route path="/superadmin/notifications/:id" element={<SuperAdminRoute><NotificationDetail /></SuperAdminRoute>} />
          <Route path="/superadmin/school-features" element={<SuperAdminRoute><ManageSchoolFeatures /></SuperAdminRoute>} />
          <Route path="/superadmin/school-permissions" element={<SuperAdminRoute><SchoolPermissionsManager /></SuperAdminRoute>} />
          <Route path="/superadmin/system-logs" element={<SuperAdminRoute><SystemLogs /></SuperAdminRoute>} />
          <Route path="/superadmin/maintenance-announcements" element={<SuperAdminRoute><MaintenanceAnnouncements /></SuperAdminRoute>} />
          <Route path="/superadmin/users" element={<SuperAdminRoute><ManageUsers /></SuperAdminRoute>} />
          <Route path="/superadmin/users/create" element={<SuperAdminRoute><CreateUserErrorWrapper /></SuperAdminRoute>} />
          <Route path="/superadmin/users/:id" element={<SuperAdminRoute><EditUser /></SuperAdminRoute>} />
          <Route path="/superadmin/system-maintenance" element={<SuperAdminRoute><SystemMaintenance /></SuperAdminRoute>} />
        </Route>

        {/* Standalone Pages */}
        <Route path="/print-grades" element={<PrintGradePage />} />
        <Route path="/student-stats/print" element={<StudentStatsPrint />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    )
  ), [user]);

  return (
    <ErrorBoundary fallback={<DiagnosticPage />} componentName="Application Root">
      <ThemeProvider>
        <ShadcnThemeProvider>
          <ScrollFix />
          <FeatureToggleProvider>
            <HomeScreenPrompt />
            <RouterProvider router={router} />
          </FeatureToggleProvider>
          <Toaster />
        </ShadcnThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
