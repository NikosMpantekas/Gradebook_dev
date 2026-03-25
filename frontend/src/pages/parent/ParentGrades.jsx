import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, User, School, BookOpen, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Spinner } from '../../components/ui/spinner';
import { API_URL } from '../../config/appConfig';

const ParentGrades = () => {
  const [studentsData, setStudentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const { user } = useSelector((state) => state.auth);
  const token = user?.token; // CRITICAL FIX: Extract token from user object

  // Mobile-friendly grade card component
  const GradeCard = ({ grade, showStudentName = false }) => (
    <Card className="mb-4 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <CardContent className="pb-4">
        <div className="space-y-4">
          {showStudentName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold text-primary">
                {grade.studentName}
              </h3>
            </div>
          )}
          
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-bold mb-2 sm:mb-0">
              {grade.subject?.name || grade.subject}
            </h3>
            <Badge variant="default" className="font-bold">
              Grade: {grade.value}
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Teacher: {grade.teacher?.name || grade.teacher}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(grade.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          {grade.description && (
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-sm italic text-muted-foreground">
              {grade.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    // More robust token retrieval with debugging
    console.log('[ParentGrades] Redux auth state:', {
      hasUser: !!user,
      hasToken: !!token,
      userRole: user?.role,
      tokenLength: token?.length || 0
    });

    if (!token) {
      console.error('[ParentGrades] No token available');
      setError('Authentication token not found');
      setLoading(false);
      return;
    }

    fetchStudentsData();
  }, [token]);

  const fetchStudentsData = async () => {
    try {
      console.log('[ParentGrades] Fetching students data...');
      setLoading(true);
      setError('');

      // CRITICAL FIX: Use correct parent grades endpoint
      const response = await fetch(`${API_URL}/api/grades/parent/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[ParentGrades] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ParentGrades] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[ParentGrades] Received data:', data);

      // CRITICAL FIX: Handle correct response format from parent grades endpoint
      if (data.students) {
        setStudentsData(data.students);
        console.log(`[ParentGrades] Successfully loaded ${data.students.length} students`);
      } else {
        console.warn('[ParentGrades] No students in response:', data);
        setStudentsData([]);
      }
    } catch (error) {
      console.error('[ParentGrades] Error fetching students data:', error);
      setError(error.message || 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setSelectedTab(value);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Spinner className="text-primary" />
        <p className="text-muted-foreground">Loading student grades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Grades</h3>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchStudentsData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!studentsData || studentsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-center">
          <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
          <p className="text-muted-foreground">
            You don't have any students linked to your account yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Student Grades</h1>
        <p className="text-muted-foreground">
          View and track your children's academic progress
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Grades:</span>
                      <Badge variant="secondary">{student.grades?.length || 0}</Badge>
                    </div>
                    {student.grades && student.grades.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Recent Grades:</p>
                        {student.grades.slice(0, 3).map((grade, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="truncate">{grade.subject?.name || grade.subject}</span>
                            <Badge variant="outline">{grade.value}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {studentsData.map((student) => (
            <Card key={student._id} className="mb-6">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <User className="h-6 w-6 text-primary" />
                  <CardTitle>{student.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {student.grades && student.grades.length > 0 ? (
                  <div className="space-y-4">
                    {student.grades.map((grade, index) => (
                      <GradeCard key={index} grade={grade} showStudentName={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No grades available for this student yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentsData.map((student) => {
              const grades = student.grades || [];
              const averageGrade = grades.length > 0 
                ? grades.reduce((sum, grade) => sum + parseFloat(grade.value), 0) / grades.length 
                : 0;

              return (
                <Card key={student._id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {averageGrade.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">Average Grade</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xl font-semibold">{grades.length}</div>
                          <p className="text-xs text-muted-foreground">Total Grades</p>
                        </div>
                        <div>
                          <div className="text-xl font-semibold">
                            {grades.filter(g => parseFloat(g.value) >= 7).length}
                          </div>
                          <p className="text-xs text-muted-foreground">Passing Grades</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentGrades;
