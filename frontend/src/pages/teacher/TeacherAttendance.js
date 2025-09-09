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
import { Checkbox } from '../../components/ui/checkbox';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Plus as AddIcon,
  Users as UsersIcon,
  UserCheck as PresentIcon,
  UserX as AbsentIcon,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Save as SaveIcon,
  Search as SearchIcon
} from 'lucide-react';

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeSession, setActiveSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[TeacherAttendance] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  // Fetch teacher's classes on component mount
  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  // Fetch sessions and students when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSessions();
      fetchClassStudents();
    }
  }, [selectedClass, selectedDate]);

  const fetchTeacherClasses = async () => {
    setLoading(true);
    try {
      logAction('Fetching teacher classes');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/classes/teacher', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClasses(response.data || []);
      if (response.data?.length > 0) {
        setSelectedClass(response.data[0]._id);
      }
      logAction('Teacher classes fetched successfully', { count: response.data?.length });
    } catch (error) {
      logAction('Error fetching teacher classes', { error: error.message });
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      logAction('Fetching sessions', { classId: selectedClass, date: selectedDate });
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/sessions?classId=${selectedClass}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSessions(response.data || []);
      logAction('Sessions fetched successfully', { count: response.data?.length });
    } catch (error) {
      logAction('Error fetching sessions', { error: error.message });
      toast.error(t('attendance.failedToLoadSessions'));
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClass) return;
    
    try {
      logAction('Fetching class students', { classId: selectedClass });
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/classes/${selectedClass}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStudents(response.data || []);
      logAction('Class students fetched successfully', { count: response.data?.length });
    } catch (error) {
      logAction('Error fetching class students', { error: error.message });
      toast.error(t('attendance.failedToLoadStudents'));
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim() || !selectedClass) {
      toast.error(t('attendance.sessionTitleRequired'));
      return;
    }

    try {
      logAction('Creating session', { title: newSessionTitle, classId: selectedClass });
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/sessions', {
        title: newSessionTitle,
        classId: selectedClass,
        date: selectedDate,
        status: 'active'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSessions(prev => [...prev, response.data]);
      setActiveSession(response.data);
      setNewSessionTitle('');
      setShowCreateSession(false);
      
      // Initialize attendance data for all students
      const initialAttendance = {};
      students.forEach(student => {
        initialAttendance[student._id] = false;
      });
      setAttendanceData(initialAttendance);
      
      toast.success(t('attendance.sessionCreated'));
      logAction('Session created successfully', { sessionId: response.data._id });
    } catch (error) {
      logAction('Error creating session', { error: error.message });
      toast.error(t('attendance.failedToCreateSession'));
    }
  };

  const markAttendance = async (sessionId) => {
    if (!sessionId || Object.keys(attendanceData).length === 0) {
      toast.error(t('attendance.noAttendanceData'));
      return;
    }

    setLoading(true);
    try {
      logAction('Marking attendance', { sessionId, attendanceData });
      const token = localStorage.getItem('token');
      
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, isPresent]) => ({
        studentId,
        sessionId,
        status: isPresent ? 'present' : 'absent',
        markedAt: new Date().toISOString()
      }));

      await axios.post('/api/attendance/bulk', {
        sessionId,
        attendanceRecords
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(t('attendance.attendanceMarked'));
      logAction('Attendance marked successfully', { sessionId, recordCount: attendanceRecords.length });
      
      // Refresh sessions to update attendance counts
      fetchSessions();
    } catch (error) {
      logAction('Error marking attendance', { error: error.message });
      toast.error(t('attendance.failedToMarkAttendance'));
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentAttendance = (studentId) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAllPresent = () => {
    const allPresent = {};
    students.forEach(student => {
      allPresent[student._id] = true;
    });
    setAttendanceData(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent = {};
    students.forEach(student => {
      allAbsent[student._id] = false;
    });
    setAttendanceData(allAbsent);
  };

  const startSession = (session) => {
    setActiveSession(session);
    
    // Initialize attendance data if not already loaded
    if (Object.keys(attendanceData).length === 0) {
      const initialAttendance = {};
      students.forEach(student => {
        initialAttendance[student._id] = false;
      });
      setAttendanceData(initialAttendance);
    }
    
    logAction('Session started', { sessionId: session._id });
  };

  const presentCount = Object.values(attendanceData).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  if (loading && sessions.length === 0 && classes.length === 0) {
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
          {t('attendance.teacherTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('attendance.teacherDescription')}
        </p>
      </div>

      {/* Class and Date Selection */}
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
              <Button onClick={() => setShowCreateSession(true)} className="w-full">
                <AddIcon className="w-4 h-4 mr-2" />
                {t('attendance.createSession')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {sessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {t('attendance.todaySessions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(sessions || []).map((session) => (
                <div key={session._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{session.title}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.createdAt), 'HH:mm')} • 
                      <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                        {t(`attendance.status.${session.status}`)}
                      </Badge>
                    </p>
                  </div>
                  <Button
                    variant={activeSession?._id === session._id ? 'default' : 'outline'}
                    onClick={() => startSession(session)}
                  >
                    {activeSession?._id === session._id ? t('attendance.activeSession') : t('attendance.startSession')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Marking */}
      {activeSession && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PresentIcon className="w-5 h-5" />
                {t('attendance.markAttendance')} - {activeSession.title}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  {t('attendance.markAllPresent')}
                </Button>
                <Button variant="outline" size="sm" onClick={markAllAbsent}>
                  {t('attendance.markAllAbsent')}
                </Button>
              </div>
            </CardTitle>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <PresentIcon className="w-4 h-4 text-green-500" />
                {t('attendance.present')}: {presentCount}
              </span>
              <span className="flex items-center gap-1">
                <AbsentIcon className="w-4 h-4 text-red-500" />
                {t('attendance.absent')}: {absentCount}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {(students || []).map((student) => (
                <div key={student._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={attendanceData[student._id] ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleStudentAttendance(student._id)}
                      className={attendanceData[student._id] ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {attendanceData[student._id] ? (
                        <>
                          <PresentIcon className="w-4 h-4 mr-1" />
                          {t('attendance.present')}
                        </>
                      ) : (
                        <>
                          <AbsentIcon className="w-4 h-4 mr-1" />
                          {t('attendance.absent')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => markAttendance(activeSession._id)}
                disabled={loading}
                size="lg"
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                {loading ? t('common.saving') : t('attendance.saveAttendance')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Session Message */}
      {!activeSession && selectedClass && students.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('attendance.noActiveSession')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('attendance.createOrSelectSession')}
            </p>
            <Button onClick={() => setShowCreateSession(true)}>
              <AddIcon className="w-4 h-4 mr-2" />
              {t('attendance.createSession')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('attendance.createNewSession')}</DialogTitle>
            <DialogDescription>
              {t('attendance.createSessionDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="session-title">{t('attendance.sessionTitle')}</Label>
              <Input
                id="session-title"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder={t('attendance.sessionTitlePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSession(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={createSession}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAttendance;
