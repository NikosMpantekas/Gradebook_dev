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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { Spinner } from '../../components/ui/spinner';
import { GradesGraph } from "../../components/GradesGraph";
import { MonthlyCalendar } from '../../components/MonthlyCalendar';

const StudentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featuresLoading } = useFeatureToggles();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    grades: [],
    classes: [],
    stats: {
      totalSubjects: 0,
      averageGrade: 0,
      gradesReceived: 0,
      pendingGrades: 0
    }
  });
  
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

  // Fetch dashboard data
  useEffect(() => {
    if (user && user.role === 'student' && !featuresLoading) {
      fetchDashboardData();
    }
  }, [user, featuresLoading]);

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
        promises.push(fetchUpcomingClasses());
        dataKeys.push('classes');
      }
      
      // Execute all enabled data fetches
      const results = await Promise.allSettled(promises);
      
      // Process results
      const newData = { ...dashboardData };
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          newData[key] = result.value;
        } else {
          console.error(`StudentDashboard: Error fetching ${key}:`, result.reason);
          newData[key] = [];
        }
      });
      
      // Calculate stats from grades data
      if (newData.grades && newData.grades.length > 0) {
        const gradeValues = newData.grades.map(g => g.value);
        const averageGrade = gradeValues.reduce((sum, val) => sum + val, 0) / gradeValues.length;
        
        // Get unique subjects
        const subjects = [...new Set(newData.grades.map(g => g.subject?.name).filter(Boolean))];
        
        newData.stats = {
          totalSubjects: subjects.length,
          averageGrade: Math.round(averageGrade * 100) / 100,
          gradesReceived: newData.grades.length
        };
      }
      
      setDashboardData(newData);
      console.log('StudentDashboard: Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('StudentDashboard: Error fetching dashboard data:', error);
      setError(t('student.failedToLoad'));
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, grades: false, classes: false });
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications?limit=10`, getAuthConfig());
      return response.data || [];
    } catch (error) {
      console.error('StudentDashboard: Error fetching notifications:', error);
      return [];
    }
  };

  const fetchAllGrades = async () => {
    try {
      // For student, get all their grades using the student-specific endpoint
      const response = await axios.get(`${API_URL}/api/grades/student`, getAuthConfig());
      
      console.log('StudentDashboard: Grades response:', response.data);
      
      const grades = response.data?.grades || response.data || [];
      // Return all grades for the graph (no limit needed)
      const allGrades = Array.isArray(grades) ? grades : [];
      
      console.log('StudentDashboard: All grades for graph:', allGrades.length);
      return allGrades;
    } catch (error) {
      console.error('StudentDashboard: Error fetching grades:', error);
      return [];
    }
  };

  const fetchUpcomingClasses = async () => {
    try {
      // For student, get their schedule
      const response = await axios.get(`${API_URL}/api/schedule`, getAuthConfig());
      
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
      console.error('StudentDashboard: Error fetching upcoming classes:', error);
      return [];
    }
  };

  // Navigation handlers
  const handleViewGrades = () => navigate('/app/grades');
  const handleSubmitRatings = () => navigate('/app/ratings');
  const handleViewSchedule = () => navigate('/app/schedule');
  const handleViewCalendar = () => navigate('/app/calendar');
  const handleViewAllNotifications = () => navigate('/app/notifications');

  // Show loading state
  if (featuresLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner className="text-primary" />
        </div>
      </div>
    );
  }

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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.totalSubjects')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">{t('student.enrolledSubjects')}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.averageGrade')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.averageGrade.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">{t('student.currentAverage')}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('student.gradesReceived')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.gradesReceived}</div>
            <p className="text-xs text-muted-foreground">{t('student.thisSemester')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="panel-slide-in overflow-hidden">
          <GradesGraph recentGrades={dashboardData.grades} />
        </Card>
        {/* Quick Actions */}
        <Card className="panel-slide-in flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>{t('student.quickActions')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate('/app/grades')}
                variant="outline"
                className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group"
              >
                <BookOpen className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('student.viewMyGrades')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/schedule')}
                variant="outline"
                className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group"
              >
                <Calendar className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('student.mySchedule')}</span>
              </Button>

              <Button
                onClick={() => navigate('/app/notifications')}
                variant="outline"
                className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group"
              >
                <Bell className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('navigation.notifications')}</span>
              </Button>
              <Button
                onClick={() => navigate('/app/student-stats')}
                variant="outline"
                className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group"
              >
                <BarChart3 className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('student.myStats')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Recent Notifications and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Calendar Widget */}
        <Card className="panel-slide-in">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{t('student.monthlyCalendar')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MonthlyCalendar classes={dashboardData.classes} />
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="panel-slide-in lg:col-span-2">
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
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {panelLoading.notifications ? (
              <div className="flex justify-center py-8">
                <Spinner className="text-primary" />
              </div>
            ) : dashboardData.notifications.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.notifications.slice(0, 5).map((notification, index) => (
                  <div
                    key={notification._id}
                    className="flex items-center space-x-3 p-4 rounded-lg border bg-card/50 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group fade-in-up"
                    style={{
                      borderColor: notification.type === 'info' ? '#3b82f6' :
                                  notification.type === 'success' ? '#10b981' :
                                  notification.type === 'warning' ? '#f59e0b' :
                                  notification.type === 'error' ? '#ef4444' : 'hsl(var(--background))',
                      animationDelay: `${(index + 1) * 0.1}s`
                    }}
                    onClick={() => navigate(`/app/notifications/${notification._id}`)}
                  >
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                      {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                      {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate transition-colors duration-300 group-hover:text-primary">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate transition-colors duration-300 group-hover:text-foreground">{notification.message}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                    >
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground fade-in-up">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noNotifications')}</p>
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
                {t('student.featuresDisabled')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
