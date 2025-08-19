import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User, 
  School, 
  BookOpen, 
  Award, 
  Calendar, 
  Bell, 
  TrendingUp, 
  BarChart3,
  ChevronRight,
  Eye,
  Clock,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
import { API_URL } from '../config/appConfig';

const ParentDashboard = () => {
  const [studentsData, setStudentsData] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchParentData();
    }
  }, [token]);

  const fetchParentData = async () => {
    try {
      setLoading(true);
      
      // Fetch students data
      const studentsResponse = await fetch(`${API_URL}/api/users/my-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudentsData(studentsData.students || []);
        
        // Fetch recent grades for all students
        if (studentsData.students && studentsData.students.length > 0) {
          const gradesPromises = studentsData.students.map(student =>
            fetch(`${API_URL}/api/grades/student/${student._id}/recent`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
          );
          
          const gradesResponses = await Promise.all(gradesPromises);
          const allGrades = [];
          
          for (let i = 0; i < gradesResponses.length; i++) {
            if (gradesResponses[i].ok) {
              const gradesData = await gradesResponses[i].json();
              if (gradesData.grades) {
                const gradesWithStudent = gradesData.grades.map(grade => ({
                  ...grade,
                  studentName: studentsData.students[i].name
                }));
                allGrades.push(...gradesWithStudent);
              }
            }
          }
          
          // Sort by date and take the most recent
          allGrades.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRecentGrades(allGrades.slice(0, 10));
        }
      }

      // Fetch notifications
      const notificationsResponse = await fetch(`${API_URL}/api/notifications/my-notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
      }

    } catch (error) {
      console.error('Error fetching parent data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const navigateToGrades = () => {
    navigate('/parent/grades');
  };

  const navigateToNotifications = () => {
    navigate('/notifications');
  };

  const navigateToCalendar = () => {
    navigate('/calendar');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Spinner className="text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchParentData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Monitor your children's academic progress and stay updated.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="grades">Recent Grades</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsData.length}</div>
                <p className="text-xs text-muted-foreground">
                  Children in your care
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Grades</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentGrades.length}</div>
                <p className="text-xs text-muted-foreground">
                  Grades this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notifications.filter(n => !n.read).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  New messages
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
                  {recentGrades.length > 0 
                    ? (recentGrades.reduce((sum, grade) => sum + parseFloat(grade.value), 0) / recentGrades.length).toFixed(1)
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Recent performance
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
                <Button onClick={navigateToGrades} className="h-20 flex-col">
                  <Award className="h-6 w-6 mb-2" />
                  View Grades
                </Button>
                <Button onClick={navigateToNotifications} variant="outline" className="h-20 flex-col">
                  <Bell className="h-6 w-6 mb-2" />
                  Check Notifications
                </Button>
                <Button onClick={navigateToCalendar} variant="outline" className="h-20 flex-col">
                  <Calendar className="h-6 w-6 mb-2" />
                  View Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentsData.map((student) => (
              <Card key={student._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <User className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <School className="h-4 w-4 text-muted-foreground" />
                      <span>{student.school?.name || 'School not specified'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{student.direction?.name || 'Direction not specified'}</span>
                    </div>
                    <Button 
                      onClick={() => navigate(`/parent/grades?student=${student._id}`)}
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                    >
                      View Grades
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Grades</h3>
            <Button onClick={navigateToGrades} variant="outline">
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
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{grade.studentName}</span>
                        </div>
                        <Badge variant="outline">{grade.subject}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{grade.value}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(grade.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {grade.description && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {grade.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Recent Grades</h3>
              <p className="text-muted-foreground">
                Your children haven't received any grades recently.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Notifications</h3>
            <Button onClick={navigateToNotifications} variant="outline">
              View All Notifications
            </Button>
          </div>
          
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.slice(0, 10).map((notification) => (
                <Card key={notification._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                          </div>
                          {notification.sender && (
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>From: {notification.sender.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
              <p className="text-muted-foreground">
                You don't have any notifications at the moment.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentDashboard;
