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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    grades: [],
    classes: [],
    scheduleData: {},
    stats: {
      totalSubjects: 0,
      averageGrade: 0,
      gradesReceived: 0,
      pendingGrades: 0,
      classesToday: 0
    }
  });

  // Calculate stats from redux data for instant display
  const reduxStats = React.useMemo(() => {
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
      // If we already have redux data, we can skip the "major" loading state
      // but still fetch fresh data in the background
      if (reduxStats) {
        setLoading(false);
      }
      fetchDashboardData();
    }
  }, [user, featuresLoading, !!reduxStats]);

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
      
      if (isFeatureEnabled('enableClasses') || isFeatureEnabled('enableSchedule')) {
        setPanelLoading(prev => ({ ...prev, classes: true }));
        // Fetch the complete schedule data for both calendar and upcoming list
        promises.push(fetchScheduleData());
        dataKeys.push('scheduleData');
      }
      
      // Execute all enabled data fetches
      const results = await Promise.allSettled(promises);
      
      // Process results
      const newData = { ...dashboardData };
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          newData[key] = result.value;
          
          // If we just got the schedule data, also extract today's classes for the 'classes' state
          if (key === 'scheduleData') {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            newData.classes = result.value[today] || result.value[today.toLowerCase()] || [];
          }
        } else {
          console.error(`StudentDashboard: Error fetching ${key}:`, result.reason);
          // Default to empty array for notifications/grades, but empty object for scheduleData
          newData[key] = key === 'scheduleData' ? {} : [];
        }
      });
      
      // Calculate stats from grades data
      if (newData.grades && newData.grades.length > 0) {
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
        newData.stats.classesToday = newData.classes?.length || 0;
      }
      
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
        return [];
      }
      console.error('StudentDashboard: Error fetching notifications:', error);
      return [];
    }
  };

  const fetchAllGrades = async () => {
    try {
      // For student, get all their grades using the student-specific endpoint
      const response = await axiosInstance.get(`${API_URL}/api/grades/student`, getAuthConfig());
      
      console.log('StudentDashboard: Grades response:', response.data);
      
      const grades = response.data?.grades || response.data || [];
      // Return all grades for the graph (no limit needed)
      const allGrades = Array.isArray(grades) ? grades : [];
      
      console.log('StudentDashboard: All grades for graph:', allGrades.length);
      return allGrades;
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return [];
      }
      console.error('StudentDashboard: Error fetching grades:', error);
      return [];
    }
  };

  const fetchUpcomingClasses = async () => {
    try {
      // For student, get their schedule
      const response = await axiosInstance.get(`${API_URL}/api/schedule`, getAuthConfig());
      
      console.log('StudentDashboard: Schedule response:', response.data);
      
      // Process schedule data to get upcoming classes
      if (response.data) {
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        console.log('StudentDashboard: Today is:', dayOfWeek);
        
        // Handle different response formats - backend returns direct schedule object
        let scheduleData = response.data;
        
        // If response has a schedule property, use it
        if (scheduleData && scheduleData.schedule) {
          scheduleData = scheduleData.schedule;
        }
        
        console.log('StudentDashboard: Schedule data structure:', Object.keys(scheduleData));
        console.log('StudentDashboard: Full schedule data:', scheduleData);
        
        // Get today's classes - handle both lowercase and capitalized day names
        let todayClasses = scheduleData[dayOfWeek] || scheduleData[dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)] || [];
        
        console.log('StudentDashboard: Today classes found:', todayClasses.length);
        console.log('StudentDashboard: Today classes data:', todayClasses);
        
        // Return the classes for today
        const upcomingClasses = Array.isArray(todayClasses) ? todayClasses.slice(0, 10) : [];
        console.log('StudentDashboard: Returning upcoming classes:', upcomingClasses);
        
        return upcomingClasses;
      }
      
      return [];
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return [];
      }
      console.error('StudentDashboard: Error fetching upcoming classes:', error);
      return [];
    }
  };

  const fetchScheduleData = async () => {
    try {
      // Fetch complete schedule data for the calendar
      const response = await axiosInstance.get(`${API_URL}/api/schedule`, getAuthConfig());
      
      console.log('StudentDashboard: Full schedule response for calendar:', response.data);
      
      if (response.data && response.data.schedule) {
        console.log('StudentDashboard: Returning complete schedule data:', response.data.schedule);
        return response.data.schedule;
      }
      
      // Handle direct schedule format
      if (response.data && typeof response.data === 'object') {
        console.log('StudentDashboard: Using direct schedule format:', response.data);
        return response.data;
      }
      
      return {};
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return {};
      }
      console.error('StudentDashboard: Error fetching schedule data:', error);
      return {};
    }
  };

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
        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.totalSubjects')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.totalSubjects || reduxStats?.totalSubjects || 0}</div>
            <p className="text-xs text-muted-foreground">{t('student.enrolledSubjects')}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
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

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.gradesReceived')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.gradesReceived || reduxStats?.gradesReceived || 0}</div>
            <p className="text-xs text-muted-foreground">{t('student.thisSemester')}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.classesToday', 'Classes Today')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-1 pt-0">
            <div className="text-2xl font-bold mb-1">{dashboardData.stats.classesToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.classesToday === 0 
                ? t('student.noClassesToday', 'None scheduled') 
                : t('student.checkSchedule', 'Check your schedule')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <GradesGraph recentGrades={dashboardData.grades.length > 0 ? dashboardData.grades : (reduxGrades || [])} />
        </Card>
        {/* Quick Actions */}
        <Card className="transition-all duration-300 ease-in-out flex flex-col">
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
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <BookOpen className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('student.viewMyGrades')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/student/schedule')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <Calendar className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('student.mySchedule')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/student/notifications')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <Bell className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('navigation.notifications')}</span>
              </Button>
              <Button
                onClick={() => navigate('/app/student/attendance')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <UserCheck className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('navigation.myAttendance')}</span>
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
            <MonthlyCalendar scheduleData={dashboardData.scheduleData} />
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
              className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5 hover:text-primary"
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
                    className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group"
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
            ) : (reduxNotifications && reduxNotifications.length > 0) ? (
              <div className="space-y-4">
                {reduxNotifications.slice(0, 5).map((notification, index) => (
                  <div
                    key={notification._id}
                    className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group"
                    onClick={() => navigate(`/app/notifications/${notification._id}`)}
                  >
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {notification.type === 'info' && <Info className="h-5 w-5" style={{color: 'hsl(var(--info))'}} />}
                      {notification.type === 'success' && <CheckCircle className="h-5 w-5" style={{color: 'hsl(var(--success))'}} />}
                      {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" style={{color: 'hsl(var(--warning))'}} />}
                      {notification.type === 'error' && <XCircle className="h-5 w-5" style={{color: 'hsl(var(--error))'}} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate transition-colors duration-300 group-hover:text-primary">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate transition-colors duration-300 group-hover:text-foreground">{notification.message}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30">
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

