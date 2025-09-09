import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';

const StudentAttendanceView = () => {
  const { t } = useTranslation();
  const { user, token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    presentSessions: 0,
    absentSessions: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      fetchAttendanceData();
      calculateStats();
    }
  }, [selectedMonth, selectedClass, classes]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      
      const response = await axios.get(`${API_URL}/api/classes/my-classes`, config);
      
      if (response.data) {
        // Handle both possible response formats
        const classData = response.data.classes || response.data;
        const classList = Array.isArray(classData) ? classData : [];
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(classList[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      
      const response = await axios.get(
        `${API_URL}/api/attendance/student/${user._id}?classId=${selectedClass._id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        config
      );
      
      if (response.data && response.data.attendance) {
        setAttendanceData(response.data.attendance);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error(t('attendance.failedToLoadAttendance'));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!attendanceData.length) {
      setStats({
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        attendanceRate: 0
      });
      return;
    }

    const totalSessions = attendanceData.length;
    const presentSessions = attendanceData.filter(record => record.status === 'present').length;
    const absentSessions = totalSessions - presentSessions;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    setStats({
      totalSessions,
      presentSessions,
      absentSessions,
      attendanceRate
    });
  };

  const getAttendanceForDay = (date) => {
    return attendanceData.find(record => 
      record.session && isSameDay(parseISO(record.session.scheduledStartAt), date)
    );
  };

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    });
  };

  const getAttendanceColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'absent':
        return <XCircle className="w-4 h-4" />;
      case 'late':
        return <Clock className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const navigateMonth = (direction) => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('attendance.myAttendance')}
        </h1>
        <p className="text-gray-600">
          {t('attendance.viewAttendanceHistory')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('attendance.totalSessions')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('attendance.attendedSessions')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.presentSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('attendance.missedSessions')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.absentSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('attendance.attendanceRate')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>{t('common.classes')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {classes.map((classItem) => (
                <Button
                  key={classItem._id}
                  variant={selectedClass?._id === classItem._id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedClass(classItem)}
                >
                  <div className="text-left">
                    <div className="font-medium">{classItem.name}</div>
                    <div className="text-sm opacity-75">
                      {classItem.subject} - {classItem.schoolBranch}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{t('attendance.monthlyCalendar')}</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[200px] text-center">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {selectedClass ? 
                `${t('attendance.attendanceFor')} ${selectedClass.name}` : 
                t('attendance.selectClassToView')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedClass ? (
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-medium text-gray-600 p-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {getDaysInMonth().map((date) => {
                  const attendance = getAttendanceForDay(date);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`
                        min-h-[60px] p-2 border rounded-md relative
                        ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      `}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {format(date, 'd')}
                      </div>
                      {attendance && (
                        <Badge
                          className={`absolute bottom-1 left-1 text-xs ${getAttendanceColor(attendance.status)}`}
                        >
                          {getAttendanceIcon(attendance.status)}
                          <span className="ml-1">{t(`attendance.${attendance.status}`)}</span>
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {t('attendance.selectClassToViewCalendar')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      {selectedClass && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>{t('attendance.detailedSessionHistory')} {selectedClass.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceData.length > 0 ? (
                attendanceData.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {session.status === 'present' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{format(parseISO(session.date), 'EEEE, MMM dd, yyyy')}</p>
                        {session.note && (
                          <p className="text-sm text-gray-500">{session.note}</p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={session.status === 'present' ? 'default' : 'destructive'}
                      className={session.status === 'present' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {session.status === 'present' ? t('attendance.present') : t('attendance.absent')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {loading ? t('common.loading') : t('attendance.noAttendanceData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentAttendanceView;
