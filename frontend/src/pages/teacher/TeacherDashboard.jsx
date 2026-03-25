import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  GraduationCap,
  BookOpen,
  Bell,
  User,
  Plus,
  BarChart3,
  Clock,
  Calendar,
  Users,
  TrendingUp,
  FileText,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Target,
  Award,
  Zap,
  Edit,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import MaintenanceNotifications from '../../components/MaintenanceNotifications';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featuresLoading } = useFeatureToggles();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    recentGrades: [],
    upcomingClasses: [],
    stats: {
      totalStudents: 0,
      totalClasses: 0,
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
      console.log('TeacherDashboard: No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'teacher') {
      console.log('TeacherDashboard: User is not teacher, redirecting');
      toast.error(t('teacher.accessDenied'));
      navigate('/app/dashboard');
      return;
    }
    
    console.log('TeacherDashboard: Teacher user authenticated:', user.email);
  }, [user, navigate]);

  // Fetch dashboard data
  useEffect(() => {
    if (user && user.role === 'teacher' && !featuresLoading) {
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
      
      console.log('TeacherDashboard: Fetching dashboard data...');
      
      const promises = [];
      const dataKeys = [];
      
      // Fetch stats data first
      promises.push(fetchStats());
      dataKeys.push('stats');
      
      // Only fetch data for enabled features
      if (isFeatureEnabled('enableNotifications')) {
        setPanelLoading(prev => ({ ...prev, notifications: true }));
        promises.push(fetchNotifications());
        dataKeys.push('notifications');
      }
      
      // Execute all enabled data fetches
      const results = await Promise.allSettled(promises);
      
      // Process results
      const newData = { ...dashboardData };
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          if (key === 'stats') {
            newData.stats = result.value;
          } else {
            newData[key] = result.value;
          }
        } else {
          console.error(`TeacherDashboard: Error fetching ${key}:`, result.reason);
          if (key === 'stats') {
            newData.stats = {
              totalStudents: 0,
              totalClasses: 0,
            };
          } else {
            newData[key] = [];
          }
        }
      });
      
      setDashboardData(newData);
      console.log('TeacherDashboard: Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('TeacherDashboard: Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, grades: false, classes: false });
    }
  };

  const fetchStats = async () => {
    try {
      console.log('TeacherDashboard: Fetching teacher stats...');
      
      // Fetch teacher's students from their classes
      const studentsResponse = await axios.get(`${API_URL}/api/students/teacher/classes`, getAuthConfig());
      const students = studentsResponse.data || [];
      
      // Fetch teacher's classes
      const classesResponse = await axios.get(`${API_URL}/api/classes`, getAuthConfig());
      const classes = classesResponse.data || [];
      
      // For now, set gradesSubmitted and pendingGrades to 0
      // These could be enhanced later with actual grade data
      const stats = {
        totalStudents: students.length,
        totalClasses: classes.length,
      };
      
      console.log('TeacherDashboard: Stats calculated:', stats);
      return stats;
      
    } catch (error) {
      console.error('TeacherDashboard: Error fetching stats:', error);
      // Return default stats on error
      return {
        totalStudents: 0,
        totalClasses: 0,
      };
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications?limit=10`, getAuthConfig());
      return response.data || [];
    } catch (error) {
      console.error('TeacherDashboard: Error fetching notifications:', error);
      return [];
    }
  };

  // Navigation handlers
  const handleManageGrades = () => navigate('/app/teacher/grades/manage');
  const handleCreateGrade = () => navigate('/app/teacher/grades/create');
  const handleSendNotifications = () => navigate('/app/teacher/notifications');
  const handleStudentStats = () => navigate('/app/teacher/student-stats');
  const handleSchedule = () => navigate('/app/teacher/schedule');
  const handleViewAllNotifications = () => navigate('/app/teacher/notifications');

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

  // Show access denied if not teacher
  if (!user || user.role !== 'teacher') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>{t('teacher.accessDenied')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-wide">{t('teacher.welcomeBackName', { name: user?.name })}</h1>
        <p className="text-muted-foreground">{t('teacher.subtitle')}</p>
      </div>

      {/* Maintenance Notifications */}
      <MaintenanceNotifications />

      {/* Quick Stats and Actions - Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Stats */}
        <div className="space-y-4 h-full flex flex-col justify-center">
          <Card className="simple-fade-in transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('teacher.totalStudents')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col justify-center flex-1 pt-0">
              <div className="text-2xl font-bold mb-1">{dashboardData.stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">{t('teacher.enrolledStudents')}</p>
            </CardContent>
          </Card>

          <Card className="simple-fade-in transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('teacher.activeClasses')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col justify-center flex-1 pt-0">
              <div className="text-2xl font-bold mb-1">{dashboardData.stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">{t('teacher.currentClasses')}</p>
            </CardContent>
          </Card>
        </div>

              {/* Quick Actions */}
        <Card className="simple-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>{t('teacher.quickActions')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => navigate('/app/teacher/grades/create')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <Plus className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.createGrade')}</span>
              </Button>

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
                onClick={() => navigate('/app/teacher/notifications')}
                variant="ghost"
                className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
              >
                <MessageSquare className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
                <span className="transition-colors duration-300 group-hover:text-primary">{t('teacher.viewNotifications')}</span>
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

      {/* Recent Notifications */}
      <Card className="simple-fade-in">
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
                  className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group fade-in-up"
                  style={{
                      borderColor: notification.type === 'info' ? 'hsl(var(--info))' :
                                  notification.type === 'success' ? 'hsl(var(--success))' :
                                  notification.type === 'warning' ? 'hsl(var(--warning))' :
                                  notification.type === 'error' ? 'hsl(var(--error))' : 'hsl(var(--border))',
                    animationDelay: `${(index + 1) * 0.1}s`
                  }}
                  onClick={() => navigate(`/app/teacher/notifications/${notification._id}`)}
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
          ) : (
            <div className="text-center py-8 text-muted-foreground fade-in-up">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('teacher.noRecentNotifications')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Disabled Message */}
      {!isFeatureEnabled('enableNotifications') && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              <span className="text-sm">
                {t('navigation.featuresDisabledMessage')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherDashboard;
