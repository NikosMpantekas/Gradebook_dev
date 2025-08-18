import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  User, 
  School, 
  BookOpen, 
  Award, 
  Bell, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  Clock,
  Mail,
  Users,
  Target,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { getMyNotifications } from '../../features/notifications/notificationSlice';
import { getStudentGrades } from '../../features/grades/gradeSlice';
import { getSchools } from '../../features/schools/schoolSlice';
import { getDirections } from '../../features/directions/directionSlice';
import { getSubjects } from '../../features/subjects/subjectSlice';
import logger from '../../services/loggerService';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';

const TeacherDashboard_Old = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [recentGrades, setRecentGrades] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalGrades: 0,
    averageGrade: 0,
    unreadNotifications: 0
  });

  const { user, token } = useSelector((state) => state.auth);
  const { schools } = useSelector((state) => state.schools);
  const { directions } = useSelector((state) => state.directions);
  const { subjects } = useSelector((state) => state.subjects);
  const { notifications } = useSelector((state) => state.notifications);
  const { grades } = useSelector((state) => state.grades);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user) {
      fetchDashboardData();
    }
  }, [token, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user data if not already loaded
      if (!user.schools || !user.directions || !user.subjects) {
        // Handle user data fetching
      }

      // Fetch schools, directions, and subjects if not already loaded
      if (!schools.length) {
        await dispatch(getSchools()).unwrap();
      }
      if (!directions.length) {
        await dispatch(getDirections()).unwrap();
      }
      if (!subjects.length) {
        await dispatch(getSubjects()).unwrap();
      }

      // Fetch recent notifications and grades
      await dispatch(getMyNotifications()).unwrap();
      await dispatch(getStudentGrades()).unwrap();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      logger.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Process recent grades
    if (grades && grades.length > 0) {
      const sortedGrades = [...grades]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentGrades(sortedGrades);
      
      // Calculate stats
      const totalGrades = grades.length;
      const averageGrade = grades.reduce((sum, grade) => sum + parseFloat(grade.value), 0) / totalGrades;
      setStats(prev => ({ ...prev, totalGrades, averageGrade }));
    }
  }, [grades]);

  useEffect(() => {
    // Process recent notifications
    if (notifications && notifications.length > 0) {
      const sortedNotifications = [...notifications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentNotifications(sortedNotifications);
      
      const unreadCount = notifications.filter(n => !n.read).length;
      setStats(prev => ({ ...prev, unreadNotifications: unreadCount }));
    }
  }, [notifications]);

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navigateTo = (path) => {
    navigate(path);
    closeSidebar();
  };

  const handleLogout = () => {
    // Implement logout logic
    navigate('/login');
  };

  const getUserSchools = () => {
    if (!user.schools || !schools.length) return [];
    
    return user.schools.map(schoolId => {
      const school = schools.find(s => s._id === schoolId);
      return school || { _id: schoolId, name: 'Unknown School' };
    });
  };

  const getUserDirections = () => {
    if (!user.directions || !directions.length) return [];
    
    return user.directions.map(directionId => {
      const direction = directions.find(d => d._id === directionId);
      return direction || { _id: directionId, name: 'Unknown Direction' };
    });
  };

  const getUserSubjects = () => {
    if (!user.subjects || !subjects.length) return [];
    
    return user.subjects.map(subjectId => {
      const subject = subjects.find(s => s._id === subjectId);
      return subject || { _id: subjectId, name: 'Unknown Subject' };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{user.name}</span>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button variant="ghost" size="sm" onClick={closeSidebar} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <nav className="p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/teacher/dashboard')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/teacher/grades')}
            >
              <Award className="mr-2 h-4 w-4" />
              Grades
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/app/teacher/notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/teacher/calendar')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            
                <Button 
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/teacher/profile')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
                </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="container mx-auto px-4 py-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="grades">Grades</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Welcome Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-6 w-6 text-primary" />
                      <span>Welcome, {user.name}!</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Here's an overview of your teaching activities and student progress.
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalStudents}</div>
                      <p className="text-xs text-muted-foreground">
                        Students in your classes
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Grades</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalGrades}</div>
                      <p className="text-xs text-muted-foreground">
                        Grades assigned
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
            <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.averageGrade.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Class performance
                      </p>
            </CardContent>
          </Card>

          <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
            <CardContent>
                      <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
                      <p className="text-xs text-muted-foreground">
                        New messages
                      </p>
            </CardContent>
          </Card>
                </div>

        {/* Quick Actions */}
          <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
            <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Button 
                        onClick={() => navigate('/teacher/create-grade')} 
                        className="h-20 flex-col sleek-button bg-primary hover:bg-primary/90 text-foreground hover:text-foreground"
                      >
                        <Plus className="h-8 w-8 mb-2" />
                        Create Grade
                      </Button>
                      <Button onClick={() => navigate('/teacher/create-notification')} variant="outline" className="h-20 flex-col">
                        <Bell className="h-6 w-6 mb-2" />
                  Send Notification
                </Button>
                      <Button onClick={() => navigate('/teacher/calendar')} variant="outline" className="h-20 flex-col">
                        <Calendar className="h-6 w-6 mb-2" />
                        View Calendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="grades" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Grades</h3>
                  <Button onClick={() => navigate('/teacher/grades')} variant="outline">
                    View All Grades
                  </Button>
                </div>
                
                {recentGrades.length > 0 ? (
                  <div className="space-y-4">
                    {recentGrades.map((grade, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <User className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{grade.student?.name || 'Unknown Student'}</p>
                                <p className="text-sm text-muted-foreground">{grade.subject?.name || 'Unknown Subject'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="default" className="text-lg font-bold">
                                {grade.value}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                {new Date(grade.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Grades Yet</h3>
                    <p className="text-muted-foreground">
                      You haven't created any grades yet.
                    </p>
                    <Button 
                      onClick={() => navigate('/teacher/create-grade')} 
                      className="mt-4 sleek-button bg-primary hover:bg-primary/90 text-foreground hover:text-foreground"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Grade
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Notifications</h3>
                  <Button onClick={() => navigate('/app/teacher/notifications')} variant="outline">
                    View All Notifications
                  </Button>
                </div>
                
                {recentNotifications.length > 0 ? (
                  <div className="space-y-4">
                    {recentNotifications.map((notification, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Bell className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {notification.message}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={notification.priority === 'high' ? 'destructive' : 'default'}>
                                {notification.priority}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications Yet</h3>
                    <p className="text-muted-foreground">
                      You haven't sent any notifications yet.
                    </p>
                    <Button onClick={() => navigate('/teacher/create-notification')} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Send Your First Notification
                </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Teaching Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">Class Distribution</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Schools:</span>
                            <Badge variant="outline">{getUserSchools().length}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Directions:</span>
                            <Badge variant="outline">{getUserDirections().length}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Subjects:</span>
                            <Badge variant="outline">{getUserSubjects().length}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold">Performance Overview</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Total Grades:</span>
                            <Badge variant="default">{stats.totalGrades}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Average Grade:</span>
                            <Badge variant="default">{stats.averageGrade.toFixed(1)}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Unread Messages:</span>
                            <Badge variant="secondary">{stats.unreadNotifications}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
            </CardContent>
          </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
};

export default TeacherDashboard_Old;
