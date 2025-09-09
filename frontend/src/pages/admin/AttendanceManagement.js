import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Plus as AddIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  UserCheck as AttendanceIcon,
  BarChart3 as ReportsIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  Download as DownloadIcon
} from 'lucide-react';

const AttendanceManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  // State management with proper initialization
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('sessions');
  const [attendanceData, setAttendanceData] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[AttendanceManagement] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch sessions when class or date changes
  useEffect(() => {
    if (selectedClass) {
      fetchSessions();
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      logAction('Fetching classes');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Classes API response:', response.data);
      
      // Ensure response.data is always an array
      const classesData = Array.isArray(response.data) ? response.data : [];
      setClasses(classesData);
      logAction('Classes fetched successfully', { count: classesData.length, data: classesData });
      
      if (classesData.length === 0) {
        console.warn('No classes found - this may indicate a database or permission issue');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      logAction('Error fetching classes', { error: error.message, stack: error.stack });
      setError(error.message);
      setClasses([]); // Ensure fallback to empty array
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    setError(null);
    try {
      logAction('Fetching sessions', { classId: selectedClass, date: selectedDate });
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/attendance/sessions', {
        headers: { Authorization: `Bearer ${token}` },
        params: { classId: selectedClass, date: selectedDate }
      });
      
      // Ensure response.data is always an array
      const sessionsData = Array.isArray(response.data) ? response.data : [];
      setSessions(sessionsData);
      logAction('Sessions fetched successfully', { count: sessionsData.length });
    } catch (error) {
      logAction('Error fetching sessions', { error: error.message });
      setError(error.message);
      setSessions([]); // Ensure fallback to empty array
      toast.error(t('attendance.failedToLoadSessions'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceReports = async () => {
    setLoading(true);
    try {
      logAction('Fetching attendance reports');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure response.data is always an array
      const reportsData = Array.isArray(response.data) ? response.data : [];
      setReports(reportsData);
      logAction('Reports fetched successfully', { count: response.data?.length });
    } catch (error) {
      logAction('Error fetching reports', { error: error.message });
      toast.error(t('attendance.failedToLoadReports'));
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData) => {
    try {
      logAction('Creating session', sessionData);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/sessions', sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSessions(prev => [...(prev || []), response.data]);
      toast.success(t('attendance.sessionCreated'));
      logAction('Session created successfully', { sessionId: response.data._id });
    } catch (error) {
      logAction('Error creating session', { error: error.message });
      toast.error(t('attendance.failedToCreateSession'));
    }
  };

  const exportAttendanceReport = async () => {
    try {
      logAction('Exporting attendance report', { classId: selectedClass, date: selectedDate });
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/attendance/export', {
        params: { classId: selectedClass, date: selectedDate },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-report-${selectedDate}.xlsx`;
      link.click();
      
      toast.success(t('attendance.reportExported'));
      logAction('Report exported successfully');
    } catch (error) {
      logAction('Error exporting report', { error: error.message });
      toast.error(t('attendance.failedToExportReport'));
    }
  };

  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(session => 
      !selectedClass || selectedClass === 'all' || session.classId === selectedClass
    );
  }, [sessions, selectedClass]);

  if (loading && (sessions || []).length === 0) {
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
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Attendance</h2>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                fetchClasses();
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
          {t('attendance.managementTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('attendance.managementDescription')}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="class-select">{t('common.class')}</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder={t('attendance.selectClass')} />
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
            
            <div>
              <Label htmlFor="date-select">{t('common.date')}</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={exportAttendanceReport} variant="outline" className="mr-2">
                <DownloadIcon className="w-4 h-4 mr-2" />
                {t('attendance.exportReport')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {t('attendance.sessions')}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <AttendanceIcon className="w-4 h-4" />
            {t('attendance.attendance')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <ReportsIcon className="w-4 h-4" />
            {t('attendance.reports')}
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('attendance.sessionsManagement')}</h2>
            <Button onClick={() => navigate('/app/admin/attendance/create-session')}>
              <AddIcon className="w-4 h-4 mr-2" />
              {t('attendance.createSession')}
            </Button>
          </div>

          <div className="grid gap-4">
            {(filteredSessions || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('attendance.noSessions')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('attendance.noSessionsDescription')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              (filteredSessions || []).map((session) => (
                <Card key={session._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{session.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {session.className} • {format(new Date(session.date), 'PPP')}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                            {t(`attendance.status.${session.status}`)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {session.attendanceCount || 0} / {session.totalStudents || 0} {t('attendance.present')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/app/admin/attendance/session/${session._id}`)}
                      >
                        {t('common.view')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <h2 className="text-xl font-semibold">{t('attendance.attendanceOverview')}</h2>
          {/* Attendance overview content will be added here */}
          <Card>
            <CardContent className="p-8 text-center">
              <AttendanceIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('attendance.attendanceOverviewComingSoon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('attendance.reportsOverview')}</h2>
            <Button onClick={fetchAttendanceReports} variant="outline">
              {t('common.refresh')}
            </Button>
          </div>
          {/* Reports content will be added here */}
          <Card>
            <CardContent className="p-8 text-center">
              <ReportsIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('attendance.reportsComingSoon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceManagement;
