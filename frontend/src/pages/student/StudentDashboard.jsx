import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  Bell,
  BarChart3,
  Calendar,
  Target,
  Award,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  AlertTriangle,
  UserCheck,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Spinner } from '../../components/ui/spinner';
import { useFeatureToggles } from '../../contexts/FeatureToggleContext';
import MaintenanceNotifications from '../../components/MaintenanceNotifications';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../app/axios';
import { API_URL } from '../../config/appConfig';
import { GradesGraph } from "../../components/GradesGraph";
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { Skeleton } from '../../components/ui/skeleton';
import { setDashboardDataCache } from '../../features/ui/uiSlice';
import { fetchSchedule } from '../../features/schedule/scheduleSlice';
import { getStudentGrades } from '../../features/grades/gradeSlice';

const StudentDashboardSkeleton = () => (
  <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col h-32">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted/40 rounded-md" />
              <div className="h-4 w-4 bg-muted/30 rounded-sm" />
            </CardHeader>
            <CardContent className="flex flex-col justify-center flex-1 pt-0">
              <div className="h-8 w-16 mb-2 bg-muted/50 rounded-md" />
              <div className="h-3 w-32 bg-muted/30 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="h-80">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="h-64 relative overflow-hidden flex flex-col pt-0">
          <div className="w-full h-full border-b border-l border-muted/50 relative p-4 mb-4">
            {/* Grid lines skeleton (subtle) */}
            {[1, 2, 3].map(i => <div key={i} className="absolute left-0 right-0 border-t border-muted/20" style={{ bottom: `${i * 25}%` }} />)}

            {/* Line graph skeleton preview */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M 0,80 L 20,60 L 40,75 L 60,40 L 80,55 L 100,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/15"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
      
      <Card className="h-80">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded-md" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 w-full rounded-lg bg-muted/40" />
          ))}
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1 h-96">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full rounded-lg bg-muted/30" />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 h-96">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded-md" />
          <div className="h-9 w-24 bg-muted rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted/30" />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

const StudentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featuresLoading } = useFeatureToggles();
  
  // Get data from Redux store for instant loading
  const { grades: reduxGrades } = useSelector((state) => state.grades || {});
  const { notifications: reduxNotifications } = useSelector((state) => state.notifications || {});
  const { dashboard: uiCache } = useSelector((state) => state.ui || { dashboard: {} });
  const scheduleRedux = useSelector((state) => state.schedule);

  // Raw schedule object { Monday: [...], ... } from the shared Redux cache (no-filter slot)
  const scheduleForDashboard = React.useMemo(
    () => scheduleRedux.cache?.['']?.data?.schedule || {},
    [scheduleRedux.cache]
  );
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    grades: [],
    classes: uiCache?.studentScheduleToday || [],
    stats: uiCache?.studentStats || {
      totalSubjects: 0,
      averageGrade: 0,
      gradesReceived: 0,
      pendingGrades: 0,
      classesToday: 0
    }
  });

  // Calculate stats from redux data for instant display
  const reduxStats = React.useMemo(() => {
    if (uiCache?.studentStats) return uiCache.studentStats;
    if (!reduxGrades || reduxGrades.length === 0) return null;
    
    const gradeValues = reduxGrades.map(g => g.value);
    const averageGrade = gradeValues.reduce((sum, val) => sum + val, 0) / gradeValues.length;
    const subjects = [...new Set(reduxGrades.map(g => g.subject?.name).filter(Boolean))];
    
    return {
      totalSubjects: subjects.length,
      averageGrade: Math.round(averageGrade * 100) / 100,
      gradesReceived: reduxGrades.length,
      classesToday: 0 // Will be updated by fresh fetch
    };
  }, [reduxGrades]);
  
  const [panelLoading, setPanelLoading] = useState({
    notifications: false,
    grades: false,
    classes: false
  });

  // Check authentication and role
  useEffect(() => {
    if (!user) {
      console.log('StudentDashboard: No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'student') {
      console.log('StudentDashboard: User is not student, redirecting');
      toast.error(t('student.accessDenied'));
      navigate('/app/dashboard');
      return;
    }
    
    console.log('StudentDashboard: Student user authenticated:', user.email);
  }, [user, navigate]);

  // Listen for refresh header counts events
  useEffect(() => {
    const handleRefresh = (e) => {
      console.log('StudentDashboard: Refresh event received:', e?.detail);
      fetchDashboardData();
    };

    window.addEventListener('refreshHeaderCounts', handleRefresh);
    return () => window.removeEventListener('refreshHeaderCounts', handleRefresh);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (user && user.role === 'student' && !featuresLoading) {
      // If we already have cached stats + a populated schedule slice, show data immediately
      if (reduxStats && scheduleRedux.cache?.['']?.data) {
        setLoading(false);
      }
      fetchDashboardData();
    }
  }, [user, featuresLoading, !!reduxStats, !!scheduleRedux.cache?.['']?.data]);

  const getAuthConfig = () => {
    return {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('StudentDashboard: Fetching dashboard data...');
      
      const promises = [];
      const dataKeys = [];
      
      // Only fetch data for enabled features
      if (isFeatureEnabled('enableNotifications')) {
        setPanelLoading(prev => ({ ...prev, notifications: true }));
        promises.push(fetchNotifications());
        dataKeys.push('notifications');
      }
      
      if (isFeatureEnabled('enableGrades')) {
        setPanelLoading(prev => ({ ...prev, grades: true }));
        promises.push(fetchAllGrades());
        dataKeys.push('grades');
      }
      
      // Execute all enabled data fetches
      const results = await Promise.allSettled(promises);
      
      // Process notifications + grades results
      const newData = { ...dashboardData };
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled' && result.value !== null && result.value !== undefined) {
          newData[key] = result.value;
        }
      });

      // Fetch schedule via shared Redux slice (uses TTL cache — no duplicate request)
      if (isFeatureEnabled('enableClasses') || isFeatureEnabled('enableSchedule')) {
        setPanelLoading(prev => ({ ...prev, classes: true }));
        try {
          const schedResult = await dispatch(fetchSchedule()).unwrap();
          // schedResult.data = { schedule: { Monday:[...], ... }, totalClasses: N }
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const rawSchedule = schedResult?.data?.schedule || {};
          const todayClasses = (rawSchedule[today] || rawSchedule[today.toLowerCase()] || []).slice(0, 10);
          newData.classes = todayClasses;
        } catch {
          // Keep whatever is already in local state
        }
      }

      // Compute stats from fresh data
      if (newData.grades && Array.isArray(newData.grades)) {
        if (newData.grades.length > 0) {
          const gradeValues = newData.grades.map(g => g.value);
          const averageGrade = gradeValues.reduce((sum, val) => sum + val, 0) / gradeValues.length;
          const subjects = [...new Set(newData.grades.map(g => g.subject?.name).filter(Boolean))];
          newData.stats = {
            totalSubjects: subjects.length,
            averageGrade: Math.round(averageGrade * 100) / 100,
            gradesReceived: newData.grades.length,
            classesToday: newData.classes?.length || 0
          };
        } else {
          newData.stats = { ...newData.stats, classesToday: newData.classes?.length || 0 };
        }
      }

      // Persist stats + today's class count to UI cache
      dispatch(setDashboardDataCache({
        studentStats: newData.stats,
        studentScheduleToday: newData.classes || []
      }));
      
      setDashboardData(newData);
      console.log('StudentDashboard: Dashboard data loaded successfully');
      
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return;
      }
      console.error('StudentDashboard: Error fetching dashboard data:', error);
      setError(t('student.failedToLoad'));
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, grades: false, classes: false });
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/api/notifications?limit=10`, getAuthConfig());
      return response.data || [];
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return null;
      }
      console.error('StudentDashboard: Error fetching notifications:', error);
      return null;
    }
  };

  const fetchAllGrades = async () => {
    try {
      // Dispatch into Redux so the StudentGrades page can read from cache instantly
      const result = await dispatch(getStudentGrades(user._id)).unwrap();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) return null;
      return null;
    }
  };

  // fetchUpcomingClasses removed (was unused)
  // fetchScheduleData removed — schedule is now fetched via the shared scheduleSlice
  // which deduplicates requests and provides instant loading on the Schedule page.

  // Navigation handlers
  const handleViewGrades = () => navigate('/app/grades');
  const handleSubmitRatings = () => navigate('/app/ratings');
  const handleViewSchedule = () => navigate('/app/schedule');
  const handleViewCalendar = () => navigate('/app/calendar');
  const handleViewAllNotifications = () => navigate('/app/notifications');

  // Loading logic is handled inline below to keep the header static

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not student
  if (!user || user.role !== 'student') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>{t('student.accessDenied')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-wide">{t('student.welcomeBack')}, {user?.name}!</h1>
        <p className="text-muted-foreground">{t('student.trackProgress')}</p>
      </div>

      {/* Maintenance Notifications */}
      <MaintenanceNotifications />

      {featuresLoading || (loading && !reduxStats) ? (
        <StudentDashboardSkeleton />
      ) : (
        <>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.totalSubjects')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.totalSubjects || reduxStats?.totalSubjects || 0}</div>
            <p className="text-xs text-muted-foreground">{t('student.enrolledSubjects')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.averageGrade')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">
              {dashboardData.stats.averageGrade ? dashboardData.stats.averageGrade.toFixed(1) : 
               reduxStats?.averageGrade ? reduxStats.averageGrade.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">{t('student.currentAverage')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.gradesReceived')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.gradesReceived || reduxStats?.gradesReceived || 0}</div>
            <p className="text-xs text-muted-foreground">{t('student.thisSemester')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.classesToday', 'Classes Today')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.classesToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const todayClasses = scheduleForDashboard[today] || scheduleForDashboard[today.toLowerCase()] || [];
                if (todayClasses.length === 0) return t('student.noClassesToday', 'None scheduled');
                return t('teacher.nextAt', { time: todayClasses[0].startTime, defaultValue: `Next: ${todayClasses[0].startTime}` });
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <GradesGraph recentGrades={dashboardData.grades.length > 0 ? dashboardData.grades : (reduxGrades || [])} />
        </Card>
        {/* Quick Actions */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>{t('student.quickActions')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate('/app/student/grades')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
              >
                <BookOpen className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                <span className="group-hover:text-primary">{t('student.viewMyGrades')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/student/schedule')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
              >
                <Calendar className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                <span className="group-hover:text-primary">{t('student.mySchedule')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/student/notifications')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
              >
                <Bell className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                <span className="group-hover:text-primary">{t('navigation.notifications')}</span>
              </Button>
              <Button
                onClick={() => navigate('/app/student/attendance')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
              >
                <UserCheck className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
                <span className="group-hover:text-primary">{t('navigation.myAttendance')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Recent Notifications and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Calendar Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{t('student.monthlyCalendar')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MonthlyCalendar scheduleData={scheduleForDashboard} />
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>{t('student.recentNotifications')}</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/app/notifications')}
              className="transition-[transform,box-shadow] hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {t('navigation.viewAll')}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {panelLoading.notifications ? (
              <div className="flex justify-center py-8">
                <Spinner className="text-primary" />
              </div>
            ) : dashboardData.notifications.length > 0 ? (
              <div className="space-y-4">
                {(dashboardData.notifications.length > 0 ? dashboardData.notifications : (reduxNotifications || [])).slice(0, 5).map((notification, index) => (
                  <div
                    key={notification._id}
                    className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group transition-[transform,box-shadow]"
                    style={{
                      borderColor: notification.type === 'info' ? 'hsl(var(--info))' :
                                  notification.type === 'success' ? 'hsl(var(--success))' :
                                  notification.type === 'warning' ? 'hsl(var(--warning))' :
                                  notification.type === 'error' ? 'hsl(var(--error))' : 'hsl(var(--border))',
                      animationDelay: `${(index + 1) * 0.1}s`
                    }}
                    onClick={() => navigate(`/app/notifications/${notification._id}`)}
                  >
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {notification.type === 'info' && <Info className="h-5 w-5" style={{color: 'hsl(var(--info))'}} />}
                      {notification.type === 'success' && <CheckCircle className="h-5 w-5" style={{color: 'hsl(var(--success))'}} />}
                      {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" style={{color: 'hsl(var(--warning))'}} />}
                      {notification.type === 'error' && <XCircle className="h-5 w-5" style={{color: 'hsl(var(--error))'}} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">{notification.message}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                    >
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (reduxNotifications && reduxNotifications.length > 0) ? (
              <div className="space-y-4">
                {reduxNotifications.slice(0, 5).map((notification, index) => (
                  <div
                    key={notification._id}
                    className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group transition-[transform,box-shadow]"
                    onClick={() => navigate(`/app/notifications/${notification._id}`)}
                  >
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {notification.type === 'info' && <Info className="h-5 w-5" style={{color: 'hsl(var(--info))'}} />}
                      {notification.type === 'success' && <CheckCircle className="h-5 w-5" style={{color: 'hsl(var(--success))'}} />}
                      {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" style={{color: 'hsl(var(--warning))'}} />}
                      {notification.type === 'error' && <XCircle className="h-5 w-5" style={{color: 'hsl(var(--error))'}} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">{notification.message}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('student.noNotifications')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Disabled Message */}
      {!isFeatureEnabled('enableNotifications') && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              <span className="text-sm">
                {t('student.featuresDisabledMessage')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

export default StudentDashboard;

