import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { 
  BarChart3, 
  BookOpen, 
  Calendar, 
  Printer,
  TrendingUp,
  Users,
  User,
  School,
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

const StudentStats = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent && startDate && endDate) {
      fetchGradesData();
    }
  }, [selectedStudent, startDate, endDate]);

  // Fetch students list - teachers only see their assigned students
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const token = localStorage.getItem('token');
      
      // For teachers, use teacher-specific endpoint to get only their students
      // For admins, get all students
      const endpoint = user?.role === 'teacher' 
        ? `${API_URL}/api/users/teacher-students`  // Only students from teacher's classes
        : `${API_URL}/api/users/students`;         // All students for admin
      
      console.log(`[StudentStats] Fetching students for ${user?.role}:`, endpoint);
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`[StudentStats] Received ${response.data?.length || 0} students for ${user?.role}`);
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch grades data for selected student and date range
  const fetchGradesData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/grades/student-period-analysis`, {
        params: {
          studentId: selectedStudent,
          startDate: startDate,
          endDate: endDate
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGradesData(response.data);
    } catch (error) {
      console.error('Error fetching grades data:', error);
      setError('Failed to load grades data');
      setGradesData(null);
    } finally {
      setLoading(false);
    }
  };

  // Get role-specific header info
  const getRoleInfo = () => {
    if (user?.role === 'admin') {
      return {
        icon: <Shield className="h-8 w-8" />,
        title: 'Admin Student Analysis',
        description: 'Detailed grade analysis and class comparison'
      };
    } else {
      return {
        icon: <School className="h-8 w-8" />,
        title: 'Student Grade Analysis',
        description: 'Detailed grade analysis and class comparison'
      };
    }
  };

  // Prepare chart data for subjects with multiple grades
  const prepareChartData = (subjectGrades) => {
    return subjectGrades.map((grade, index) => ({
      index: index + 1,
      grade: grade.value,
      date: new Date(grade.date).toLocaleDateString(),
      timestamp: new Date(grade.date).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp);
  };

  // Navigate to dedicated print page
  const handlePrintReport = () => {
    if (!selectedStudent || !startDate || !endDate) {
      alert('Please select a student and date range first.');
      return;
    }
    
    navigate('/student-stats/print', {
      state: {
        selectedStudent,
        selectedStudentData,
        startDate: startDate,
        endDate: endDate
      }
    });
  };

  const roleInfo = getRoleInfo();
  const selectedStudentData = students.find(s => s._id === selectedStudent);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-lg">
                {roleInfo.icon}
              </div>
              <div>
                <CardTitle className="text-3xl font-light">{roleInfo.title}</CardTitle>
                <p className="text-muted-foreground">{roleInfo.description}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Selection Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="student">Select Student</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
                disabled={studentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!selectedStudent}
                max={endDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!selectedStudent || !startDate}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          {/* Print Report Button */}
          {selectedStudent && startDate && endDate && (
            <div className="flex justify-center">
              <Button
                onClick={handlePrintReport}
                className="min-w-[140px]"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <div className="flex items-center space-x-2">
            <span>⚠️ {error}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Grades Analysis Content */}
      {gradesData && (
        <div id="printable-content">
          {/* Report Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-light mb-4">Student Grade Analysis Report</h1>
                <h2 className="text-2xl text-primary mb-2">{selectedStudentData?.name}</h2>
                <p className="text-muted-foreground">
                  Date Range: {startDate ? new Date(startDate).toLocaleDateString() : 'N/A'} - {endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Generated on: {new Date().toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subject-wise Grades */}
          {gradesData.subjectAnalysis && Object.keys(gradesData.subjectAnalysis).length > 0 ? (
            Object.entries(gradesData.subjectAnalysis).map(([subjectName, subjectData]) => (
              <Card key={subjectName} className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-semibold mb-4">
                    📚 {subjectName}
                  </h3>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="text-center p-4">
                        <div className="text-2xl font-bold text-primary">
                          {subjectData.studentAverage?.toFixed(1) || 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Student Average</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="text-center p-4">
                        <div className="text-2xl font-bold text-secondary">
                          {subjectData.classAverage?.toFixed(1) || 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Class Average</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="text-center p-4">
                        <div className="text-2xl font-bold">
                          {subjectData.grades?.length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Grades</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="text-center p-4">
                        <Badge 
                          variant={subjectData.studentAverage >= subjectData.classAverage ? 'default' : 'secondary'}
                          className="text-sm"
                        >
                          {subjectData.studentAverage >= subjectData.classAverage ? 'Above Average' : 'Below Average'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progress Graph for multiple grades */}
                  {subjectData.grades && subjectData.grades.length > 1 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-4">
                        📈 Grade Progress Over Time
                      </h4>
                      <div className="w-full h-[300px]">
                        <ResponsiveContainer>
                          <LineChart data={prepareChartData(subjectData.grades)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              domain={[0, 20]}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value) => [value, 'Grade']}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="grade" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                              name="Grade"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Grades Table */}
                  <h4 className="text-lg font-semibold mb-4">
                    📋 All Grades
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>vs Class Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectData.grades?.map((grade, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={grade.value >= subjectData.classAverage ? 'default' : grade.value >= subjectData.classAverage * 0.8 ? 'secondary' : 'destructive'}
                            >
                              {grade.value}
                            </Badge>
                          </TableCell>
                          <TableCell>{grade.description || '-'}</TableCell>
                          <TableCell>{grade.teacher?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={grade.value >= subjectData.classAverage ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {grade.value >= subjectData.classAverage ? '↗️ Above' : '↘️ Below'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            No grades found for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg text-muted-foreground mb-2">
                  No grades found for the selected period
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try selecting a different time period or check if grades have been recorded
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Selection prompt */}
      {!selectedStudent || !startDate || !endDate ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg text-muted-foreground mb-2">
              Select a student and date range to view grade analysis
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a student and select start/end dates above to generate a detailed grade report with class comparisons and progress charts
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default StudentStats;
