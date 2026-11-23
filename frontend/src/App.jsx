import React, { useEffect, useState, useMemo } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
  Navigate,
  ScrollRestoration,
  Outlet,
  useLocation,
} from "react-router-dom";
import { ThemeProvider as ShadcnThemeProvider } from "./components/theme-provider";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";
import "./globals.css";

// Initialize i18n
import "./i18n/i18n";

// CRITICAL FIX: Import error handling system
import { initGlobalErrorHandlers, trackError } from "./utils/errorHandler";

// Layout Components
import Layout from "./components/layout/Layout";
import GlobalErrorElement from "./components/GlobalErrorElement";
import ScrollFix from "./components/layout/ScrollFix";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import TeacherRoute from "./components/TeacherRoute";
import ParentRoute from "./components/ParentRoute";

// Public Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import { MaintenanceStatusChecker } from "./pages/MaintenancePage";
import NotFound from "./pages/NotFound";
import PasswordChange from "./components/PasswordChange";
import Maintenance from "./pages/Maintenance";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// Common Pages
import StandaloneDashboard from "./pages/StandaloneDashboard";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import NotificationDetail from "./pages/NotificationDetail";
import UserContactMessages from "./pages/UserContactMessages";
import ContactMessages from "./pages/ContactMessages";
const Schedule = React.lazy(() => import("./pages/common/Schedule"));
const StudentStats = React.lazy(() => import("./pages/common/StudentStats"));
const StudentStatsPrint = React.lazy(() => import("./pages/common/StudentStatsPrint"));
const PrintGradePage = React.lazy(() => import("./pages/print/PrintGradePage"));

// Teacher Pages
const TeacherDashboard = React.lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherAttendance = React.lazy(() => import("./pages/teacher/TeacherAttendance"));

// Student Pages
const StudentDashboard = React.lazy(() => import("./pages/student/StudentDashboard"));
const StudentGrades = React.lazy(() => import("./pages/student/StudentGrades"));
const GradeDetail = React.lazy(() => import("./pages/student/GradeDetail"));
const RatingSubmission = React.lazy(() => import("./pages/student/RatingSubmission"));

// Parent Pages
const ParentDashboard = React.lazy(() => import("./pages/ParentDashboard"));
const ParentGrades = React.lazy(() => import("./pages/parent/ParentGrades"));
const ParentPayments = React.lazy(() => import("./pages/parent/Payments"));

// Teacher Pages
const ManageGrades = React.lazy(() => import("./pages/teacher/ManageGrades"));
const CreateGradeSimple = React.lazy(() => import("./pages/teacher/CreateGradeSimple"));
const NotificationsManager = React.lazy(() => import("./pages/teacher/TeacherNotifications"));
const CreateNotification = React.lazy(() => import("./pages/teacher/CreateNotification"));

// Admin Pages
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers = React.lazy(() => import("./pages/admin/ManageUsers"));
const CreateUserErrorWrapper = React.lazy(() => import("./pages/admin/CreateUserErrorWrapper"));
const EditUser = React.lazy(() => import("./pages/admin/EditUser"));
const AdminContactMessages = React.lazy(() => import("./pages/admin/ContactMessages"));
const ManageClasses = React.lazy(() => import("./pages/admin/ManageClasses"));
const SchoolBranchManager = React.lazy(() => import("./pages/admin/SchoolBranchManager"));
const RatingManager = React.lazy(() => import("./pages/admin/RatingManager"));
const RatingStatistics = React.lazy(() => import("./pages/admin/RatingStatistics"));
const SystemMaintenance = React.lazy(() => import("./pages/superadmin/SystemMaintenance"));
const AdminPayments = React.lazy(() => import("./pages/admin/Payments"));
const WeeklyAttendanceManagement = React.lazy(() => import("./pages/admin/WeeklyAttendanceManagement"));
const StudentAttendanceView = React.lazy(() => import("./pages/student/StudentAttendanceView"));
const ScheduleWizard = React.lazy(() => import("./pages/admin/ScheduleWizard"));
import ErrorBoundary from "./components/common/ErrorBoundary";

// SuperAdmin Pages
const SuperAdminDashboard = React.lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const CreateSchoolOwner = React.lazy(() => import("./pages/superadmin/CreateSchoolOwner"));
const SchoolOwnerDetails = React.lazy(() => import("./pages/superadmin/SchoolOwnerDetails"));
const ManageSchoolFeatures = React.lazy(() => import("./pages/superadmin/ManageSchoolFeatures"));
const SuperAdminNotifications = React.lazy(() => import("./pages/superadmin/SuperAdminNotifications"));
const MaintenanceAnnouncements = React.lazy(() => import("./pages/superadmin/MaintenanceAnnouncements"));
const SchoolPermissionsManager = React.lazy(() => import("./components/superadmin/SchoolPermissionsManager"));
const SystemLogs = React.lazy(() => import("./pages/superadmin/SystemLogs"));

// Modern Push notification service
import PushNotificationManager from "./services/PushNotificationManager";
import setupAxios from "./app/setupAxios";
import logger from "./services/loggerService";
import { appConfig, initAppConfig } from "./config/appConfig";

// Feature toggles context provider
import { FeatureToggleProvider } from "./contexts/FeatureToggleContext";
import { BetaProvider } from "./contexts/BetaContext";
const BetaManager = React.lazy(() => import("./pages/superadmin/BetaManager"));

// Custom components
import HomeScreenPrompt from "./components/HomeScreenPrompt";
import ServerWarningBanner from "./components/common/ServerWarningBanner";

/**
 * RootWrapper component to include ScrollRestoration and MaintenanceStatusChecker
 * in the data router context.
 */
const RootWrapper = () => {
  const location = useLocation();
  const { applyPublicPageCSS, applyTheme, currentTheme, darkMode, authUser } =
    useTheme();

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const isPublic =
      path === "/" ||
      path === "/login" ||
      path === "/home" ||
      path === "/about" ||
      path === "/contact" ||
      path === "/maintenance" ||
      path === "/print-grades" ||
      path === "/student-stats/print";

    if (isPublic) {
      applyPublicPageCSS(darkMode);
    } else if (authUser?.token) {
      applyTheme(currentTheme, darkMode);
    }
  }, [
    location.pathname,
    darkMode,
    authUser,
    currentTheme,
    applyPublicPageCSS,
    applyTheme,
  ]);

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
    logger.info("APP", "Application state updated", {
      isAuthenticated: !!user,
      userRole: user?.role,
      authLoading: isLoading,
      darkMode,
      currentPath: window.location.pathname,
      userState: user
        ? {
            hasId: !!user._id,
            hasRole: !!user.role,
            hasToken: !!user.token,
            role: user.role,
            hasSchool: !!user.school,
            hasSchoolId: !!user.schoolId,
          }
        : "No user",
    });
  }, [user, isLoading, darkMode]);

  // Initialize app configuration and error handlers safely
  useEffect(() => {
    try {
      initGlobalErrorHandlers();
      const initResult = initAppConfig();
      setConfigInitialized(initResult);
    } catch (error) {
      console.error("[App] Error during initialization:", error);
      trackError(error, "App.initialization");
      setConfigInitialized(false);
    }

    try {
      const rl = sessionStorage.getItem("rateLimited");
      if (rl) {
        sessionStorage.removeItem("rateLimited");
        const { retrySeconds, ts } = JSON.parse(rl);
        if (Date.now() - ts < 60000) {
          // only if < 60s old
          const msg = retrySeconds
            ? `Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε ${Math.ceil(retrySeconds / 60)} λεπτά.`
            : "Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο.";
          toast.error(msg, { id: "rate-limited", duration: 8000 });
        }
      }
    } catch (e) {
      /* ignore parse errors */
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
          console.error("[App] Push notifications init error:", error);
        }
      };
      initializePushNotifications();
    }
  }, [user, configInitialized]);

  // Version checker to auto-update stale client bundles in production
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    let checkTimeout;

    const checkVersion = async () => {
      try {
        const response = await fetch("/version.json?t=" + new Date().getTime());
        if (response.ok) {
          const data = await response.json();
          // Check if build_id exists and is different from the compiled __BUILD_ID__
          if (
            data &&
            data.build_id &&
            typeof __BUILD_ID__ !== "undefined" &&
            data.build_id !== __BUILD_ID__
          ) {
            console.log(
              `[Version Management] New build detected: ${data.build_id} (current: ${__BUILD_ID__})`,
            );

            // Show alert toast with a reload action using sonner
            toast.warning("New version available!", {
              description: "Please reload the app to get the latest updates.",
              action: {
                label: "Reload",
                onClick: () => window.location.reload(true),
              },
              duration: Infinity, // Keep it visible until reloaded
            });

            // Stop polling once we know there's a new version
            return;
          }
        }
      } catch (err) {
        console.warn("[Version Management] Error checking version:", err);
      }

      // Schedule next check in 15 minutes
      checkTimeout = setTimeout(checkVersion, 15 * 60 * 1000);
    };

    // Trigger check when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    // Run first check after a short delay
    const initialDelay = setTimeout(checkVersion, 10000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(checkTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [configInitialized]);

  // Define the router with modern Data Router API
  const router = useMemo(
    () =>
      createBrowserRouter(
        createRoutesFromElements(
          <Route
            element={<RootWrapper />}
            errorElement={<GlobalErrorElement />}
          >
            {/* Public Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<PasswordChange />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Root redirect based on role */}
            <Route
              path="/"
              element={
                !user ? (
                  <Navigate to="/home" replace />
                ) : user.role === "superadmin" ? (
                  <Navigate to="/superadmin/dashboard" replace />
                ) : user.role === "admin" ? (
                  <Navigate to="/app/admin" replace />
                ) : user.role === "teacher" ? (
                  <Navigate to="/app/teacher" replace />
                ) : user.role === "student" ? (
                  <Navigate to="/app/student" replace />
                ) : user.role === "parent" ? (
                  <Navigate to="/app/parent" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Legacy dashboard redirects */}
            <Route
              path="/app/dashboard"
              element={
                !user?.role ? (
                  <Navigate to="/login" replace />
                ) : user.role === "admin" ? (
                  <Navigate to="/app/admin" replace />
                ) : user.role === "teacher" ? (
                  <Navigate to="/app/teacher" replace />
                ) : user.role === "student" ? (
                  <Navigate to="/app/student" replace />
                ) : user.role === "parent" ? (
                  <Navigate to="/app/parent" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Simple direct Dashboard route */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <StandaloneDashboard />
                </PrivateRoute>
              }
            />

            {/* Protected Routes with Layout */}
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/app/admin" element={<AdminDashboard />} />
              <Route path="/app/teacher" element={<TeacherDashboard />} />
              <Route path="/app/student" element={<StudentDashboard />} />
              <Route path="/app/parent" element={<ParentDashboard />} />
              <Route path="/app/profile" element={<Profile />} />
              <Route path="/app/notifications" element={<Notifications />} />
              <Route
                path="/app/notifications/:id"
                element={<NotificationDetail />}
              />
              <Route path="/app/admin/contact" element={<ContactMessages />} />
              <Route
                path="/app/teacher/contact"
                element={<ContactMessages />}
              />
              <Route
                path="/app/student/contact"
                element={<ContactMessages />}
              />
              <Route path="/app/parent/contact" element={<ContactMessages />} />
              <Route
                path="/app/contact-messages"
                element={<ContactMessages />}
              />
              <Route path="/app/schedule" element={<Schedule />} />
              <Route path="/app/grades" element={<StudentGrades />} />
              <Route path="/app/grades/:id" element={<GradeDetail />} />
              <Route path="/app/ratings" element={<RatingSubmission />} />

              {/* Explicit Student Routes */}
              <Route path="/app/student/grades" element={<StudentGrades />} />
              <Route path="/app/student/grades/:id" element={<GradeDetail />} />
              <Route
                path="/app/student/notifications"
                element={<Notifications />}
              />
              <Route
                path="/app/student/notifications/:id"
                element={<NotificationDetail />}
              />
              <Route path="/app/student/schedule" element={<Schedule />} />
              <Route
                path="/app/student/ratings"
                element={<RatingSubmission />}
              />
              <Route
                path="/app/student/attendance"
                element={<StudentAttendanceView />}
              />

              {/* Teacher Routes */}
              <Route
                path="/app/teacher/grades/manage"
                element={
                  <TeacherRoute>
                    <ManageGrades />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/grades/create"
                element={
                  <TeacherRoute>
                    <ErrorBoundary componentName="Create Grade">
                      <CreateGradeSimple />
                    </ErrorBoundary>
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/notifications"
                element={
                  <TeacherRoute>
                    <NotificationsManager />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/notifications/create"
                element={
                  <TeacherRoute>
                    <CreateNotification />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/notifications/:id"
                element={
                  <TeacherRoute>
                    <NotificationDetail />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/student-stats"
                element={
                  <TeacherRoute>
                    <StudentStats />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/schedule"
                element={
                  <TeacherRoute>
                    <Schedule />
                  </TeacherRoute>
                }
              />
              <Route
                path="/app/teacher/attendance"
                element={
                  <TeacherRoute>
                    <TeacherAttendance />
                  </TeacherRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/app/admin/users"
                element={
                  <AdminRoute>
                    <ManageUsers />
                  </AdminRoute>
                }
              />

              <Route
                path="/app/admin/student-stats"
                element={
                  <AdminRoute>
                    <StudentStats />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/notifications"
                element={
                  <AdminRoute>
                    <NotificationsManager />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/notifications/create"
                element={
                  <AdminRoute>
                    <CreateNotification />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/notifications/manage"
                element={
                  <AdminRoute>
                    <NotificationsManager />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/notifications/:id"
                element={
                  <AdminRoute>
                    <NotificationDetail />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/grades/create"
                element={
                  <AdminRoute>
                    <CreateGradeSimple />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/grades/manage"
                element={
                  <AdminRoute>
                    <ManageGrades />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/users/create"
                element={
                  <AdminRoute>
                    <CreateUserErrorWrapper />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/users/:id"
                element={
                  <AdminRoute>
                    <EditUser />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/schools"
                element={
                  <AdminRoute>
                    <SchoolBranchManager />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/classes"
                element={
                  <AdminRoute>
                    <ManageClasses />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/ratings"
                element={
                  <AdminRoute>
                    <RatingManager />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/rating-statistics"
                element={
                  <AdminRoute>
                    <ErrorBoundary componentName="Rating Statistics">
                      <RatingStatistics />
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/schedule"
                element={
                  <AdminRoute>
                    <Schedule />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/payments"
                element={
                  <AdminRoute>
                    <AdminPayments />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/attendance"
                element={
                  <AdminRoute>
                    <WeeklyAttendanceManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="/app/admin/schedule-wizard"
                element={
                  <AdminRoute>
                    <ScheduleWizard />
                  </AdminRoute>
                }
              />

              {/* Parent Routes */}
              <Route
                path="/app/parent"
                element={
                  <ParentRoute>
                    <ParentDashboard />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/dashboard"
                element={
                  <ParentRoute>
                    <ParentDashboard />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/grades"
                element={
                  <ParentRoute>
                    <ParentGrades />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/notifications"
                element={
                  <ParentRoute>
                    <Notifications />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/notifications/:id"
                element={
                  <ParentRoute>
                    <NotificationDetail />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/payments"
                element={
                  <ParentRoute>
                    <ParentPayments />
                  </ParentRoute>
                }
              />
              <Route
                path="/app/parent/contact"
                element={
                  <ParentRoute>
                    <UserContactMessages />
                  </ParentRoute>
                }
              />
            </Route>

            {/* SuperAdmin Routes */}
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route
                path="/superadmin/dashboard"
                element={
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/create-school-owner"
                element={
                  <SuperAdminRoute>
                    <CreateSchoolOwner />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/school-owner/:id"
                element={
                  <SuperAdminRoute>
                    <SchoolOwnerDetails />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/contact"
                element={
                  <SuperAdminRoute>
                    <AdminContactMessages />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/patch-notes"
                element={
                  <SuperAdminRoute>
                    <ContactMessages />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/notifications"
                element={
                  <SuperAdminRoute>
                    <SuperAdminNotifications />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/notifications/:id"
                element={
                  <SuperAdminRoute>
                    <NotificationDetail />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/school-features"
                element={
                  <SuperAdminRoute>
                    <ManageSchoolFeatures />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/school-permissions"
                element={
                  <SuperAdminRoute>
                    <SchoolPermissionsManager />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/system-logs"
                element={
                  <SuperAdminRoute>
                    <SystemLogs />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/maintenance-announcements"
                element={
                  <SuperAdminRoute>
                    <MaintenanceAnnouncements />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/users"
                element={
                  <SuperAdminRoute>
                    <ManageUsers />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/users/create"
                element={
                  <SuperAdminRoute>
                    <CreateUserErrorWrapper />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/users/:id"
                element={
                  <SuperAdminRoute>
                    <EditUser />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/system-maintenance"
                element={
                  <SuperAdminRoute>
                    <SystemMaintenance />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/superadmin/beta-manager"
                element={
                  <SuperAdminRoute>
                    <BetaManager />
                  </SuperAdminRoute>
                }
              />
            </Route>

            {/* Standalone Pages */}
            <Route path="/print-grades" element={<PrintGradePage />} />
            <Route
              path="/student-stats/print"
              element={<StudentStatsPrint />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>,
        ),
      ),
    [user],
  );

  return (
    <ErrorBoundary componentName="Application Root">
      <ThemeProvider>
        <ShadcnThemeProvider>
          <ScrollFix />
          <FeatureToggleProvider>
            <BetaProvider>
              <HomeScreenPrompt />
              <React.Suspense fallback={<span role="status">Loading…</span>}>
                <RouterProvider router={router} />
              </React.Suspense>
            </BetaProvider>
          </FeatureToggleProvider>
          <Toaster />
          <ServerWarningBanner />
        </ShadcnThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
