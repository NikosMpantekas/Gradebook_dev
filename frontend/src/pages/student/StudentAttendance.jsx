import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Calendar as CalendarIcon,
  UserCheck as PresentIcon,
  UserX as AbsentIcon,
  BarChart3 as StatsIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingIcon,
  Filter as FilterIcon
} from 'lucide-react';
import { AttendanceMonthlyCalendar } from '../../components/AttendanceMonthlyCalendar';

const StudentAttendance = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    presentSessions: 0,
    absentSessions: 0,
    attendanceRate: 0
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[StudentAttendance] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchStudentClasses();
    fetchAttendanceData();
  }, []);

  // Fetch attendance when month or class changes
  useEffect(() => {
    if (selectedClass || selectedMonth) {
      fetchAttendanceData();
    }
  }, [selectedMonth, selectedClass]);

  const fetchStudentClasses = async () => {
    try {
      logAction('Fetching student classes');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/classes/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClasses(response.data || []);
      logAction('Student classes fetched successfully', { count: response.data?.length });
    } catch (error) {
      logAction('Error fetching student classes', { error: error.message });
      toast.error(t('attendance.failedToLoadClasses'));
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      logAction('Fetching attendance data', { month: selectedMonth, classId: selectedClass });
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedClass) params.append('classId', selectedClass);
      
      const response = await axios.get(`/api/attendance/student?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data || {};
      setAttendanceRecords(data.attendanceRecords || []);
      setSessions(data.sessions || []);
      setStats(data.stats || {
        totalSessions: 0,
        attendedSessions: 0,
        attendanceRate: 0,
        missedSessions: 0
      });
      
      logAction('Attendance data fetched successfully', { 
        recordsCount: data.attendanceRecords?.length,
        sessionsCount: data.sessions?.length,
        stats: data.stats
      });
    } catch (error) {
      logAction('Error fetching attendance data', { error: error.message });
      toast.error(t('attendance.failedToLoadAttendance'));
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForDate = (date) => {
    return (attendanceRecords || []).filter(record => 
      format(new Date(record.session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getAttendanceStatus = (date) => {
    const dayRecords = getAttendanceForDate(date);
    if ((dayRecords || []).length === 0) return 'no-session';
    
    const presentCount = (dayRecords || []).filter(record => record.status === 'present').length;
    const absentCount = (dayRecords || []).filter(record => record.status === 'absent').length;
    
    if (absentCount > 0) return 'absent';
    if (presentCount > 0) return 'present';
    return 'no-session';
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(new Date(selectedMonth + '-01'));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(session => {
      if (!selectedClass || selectedClass === 'all') return true;
      return session.classId === selectedClass;
    });
  }, [sessions, selectedClass]);

  if (loading && (attendanceRecords || []).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // Error boundary for debugging
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Student Attendance</h2>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                fetchStudentClasses();
              }} 
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('attendance.myAttendanceTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('attendance.studentDescription')}
        </p>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {t('attendance.calendar')}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            {t('attendance.sessions')}
          </TabsTrigger>
        </TabsList>


        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-64 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                      {t('common.class')}
                    </Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-full bg-muted/20 border-border/50">
                        <SelectValue placeholder={t('attendance.allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('attendance.allClasses')}</SelectItem>
                        {(classes || []).map((cls) => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                         <div className="text-[10px] font-bold text-green-500 uppercase tracking-tight mb-1">{t('attendance.present')}</div>
                         <div className="text-xl font-bold">{stats.attendedSessions || stats.presentSessions || 0}</div>
                      </div>
                      <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                         <div className="text-[10px] font-bold text-red-500 uppercase tracking-tight mb-1">{t('attendance.absent')}</div>
                         <div className="text-xl font-bold">{stats.missedSessions || stats.absentSessions || 0}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex-1">
              <AttendanceMonthlyCalendar attendanceRecords={attendanceRecords} />
            </div>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('attendance.sessionHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {(filteredSessions || []).length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('attendance.noSessionsFound')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(filteredSessions || []).map((session) => {
                    const attendance = (attendanceRecords || []).find(record => record.sessionId === session._id);
                    
                    return (
                      <div key={session._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{session.title}</h3>
                          <p className="text-xs font-bold uppercase tracking-widest text-primary mt-1">
                            {attendance?.session?.classId?.subject || session.subject || '--'} • {format(new Date(session.date), 'PPP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {attendance ? (
                            <Badge variant={attendance.status === 'present' ? 'default' : 'destructive'}>
                              {attendance.status === 'present' ? (
                                <>
                                  <PresentIcon className="w-3 h-3 mr-1" />
                                  {t('attendance.present')}
                                </>
                              ) : (
                                <>
                                  <AbsentIcon className="w-3 h-3 mr-1" />
                                  {t('attendance.absent')}
                                </>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {t('attendance.notMarked')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentAttendance;
