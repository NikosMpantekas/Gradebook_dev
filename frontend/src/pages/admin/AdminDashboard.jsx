import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Bell,
  GraduationCap,
  Building,
  BarChart3,
  Book,
  UserCog,
  Plus,
  Calendar,
  TrendingUp,
  Shield,
  FileText,
  FolderOpen,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users2,
  Info,
  Package,
  Euro,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Spinner } from '../../components/ui/spinner';
import { useFeatureToggles } from '../../contexts/FeatureToggleContext';
import MaintenanceNotifications from '../../components/MaintenanceNotifications';
import axiosInstance from '../../app/axios';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';
import { setDashboardDataCache } from '../../features/ui/uiSlice';

// Static skeleton - no animations, matches AdminDashboard pattern exactly
const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="flex flex-col h-32">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted/40 rounded-md" />
            <div className="h-4 w-4 bg-muted/30 rounded-sm" />
          </CardHeader>
          <CardContent className="flex flex-col flex-1 pt-0 mt-2">
            <div className="h-8 w-16 mb-2 bg-muted/50 rounded-md" />
            <div className="h-3 w-32 bg-muted/30 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted/40 rounded-md" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 w-full rounded-lg bg-muted/30" />
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="h-6 w-40 bg-muted/40 rounded-md" />
        <div className="h-8 w-20 bg-muted/30 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted/20" />
        ))}
      </CardContent>
    </Card>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featuresLoading } = useFeatureToggles();
  const { t } = useTranslation();
  
  // Redux store data for instant display (cache)
  const { dashboard: uiCache } = useSelector((state) => state.ui || { dashboard: {} });

  const reduxStats = React.useMemo(() => {
    if (uiCache?.adminStats) return uiCache.adminStats;
    return null;
  }, [uiCache]);
  
  const [loading, setLoading] = useState(!reduxStats);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    grades: [],
    classes: [],
    stats: reduxStats || {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
      recentActivity: 0
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
      console.log('AdminDashboard: No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      console.log('AdminDashboard: User is not admin, redirecting');
      toast.error(t('admin.accessDenied'));
      navigate('/app/dashboard');
      return;
    }
    
    console.log('AdminDashboard: Admin user authenticated:', user.email);
  }, [user, navigate, t]);

  // Fetch dashboard data
  useEffect(() => {
    if (user && user.role === 'admin' && !featuresLoading) {
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
      if (!reduxStats) {
        setLoading(true);
      }
      setError(null);
      
      console.log('AdminDashboard: Fetching dashboard data...');
      
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
      let updatedStats = null;
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          if (key === 'stats') {
            newData.stats = result.value;
            updatedStats = result.value;
          } else {
            newData[key] = result.value;
          }
        } else {
          console.error(`AdminDashboard: Error fetching ${key}:`, result.reason);
          if (key === 'stats') {
            newData.stats = {
              totalUsers: 0,
              totalStudents: 0,
              totalTeachers: 0,
              totalClasses: 0,
              recentActivity: 0
            };
          } else {
            newData[key] = [];
          }
        }
      });
      
      setDashboardData(newData);
      if (updatedStats) {
        dispatch(setDashboardDataCache({ adminStats: updatedStats }));
      }
      console.log('AdminDashboard: Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('AdminDashboard: Error fetching dashboard data:', error);
      setError(t('admin.failedToLoad'));
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, grades: false, classes: false });
    }
  };

  const fetchStats = async () => {
    try {
      console.log('AdminDashboard: Fetching stats...');
      
      // Fetch users to count by role
      const usersResponse = await axiosInstance.get(`${API_URL}/api/users`, getAuthConfig());
      const users = usersResponse.data || [];
      
      // Fetch classes to count total classes
      const classesResponse = await axiosInstance.get(`${API_URL}/api/classes`, getAuthConfig());
      const classes = classesResponse.data || [];
      
      // Calculate stats
      const stats = {
        totalUsers: users.length,
        totalStudents: users.filter(user => user.role === 'student').length,
        totalTeachers: users.filter(user => user.role === 'teacher').length,
        totalClasses: classes.length,
        recentActivity: 0 // This could be enhanced later with actual activity data
      };
      
      console.log('AdminDashboard: Stats calculated:', stats);
      return stats;
      
    } catch (error) {
      if (error.name === 'CanceledError' || error.message?.includes('Duplicate request')) {
        return {
          totalUsers: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0,
          recentActivity: 0
        };
      }
      console.error('AdminDashboard: Error fetching stats:', error);
      // Return default stats on error
      return {
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        recentActivity: 0
      };
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
      console.error('AdminDashboard: Error fetching notifications:', error);
      return [];
    }
  };

  // Navigation handlers
  const handleViewAllNotifications = () => navigate('/app/admin/notifications/manage');
  const handleManageGrades = () => navigate('/app/admin/grades/manage');
  const handleManageUsers = () => navigate('/app/admin/users');
  const handleManageSchools = () => navigate('/app/admin/schools');
  const handleManageSubjects = () => navigate('/app/admin/classes');
  const handleStudentProgress = () => navigate('/app/admin/student-stats');
  const handleManageSchedule = () => navigate('/app/admin/schedule');

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

  // Show access denied if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>{t('admin.accessDenied')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section - Always rendered immediately from session */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-wide">{t('admin.welcomeBackName', { name: user?.name })}</h1>
        <p className="text-muted-foreground">{t('admin.subtitle')}</p>
      </div>

      {/* Maintenance Notifications */}
      <MaintenanceNotifications />

      {featuresLoading || (loading && !reduxStats) ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{t('admin.activeAccounts')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.students')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{t('admin.enrolledStudents')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.teachers')}</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">{t('admin.activeTeachers')}</p>
          </CardContent>
        </Card>

        <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.classes')}</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">{t('admin.activeClasses')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>{t('admin.quickActions')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={handleManageUsers} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <Users className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.manageUsers')}</span>
            </Button>
            
            <Button onClick={handleManageSchools} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <Building className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.schoolBranches')}</span>
            </Button>
            
            <Button onClick={handleManageGrades} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <Book className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.manageGrades')}</span>
            </Button>
            
            <Button onClick={handleManageSubjects} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <FileText className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.manageClasses')}</span>
            </Button>
            
            <Button onClick={handleStudentProgress} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <BarChart3 className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.studentProgress')}</span>
            </Button>
            <Button onClick={handleManageSchedule} variant="ghost" className="h-auto p-4 flex-col bg-muted/30 border border-border/50 rounded-lg transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 group"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
              <Calendar className="h-8 w-8 mb-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
              <span className="group-hover:text-primary">{t('admin.manageSchedule')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {isFeatureEnabled('enableNotifications') && (
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>{t('admin.recentNotifications')}</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewAllNotifications}
              className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {t('admin.viewAll')}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {panelLoading.notifications ? (
              <div className="flex justify-center py-8">
                <Spinner className="text-primary" />
              </div>
            ) : dashboardData.notifications.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.notifications.slice(0, 5).map((notification, index) => (
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
                    onClick={() => navigate(`/app/admin/notifications/${notification._id}`)}
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
                  <p>{t('admin.noRecentNotifications')}</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Disabled Message */}
      {!isFeatureEnabled('enableNotifications') && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              <span className="text-sm">
                {t('admin.featuresDisabled')}
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

export default AdminDashboard; 

