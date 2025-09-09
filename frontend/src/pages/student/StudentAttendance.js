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

const StudentAttendance = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalSessions: 0,
    attendedSessions: 0,
    attendanceRate: 0,
    missedSessions: 0
  });

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
    return attendanceRecords.filter(record => 
      format(new Date(record.session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getAttendanceStatus = (date) => {
    const dayRecords = getAttendanceForDate(date);
    if (dayRecords.length === 0) return 'no-session';
    
    const presentCount = dayRecords.filter(record => record.status === 'present').length;
    const absentCount = dayRecords.filter(record => record.status === 'absent').length;
    
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
    return sessions.filter(session => {
      if (!selectedClass) return true;
      return session.classId === selectedClass;
    });
  }, [sessions, selectedClass]);

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class-select">{t('common.class')}</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder={t('attendance.allClasses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('attendance.allClasses')}</SelectItem>
                  {(classes || []).map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="month-select">{t('common.month')}</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('attendance.totalSessions')}
                </p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('attendance.attendedSessions')}
                </p>
                <p className="text-2xl font-bold text-green-600">{stats.attendedSessions}</p>
              </div>
              <PresentIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('attendance.missedSessions')}
                </p>
                <p className="text-2xl font-bold text-red-600">{stats.missedSessions}</p>
              </div>
              <AbsentIcon className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('attendance.attendanceRate')}
                </p>
                <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
              </div>
              <TrendingIcon className={`w-8 h-8 ${stats.attendanceRate >= 80 ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <StatsIcon className="w-4 h-4" />
            {t('attendance.overview')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {t('attendance.calendar')}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            {t('attendance.sessions')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('attendance.attendanceOverview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span>{t('attendance.totalSessions')}</span>
                  <Badge variant="outline">{stats.totalSessions}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="flex items-center gap-2">
                    <PresentIcon className="w-4 h-4 text-green-600" />
                    {t('attendance.attendedSessions')}
                  </span>
                  <Badge variant="default" className="bg-green-500">{stats.attendedSessions}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="flex items-center gap-2">
                    <AbsentIcon className="w-4 h-4 text-red-600" />
                    {t('attendance.missedSessions')}
                  </span>
                  <Badge variant="destructive">{stats.missedSessions}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="flex items-center gap-2">
                    <TrendingIcon className="w-4 h-4 text-blue-600" />
                    {t('attendance.attendanceRate')}
                  </span>
                  <Badge variant={stats.attendanceRate >= 80 ? 'default' : 'secondary'}>
                    {stats.attendanceRate}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('attendance.monthlyCalendar')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {(calendarDays || []).map((date) => {
                  const status = getAttendanceStatus(date);
                  const dayRecords = getAttendanceForDate(date);
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`
                        p-2 text-center rounded-lg border min-h-[60px] flex flex-col justify-center
                        ${status === 'present' ? 'bg-green-100 dark:bg-green-900/20 border-green-300' : ''}
                        ${status === 'absent' ? 'bg-red-100 dark:bg-red-900/20 border-red-300' : ''}
                        ${status === 'no-session' ? 'bg-gray-50 dark:bg-gray-800 border-gray-200' : ''}
                      `}
                    >
                      <div className="text-sm font-medium">{format(date, 'd')}</div>
                      {dayRecords.length > 0 && (
                        <div className="text-xs">
                          {status === 'present' && <PresentIcon className="w-3 h-3 mx-auto text-green-600" />}
                          {status === 'absent' && <AbsentIcon className="w-3 h-3 mx-auto text-red-600" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 rounded"></div>
                  <span>{t('attendance.present')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-200 rounded"></div>
                  <span>{t('attendance.absent')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 rounded"></div>
                  <span>{t('attendance.noSession')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('attendance.sessionHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('attendance.noSessionsFound')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(filteredSessions || []).map((session) => {
                    const attendance = attendanceRecords.find(record => record.sessionId === session._id);
                    
                    return (
                      <div key={session._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{session.title}</h3>
                          <p className="text-sm text-gray-500">
                            {session.className} • {format(new Date(session.date), 'PPP')}
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
