import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { getDateLocale } from '../../utils/dateLocale';
import { 
  BarChart3, 
  BookOpen, 
  Calendar, 
  Printer,
  TrendingUp,
  Users,
  User,
  School,
  Shield,
  AlertTriangle,
  ClipboardList,
  TrendingDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { DatePicker } from '../../components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Spinner } from '../../components/ui/spinner';
import { useTranslation } from 'react-i18next';

const StudentStats = () => {
  const { t } = useTranslation();
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

  const getToken = () => {
    if (user?.token) return user.token;
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) return parsed.token;
      }
    } catch (err) {
      console.error('Error getting auth token:', err);
    }
    return localStorage.getItem('token') || '';
  };

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      setError('');
      const token = getToken();
      
      const endpoint = user?.role === 'teacher' 
        ? `${API_URL}/api/users/teacher-students`
        : `${API_URL}/api/users/students`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStudents(response.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchGradesData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      
      const response = await axios.get(`${API_URL}/api/grades/student-period-analysis`, {
        params: {
          studentId: selectedStudent,
          startDate: startDate,
          endDate: endDate
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGradesData(response.data);
    } catch (err) {
      console.error('Error fetching grades data:', err);
      setError('Failed to load grades data');
      setGradesData(null);
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = () => {
    if (user?.role === 'admin') {
      return {
        icon: <Shield className="h-5 w-5 text-primary" />,
        title: t('student.adminStudentAnalysis'),
        description: t('student.detailedAnalysis')
      };
    } else {
      return {
        icon: <School className="h-5 w-5 text-primary" />,
        title: t('student.studentGradeAnalysis'),
        description: t('student.detailedAnalysis')
      };
    }
  };

  const prepareChartData = (subjectGrades) => {
    return subjectGrades.map((grade, index) => ({
      index: index + 1,
      grade: grade.value,
      date: new Date(grade.date).toLocaleDateString(getDateLocale()),
      timestamp: new Date(grade.date).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp);
  };

  const handlePrintReport = () => {
    if (!selectedStudent || !startDate || !endDate) {
      alert(t('student.selectStudentAndDate'));
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
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">
          {roleInfo.title}
        </h1>
        <p className="text-muted-foreground">
          {roleInfo.description}
        </p>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="student">{t('student.selectStudent')}</Label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
                disabled={studentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('student.chooseStudent')} />
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
            
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{t('student.startDate')}</Label>
              <DatePicker
                placeholder={t('student.startDate')}
                value={startDate}
                onChange={setStartDate}
                disabled={!selectedStudent}
                max={endDate || new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{t('student.endDate')}</Label>
              <DatePicker
                placeholder={t('student.endDate')}
                value={endDate}
                onChange={setEndDate}
                disabled={!selectedStudent || !startDate}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
          </div>

          {selectedStudent && startDate && endDate && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                {t('student.printReport')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      )}

      {/* Grades Analysis Content */}
      {gradesData && (
        <div id="printable-content" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold">{t('student.gradeAnalysisReport')}</h3>
                <p className="text-lg font-semibold text-primary">{selectedStudentData?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('student.dateRange')}: {startDate ? new Date(startDate).toLocaleDateString(getDateLocale()) : 'N/A'} - {endDate ? new Date(endDate).toLocaleDateString(getDateLocale()) : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {gradesData.subjectAnalysis && Object.keys(gradesData.subjectAnalysis).length > 0 ? (
            Object.entries(gradesData.subjectAnalysis).map(([subjectName, subjectData]) => (
              <Card key={subjectName}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span>{subjectName}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {subjectData.studentAverage?.toFixed(1) || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('student.studentAverage')}</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {subjectData.classAverage?.toFixed(1) || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('student.classAverage')}</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {subjectData.grades?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('student.totalGrades')}</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-center">
                      <Badge 
                        variant={subjectData.studentAverage >= subjectData.classAverage ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {subjectData.studentAverage >= subjectData.classAverage ? t('student.aboveAverage') : t('student.belowAverage')}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Graph for multiple grades */}
                  {subjectData.grades && subjectData.grades.length > 1 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        {t('student.gradeProgressOverTime')}
                      </h4>
                      <div className="h-64 border rounded-md p-4 bg-card">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prepareChartData(subjectData.grades)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value) => [value, t('student.grade')]}
                              labelFormatter={(label) => `${t('student.date')}: ${label}`}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="grade" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                              name={t('student.grade')}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Grades Table */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      {t('student.allGrades')}
                    </h4>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900">
                            <TableHead>{t('student.date')}</TableHead>
                            <TableHead>{t('student.grade')}</TableHead>
                            <TableHead>{t('student.description')}</TableHead>
                            <TableHead>{t('student.teacher')}</TableHead>
                            <TableHead>{t('student.vsClassAvg')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectData.grades?.map((grade, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs">
                                                                {new Date(grade.date).toLocaleDateString(getDateLocale())}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={grade.value >= subjectData.classAverage ? 'default' : grade.value >= subjectData.classAverage * 0.8 ? 'secondary' : 'destructive'}
                                >
                                  {grade.value}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {grade.description || '-'}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {grade.teacher?.name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={grade.value >= subjectData.classAverage ? 'default' : 'secondary'}
                                  className="text-xs flex items-center w-fit gap-1"
                                >
                                  {grade.value >= subjectData.classAverage ? (
                                    <>
                                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                                      <span>{t('student.above')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <TrendingDown className="h-3 w-3 text-destructive" />
                                      <span>{t('student.below')}</span>
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-6">
                                {t('student.noGradesForPeriod')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground space-y-1">
                <h4 className="font-semibold text-base">
                  {t('student.noGradesFoundPeriod')}
                </h4>
                <p className="text-xs">
                  {t('student.tryDifferentPeriod')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Selection Prompt */}
      {!selectedStudent || !startDate || !endDate ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <div>
              <h3 className="font-semibold text-base text-foreground">
                {t('student.selectForAnalysis')}
              </h3>
              <p className="text-xs mt-1">
                {t('student.chooseForReport')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default StudentStats;
