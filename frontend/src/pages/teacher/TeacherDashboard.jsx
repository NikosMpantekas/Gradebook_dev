import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  Bell,
  BarChart3,
  Calendar,
  Users,
  Clock,
  Zap,
  Edit,
  XCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Skeleton } from '../../components/ui/skeleton';
import { useFeatureToggles } from '../../contexts/FeatureToggleContext';
import MaintenanceNotifications from '../../components/MaintenanceNotifications';
import { setDashboardDataCache } from '../../features/ui/uiSlice';
import axiosInstance from '../../app/axios';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';

// Static skeleton - no animations, matches StudentDashboard pattern exactly
const TeacherDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="lg:row-span-2 h-fit overflow-hidden">
        <CardHeader>
          <div className="h-6 w-32 bg-muted/40 rounded-md" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[450px] w-full bg-muted/20" />
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <div className="h-6 w-32 bg-muted/40 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 w-full rounded-lg bg-muted/30" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col h-[350px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="h-6 w-40 bg-muted/40 rounded-md" />
          <div className="h-8 w-20 bg-muted/30 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted/20" />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featuresLoading } = useFeatureToggles();
  const { t } = useTranslation();

  // Redux store data for instant display (cache)
  const { students: reduxStudents } = useSelector((state) => state.students || { students: [] });
  const { classes: reduxClasses } = useSelector((state) => state.classes || { classes: [] });
  const { notifications: reduxNotifications } = useSelector((state) => state.notifications || { notifications: [] });
  const { dashboard: uiCache } = useSelector((state) => state.ui || { dashboard: {} });

  // Calculate redux-based stats for instant display (mirrors StudentDashboard pattern)
  const reduxStats = useMemo(() => {
    // Check global UI cache first
    if (uiCache?.teacherStats) {
      return uiCache.teacherStats;
    }
    const hasStudents = reduxStudents && reduxStudents.length > 0;
    const hasClasses = reduxClasses && reduxClasses.length > 0;
    if (!hasStudents && !hasClasses) return null;
    return {
      totalStudents: reduxStudents?.length || 0,
      totalClasses: reduxClasses?.length || 0,
    };
  }, [reduxStudents, reduxClasses, uiCache]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    scheduleData: uiCache?.teacherSchedule || {},
    stats: reduxStats || {
      totalStudents: 0,
      totalClasses: 0,
    }
  });

  const [panelLoading, setPanelLoading] = useState({
    notifications: false,
    classes: false
  });

  // Auth check
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'teacher') {
      toast.error(t('teacher.accessDenied'));
      navigate('/app/dashboard');
    }
  }, [user, navigate, t]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener('refreshHeaderCounts', handleRefresh);
    return () => window.removeEventListener('refreshHeaderCounts', handleRefresh);
  }, []);

  // Fetch on mount - if we have redux data, skip the blocking skeleton
  useEffect(() => {
    if (user && user.role === 'teacher' && !featuresLoading) {
      if (reduxStats) {
        setLoading(false); // We have cached data, show it immediately
      }
      fetchDashboardData();
    }
  }, [user, featuresLoading, !!reduxStats]);

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    }
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = [];
      const dataKeys = [];

      // Always fetch stats
      promises.push(fetchStats());
      dataKeys.push('stats');

      if (isFeatureEnabled('enableNotifications')) {
        setPanelLoading(prev => ({ ...prev, notifications: true }));
        promises.push(fetchNotifications());
        dataKeys.push('notifications');
      }

      setPanelLoading(prev => ({ ...prev, classes: true }));
      promises.push(fetchScheduleData());
      dataKeys.push('scheduleData');

      const results = await Promise.allSettled(promises);

      const newData = { ...dashboardData };
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          if (result.value !== null) {
            newData[key] = result.value;
          }
        } else {
          console.error(`TeacherDashboard: Error fetching ${key}:`, result.reason);
          // Keep existing cached data instead of resetting to 0s/empty
        }
      });

      setDashboardData(newData);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message?.includes('Duplicate request')) return;
      console.error('TeacherDashboard: Error fetching data:', err);
      setError(t('teacher.failedToLoad', 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, classes: false });
    }
  };

  const fetchStats = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        axiosInstance.get(`${API_URL}/api/students/teacher/classes`, getAuthConfig()),
        axiosInstance.get(`${API_URL}/api/classes/my-teaching-classes`, getAuthConfig()),
      ]);
      const stats = {
        totalStudents: studentsRes.data?.length || 0,
        totalClasses: classesRes.data?.length || 0,
      };
      
      // Save to global cache so re-navigation is instant
      dispatch(setDashboardDataCache({ teacherStats: stats }));
      
      return stats;
    } catch (err) {
      if (err.name === 'CanceledError' || err.message?.includes('Duplicate request')) {
        return null;
      }
      console.error('TeacherDashboard: Error fetching stats:', err);
      return null;
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/api/notifications?limit=10`, getAuthConfig());
      return response.data || [];
    } catch (err) {
      if (err.name === 'CanceledError' || err.message?.includes('Duplicate request')) return null;
      return null;
    }
  };

  const fetchScheduleData = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/api/schedule`, getAuthConfig());
      const schedule = response.data?.schedule || response.data || {};
      
      // Save to global cache so re-navigation is instant
      dispatch(setDashboardDataCache({ teacherSchedule: schedule }));
      
      return schedule;
    } catch (err) {
      if (err.name === 'CanceledError' || err.message?.includes('Duplicate request')) return null;
      return null;
    }
  };

  // Error state
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

  // Resolve display stats - prefer fresh API data, fall back to redux cache
  const displayStats = {
    totalStudents: dashboardData.stats.totalStudents || reduxStats?.totalStudents || 0,
    totalClasses: dashboardData.stats.totalClasses || reduxStats?.totalClasses || 0,
  };

  const displayNotifications = dashboardData.notifications.length > 0
    ? dashboardData.notifications
    : (reduxNotifications || []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section - Always rendered immediately from session */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-wide">{t('teacher.welcomeBack', 'Welcome back')}, {user?.name}!</h1>
        <p className="text-muted-foreground">{t('teacher.subtitle')}</p>
      </div>

      <MaintenanceNotifications />

      {/* Show skeleton or data based on whether we have anything to display */}
      {featuresLoading || (loading && !reduxStats) ? (
        <TeacherDashboardSkeleton />
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('teacher.totalStudents')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col justify-center flex-1 pt-0">
                <div className="text-2xl font-bold mb-1">{displayStats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">{t('teacher.enrolledStudents')}</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('teacher.activeClasses')}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col justify-center flex-1 pt-0">
                <div className="text-2xl font-bold mb-1">{displayStats.totalClasses}</div>
                <p className="text-xs text-muted-foreground">{t('teacher.currentClasses')}</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('teacher.classesToday', 'Classes Today')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col justify-center flex-1 pt-0">
                <div className="text-2xl font-bold mb-1">
                  {(() => {
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const todayClasses = dashboardData.scheduleData[today] || dashboardData.scheduleData[today.toLowerCase()] || [];
                    return todayClasses.length;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const todayClasses = dashboardData.scheduleData[today] || dashboardData.scheduleData[today.toLowerCase()] || [];
                    if (todayClasses.length === 0) return t('teacher.noClassesScheduled', 'None scheduled');
                    return t('teacher.nextAt', { time: todayClasses[0].startTime, defaultValue: `Next: ${todayClasses[0].startTime}` });
                  })()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid: Calendar, Quick Actions, Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Calendar - spans 2 rows on desktop */}
            <div className="order-2 lg:order-1 lg:row-span-2">
              <Card className="h-fit overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{t('student.monthlyCalendar')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MonthlyCalendar scheduleData={dashboardData.scheduleData} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="order-1 lg:order-2">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>{t('teacher.quickActions')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => navigate('/app/teacher/grades/manage')}
                      variant="ghost"
                      className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <Edit className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                      <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.manageGrades')}</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/app/teacher/notifications/create')}
                      variant="ghost"
                      className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <Bell className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                      <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.sendNotifications')}</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/app/teacher/schedule')}
                      variant="ghost"
                      className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <Calendar className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                      <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.schedule')}</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/app/teacher/student-stats')}
                      variant="ghost"
                      className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <BarChart3 className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                      <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.studentStats')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications */}
            <div className="order-3 lg:order-3">
              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <span>{t('teacher.recentNotifications')}</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/app/teacher/notifications')}
                    className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    {t('teacher.viewAll')}
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {panelLoading.notifications ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="text-primary" />
                    </div>
                  ) : displayNotifications.length > 0 ? (
                    <div className="space-y-4">
                      {displayNotifications.slice(0, 5).map((notification, index) => (
                        <div
                          key={notification._id}
                          className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group"
                          style={{
                            borderColor: notification.type === 'info' ? 'hsl(var(--info))' :
                              notification.type === 'success' ? 'hsl(var(--success))' :
                              notification.type === 'warning' ? 'hsl(var(--warning))' :
                              notification.type === 'error' ? 'hsl(var(--error))' : 'hsl(var(--border))',
                          }}
                          onClick={() => navigate(`/app/teacher/notifications/${notification._id}`)}
                        >
                          <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                            {notification.type === 'info' && <Info className="h-5 w-5" style={{ color: 'hsl(var(--info))' }} />}
                            {notification.type === 'success' && <CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />}
                            {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--warning))' }} />}
                            {notification.type === 'error' && <XCircle className="h-5 w-5" style={{ color: 'hsl(var(--error))' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate transition-colors duration-300 group-hover:text-primary">{notification.title}</p>
                            <p className="text-xs text-muted-foreground truncate transition-colors duration-300 group-hover:text-foreground">{notification.message}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                          >
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('teacher.noRecentNotifications')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature Disabled Banner */}
          {!isFeatureEnabled('enableNotifications') && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                  <Info className="h-5 w-5" />
                  <span className="text-sm">{t('navigation.featuresDisabledMessage')}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
