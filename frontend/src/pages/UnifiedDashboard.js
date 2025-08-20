import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ChevronRight,
  Plus,
  Eye,
  Clock,
  Mail,
  Phone,
  MapPin,
  Zap,
  CalendarDays,
  MessageSquare
} from 'lucide-react';
import { getUserData } from '../features/auth/authSlice';
import { getMyNotifications } from '../features/notifications/notificationSlice';
import { getStudentGrades } from '../features/grades/gradeSlice';
import { getSchools } from '../features/schools/schoolSlice';
import { getDirections } from '../features/directions/directionSlice';
import { getSubjects } from '../features/subjects/subjectSlice';
import logger from '../services/loggerService';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Label } from '../components/ui/label';
import { Spinner } from '../components/ui/spinner';

const UnifiedDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [recentGrades, setRecentGrades] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useSelector((state) => state.auth);
  const { schools } = useSelector((state) => state.schools);
  const { directions } = useSelector((state) => state.directions);
  const { subjects } = useSelector((state) => state.subjects);
  const { notifications } = useSelector((state) => state.notifications);
  const { grades } = useSelector((state) => state.grades);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  useEffect(() => {
    if (authToken && user) {
      fetchDashboardData();
    }
  }, [authToken, user]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user data if not already loaded
      if (!user.schools || !user.directions || !user.subjects) {
        await dispatch(getUserData()).unwrap();
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
      if (user.role === 'student') {
        await dispatch(getStudentGrades(user._id || user.id)).unwrap();
      }
      // CRITICAL FIX: Parents should NOT fetch grades here - handled by ParentDashboard component
      // Parent grades are fetched via /api/grades/parent/students endpoint

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      logger.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, user, schools.length, directions.length, subjects.length]);

  useEffect(() => {
    // Process recent grades
    if (grades && grades.length > 0) {
      const sortedGrades = [...grades]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentGrades(sortedGrades);
    }
  }, [grades]);

  useEffect(() => {
    // Process recent notifications
    if (notifications && notifications.length > 0) {
      const sortedNotifications = [...notifications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentNotifications(sortedNotifications);
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
        <Spinner className="text-primary" />
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
              <h1 className="text-2xl font-bold text-foreground">GradeBook</h1>
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
              onClick={() => navigateTo('/dashboard')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/grades')}
            >
              <Award className="mr-2 h-4 w-4" />
              Grades
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/calendar')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            
                    <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigateTo('/profile')}
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
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="academics">Academics</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Welcome Section */}
                <Card className="panel-slide-in">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-6 w-6 text-primary" />
                      <span>Welcome, {user.name}!</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Here's an overview of your academic information and recent activity.
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="fade-in-up stagger-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Schools</CardTitle>
                      <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getUserSchools().length}</div>
                    </CardContent>
                  </Card>

                  <Card className="fade-in-up stagger-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Directions</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getUserDirections().length}</div>
                    </CardContent>
                  </Card>

                  <Card className="fade-in-up stagger-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getUserSubjects().length}</div>
                    </CardContent>
                  </Card>

                  <Card className="fade-in-up stagger-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{recentNotifications.length}</div>
            </CardContent>
          </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Grades */}
                  <Card className="panel-slide-in">
                    <CardHeader>
                      <CardTitle>Recent Grades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recentGrades.length > 0 ? (
                        <div className="space-y-3">
                          {recentGrades.map((grade, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-3 border rounded-lg fade-in-up"
                              style={{
                                animationDelay: `${(index + 1) * 0.1}s`
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <Award className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium">{grade.subject}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(grade.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default">{grade.value}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4 fade-in-up">
                          No recent grades available
                        </p>
              )}
            </CardContent>
          </Card>

                  {/* Recent Notifications */}
                  <Card className="panel-slide-in">
                    <CardHeader>
                      <CardTitle>Recent Notifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recentNotifications.length > 0 ? (
                        <div className="space-y-3">
                          {recentNotifications.map((notification, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-3 border rounded-lg fade-in-up"
                              style={{
                                animationDelay: `${(index + 1) * 0.1}s`
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <Bell className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4 fade-in-up">
                          No recent notifications available
                        </p>
                  )}
                </CardContent>
              </Card>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm text-muted-foreground">{user.name}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Role</Label>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="academics" className="space-y-6">
                {/* Schools */}
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <School className="h-5 w-5 text-primary" />
                      <span>Schools</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getUserSchools().length > 0 ? (
                      <div className="space-y-2">
                        {getUserSchools().map((school) => (
                          <div key={school._id} className="flex items-center space-x-2 p-2 border rounded">
                            <School className="h-4 w-4 text-muted-foreground" />
                            <span>{school.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No schools assigned
                      </p>
                  )}
                </CardContent>
              </Card>

                {/* Directions */}
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span>Directions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getUserDirections().length > 0 ? (
                      <div className="space-y-2">
                        {getUserDirections().map((direction) => (
                          <div key={direction._id} className="flex items-center space-x-2 p-2 border rounded">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>{direction.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No directions assigned
                      </p>
                  )}
                </CardContent>
              </Card>

                {/* Subjects */}
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span>Subjects</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getUserSubjects().length > 0 ? (
                      <div className="space-y-2">
                        {getUserSubjects().map((subject) => (
                          <div key={subject._id} className="flex items-center space-x-2 p-2 border rounded">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>{subject.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No subjects assigned
                      </p>
                  )}
                </CardContent>
              </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
          <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      Activity tracking coming soon...
                    </p>
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

export default UnifiedDashboard;
