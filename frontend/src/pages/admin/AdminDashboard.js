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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';

const AdminDashboard = () => {
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
      toast.error('Access denied. Admin privileges required.');
      navigate('/app/dashboard');
      return;
    }
    
    console.log('AdminDashboard: Admin user authenticated:', user.email);
  }, [user, navigate]);

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
      setLoading(true);
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
      results.forEach((result, index) => {
        const key = dataKeys[index];
        if (result.status === 'fulfilled') {
          if (key === 'stats') {
            newData.stats = result.value;
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
      console.log('AdminDashboard: Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('AdminDashboard: Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
      setPanelLoading({ notifications: false, grades: false, classes: false });
    }
  };

  const fetchStats = async () => {
    try {
      console.log('AdminDashboard: Fetching stats...');
      
      // Fetch users to count by role
      const usersResponse = await axios.get(`${API_URL}/api/users`, getAuthConfig());
      const users = usersResponse.data || [];
      
      // Fetch classes to count total classes
      const classesResponse = await axios.get(`${API_URL}/api/classes`, getAuthConfig());
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
      const response = await axios.get(`${API_URL}/api/notifications?limit=10`, getAuthConfig());
      return response.data || [];
    } catch (error) {
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

  // Show loading state
  if (featuresLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
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

  // Show access denied if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>Access denied. Administrator privileges required.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-wide">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">Manage your school's academic operations and user accounts.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">Active teachers</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="panel-slide-in">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={handleManageUsers} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <Users className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">Manage Users</span>
            </Button>
            
            <Button onClick={handleManageSchools} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <Building className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">School Branches</span>
            </Button>
            
            <Button onClick={handleManageGrades} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <Book className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">Manage Grades</span>
            </Button>
            
            <Button onClick={handleManageSubjects} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <FileText className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">Manage Classes</span>
            </Button>
            
            <Button onClick={handleStudentProgress} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <BarChart3 className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">Student Progress</span>
            </Button>
            <Button onClick={handleManageSchedule} variant="outline" className="h-auto p-4 flex-col transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/5 group">
              <Calendar className="h-8 w-8 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary" />
              <span className="transition-colors duration-300 group-hover:text-primary">Manage Schedule</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {isFeatureEnabled('enableNotifications') && (
        <Card className="panel-slide-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>Recent Notifications</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewAllNotifications}
              className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {panelLoading.notifications ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dashboardData.notifications.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.notifications.slice(0, 5).map((notification, index) => (
                  <div 
                    key={notification._id} 
                    className="flex items-center space-x-3 p-3 rounded-lg border bg-card/50 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer group fade-in-up"
                    style={{
                      borderColor: notification.type === 'info' ? '#3b82f6' :
                                  notification.type === 'success' ? '#10b981' :
                                  notification.type === 'warning' ? '#f59e0b' :
                                  notification.type === 'error' ? '#ef4444' : 'hsl(var(--background))',
                      animationDelay: `${(index + 1) * 0.1}s`
                    }}
                  >
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                      {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {notification.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate transition-colors duration-300 group-hover:text-primary">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate transition-colors duration-300 group-hover:text-foreground">{notification.message}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                    >
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground fade-in-up">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent notifications</p>
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
                Some dashboard features are currently disabled. Contact your system administrator to enable additional features.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard; 