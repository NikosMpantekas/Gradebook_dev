import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isValid } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';

const StudentAttendanceView = () => {
  const { t } = useTranslation();
  const { user, token } = useSelector((state) => state.auth);
  
  // Add CSS animation keyframes
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes popover-show {
        0% {
          opacity: 0;
          transform: scale(0.85) translateY(15px) translateZ(0);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.02) translateY(-2px) translateZ(0);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0) translateZ(0);
        }
      }
      
      @keyframes day-pulse {
        0% {
          transform: scale(1) translateZ(0);
        }
        50% {
          transform: scale(1.05) translateZ(0);
        }
        100% {
          transform: scale(1) translateZ(0);
        }
      }
      
      /* Mobile-specific touch improvements */
      @media (hover: none) and (pointer: coarse) {
        .calendar-day:active {
          transform: scale(0.96) translateY(1px) translateZ(0) !important;
          transition: transform 0.1s ease-out;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Helper function to safely parse and validate dates
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed) ? parsed : null;
    } catch (error) {
      console.warn('Invalid date string:', dateString, error);
      return null;
    }
  };

  // Localized day abbreviations (Monday first)
  const getDayAbbreviations = () => {
    return [
      t('calendar.days.mon') || 'M', 
      t('calendar.days.tue') || 'T',
      t('calendar.days.wed') || 'W',
      t('calendar.days.thu') || 'T',
      t('calendar.days.fri') || 'F',
      t('calendar.days.sat') || 'S',
      t('calendar.days.sun') || 'S'
    ];
  };

  // Localized month names
  const getLocalizedMonthName = (monthIndex) => {
    const monthKeys = [
      'calendar.months.january', 'calendar.months.february', 'calendar.months.march', 
      'calendar.months.april', 'calendar.months.may', 'calendar.months.june',
      'calendar.months.july', 'calendar.months.august', 'calendar.months.september', 
      'calendar.months.october', 'calendar.months.november', 'calendar.months.december'
    ];
    return t(monthKeys[monthIndex]) || new Date(2000, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' });
  };
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedDateAttendance, setSelectedDateAttendance] = useState(null);
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
    }
  }, [selectedMonth, selectedClass, classes]);

  // Calculate stats whenever attendanceData changes
  useEffect(() => {
    calculateStats();
  }, [attendanceData]);

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
    if (!selectedClass) {
      setAttendanceData([]);
      return;
    }
    
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      
      console.log('Fetching attendance data:', {
        classId: selectedClass._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await axios.get(
        `${API_URL}/api/attendance/student/${user._id}?classId=${selectedClass._id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        config
      );
      
      console.log('Attendance response:', response.data);
      
      if (response.data && response.data.attendance) {
        const attendanceArray = Array.isArray(response.data.attendance) ? response.data.attendance : [];
        console.log('Setting attendance data:', attendanceArray);
        setAttendanceData(attendanceArray);
      } else {
        console.log('No attendance data found, setting empty array');
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceData([]);
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

    // Filter out invalid records first
    const validRecords = attendanceData.filter(record => {
      return record && record.status && typeof record.status === 'string';
    });

    const totalSessions = validRecords.length;
    
    // Count different statuses
    const presentSessions = validRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length; // Late counts as attended
    
    const absentSessions = validRecords.filter(record => 
      record.status === 'absent'
    ).length;
    
    // Calculate attendance rate based on present + late vs total
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    console.log('Stats calculation:', {
      totalRecords: attendanceData.length,
      validRecords: validRecords.length,
      statuses: validRecords.map(r => r.status),
      presentSessions,
      absentSessions,
      attendanceRate
    });

    setStats({
      totalSessions,
      presentSessions,
      absentSessions,
      attendanceRate
    });
  };

  const getAttendanceForDay = (date) => {
    return attendanceData.find(record => {
      if (!record.session) return false;
      
      // Try different possible date fields
      const sessionDate = record.session.scheduledStartAt || record.session.date || record.date;
      const parsedDate = safeParseDate(sessionDate);
      
      return parsedDate && isSameDay(parsedDate, date);
    });
  };

  const getDaysInMonth = () => {
    const firstDay = startOfMonth(selectedMonth);
    const lastDay = endOfMonth(selectedMonth);
    
    // Get first day of month and adjust for Monday-first week
    const firstDayIndex = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    const daysInMonth = lastDay.getDate();
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day));
    }
    
    return days;
  };

  const getAttendanceColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-100 border-green-300 dark:border-green-400 shadow-sm dark:shadow-green-400/20';
      case 'absent':
        return 'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-100 border-red-300 dark:border-red-400 shadow-sm dark:shadow-red-400/20';
      case 'late':
        return 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-100 border-yellow-300 dark:border-yellow-400 shadow-sm dark:shadow-yellow-400/20';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-500 shadow-sm dark:shadow-gray-400/20';
    }
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'absent':
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'late':
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
      default:
        return <Eye className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const navigateMonth = (direction) => {
    setSelectedMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const handleDayClick = (date, attendance) => {
    if (attendance) {
      setSelectedDateAttendance({ date, attendance });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('attendance.myAttendance')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('attendance.viewAttendanceHistory')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 min-h-[88px] flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2 w-full">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-[20px] w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-[32px] w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('attendance.totalSessions')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalSessions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 min-h-[88px] flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2 w-full">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-[20px] w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-[32px] w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('attendance.attendedSessions')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.presentSessions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 min-h-[88px] flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2 w-full">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-[20px] w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-[32px] w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('attendance.missedSessions')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.absentSessions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 min-h-[88px] flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2 w-full">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-[20px] w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-[32px] w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('attendance.attendanceRate')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.attendanceRate}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>{t('navigation.classes')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                // Loading skeleton for classes
                Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))
              ) : (
                classes.map((classItem) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span className="hidden sm:inline">{t('attendance.monthlyCalendar')}</span>
                <span className="sm:hidden">Calendar</span>
              </CardTitle>
              <div className="flex items-center justify-center space-x-2 min-w-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(-1)}
                  className="shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm sm:text-lg font-semibold flex-1 text-center px-1 sm:px-2 min-w-0">
                  <span className="hidden sm:inline">{getLocalizedMonthName(selectedMonth.getMonth())} {selectedMonth.getFullYear()}</span>
                  <span className="sm:hidden">{getLocalizedMonthName(selectedMonth.getMonth()).slice(0, 3)} {selectedMonth.getFullYear()}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(1)}
                  className="shrink-0"
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">{t('common.loading')}...</span>
              </div>
            ) : selectedClass ? (
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {getDayAbbreviations().map((day, index) => (
                  <div key={index} className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {getDaysInMonth().map((date, index) => {
                  if (!date) {
                    // Empty cell for padding
                    return <div key={`empty-${index}`} className="h-12" />;
                  }
                  
                  const attendance = getAttendanceForDay(date);
                  const isToday = isSameDay(date, new Date());
                  
                  return attendance ? (
                    <Popover key={date.toISOString()}>
                      <PopoverTrigger asChild>
                        <div
                          className={`
                            calendar-day
                            min-h-[60px] p-2 border rounded-md relative cursor-pointer
                            transition-all duration-300 ease-out transform-gpu
                            ${isToday 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }
                            hover:bg-gray-50 dark:hover:bg-gray-700
                            hover:shadow-xl hover:shadow-primary/30
                            hover:scale-[1.08] hover:-translate-y-2
                            active:scale-[0.98] active:translate-y-0 active:shadow-md
                            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                            will-change-transform
                          `}
                        >
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-50">
                            {format(date, 'd')}
                          </div>
                          <Badge
                            className={`absolute bottom-0.5 left-0.5 text-xs p-1 sm:p-1 sm:bottom-1 sm:left-1 font-medium min-h-[20px] sm:min-h-[18px] ${getAttendanceColor(attendance.status)}`}
                          >
                            <div className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center">
                              {getAttendanceIcon(attendance.status)}
                            </div>
                            <span className="ml-1 hidden sm:inline">{t(`attendance.${attendance.status}`)}</span>
                          </Badge>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-48 h-48 p-0 shadow-xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2" 
                        side="top" 
                        sideOffset={12}
                        align="center"
                        avoidCollisions={true}
                        collisionPadding={8}
                        style={{
                          transformOrigin: 'bottom center',
                          animation: 'popover-show 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div className="p-4 h-full flex flex-col justify-center items-center text-center space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">
                            {format(date, 'MMM d')}
                          </div>
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 flex items-center justify-center">
                              {attendance.status === 'present' ? (
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                              ) : attendance.status === 'absent' ? (
                                <XCircle className="w-8 h-8 text-red-600" />
                              ) : attendance.status === 'late' ? (
                                <Clock className="w-8 h-8 text-yellow-600" />
                              ) : (
                                <Eye className="w-8 h-8 text-gray-600" />
                              )}
                            </div>
                            <Badge className={`text-xs shadow-sm ${getAttendanceColor(attendance.status)}`}>
                              <span className="font-medium">{t(`attendance.${attendance.status}`)}</span>
                            </Badge>
                          </div>
                          {attendance.note && (
                            <div className="pt-2 border-t border-border/50 w-full">
                              <p className="text-xs text-muted-foreground mb-1">{t('attendance.note')}:</p>
                              <p className="text-xs text-foreground/90 leading-tight">{attendance.note}</p>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div
                      key={date.toISOString()}
                      className={`
                        min-h-[60px] p-2 border rounded-md relative transition-colors
                        ${isToday 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-50">
                        {format(date, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
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
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div>
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceData.length > 0 ? (
                  attendanceData
                    .filter(session => {
                      // Filter out sessions with completely invalid data
                      const sessionDate = session.date || session.session?.scheduledStartAt || session.session?.date;
                      return sessionDate; // Only include sessions that have some date field
                    })
                    .map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-center space-x-3">
                        {session.status === 'present' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          {(() => {
                            // Try different possible date fields
                            const sessionDate = session.date || session.session?.scheduledStartAt || session.session?.date;
                            const parsedDate = safeParseDate(sessionDate);
                            
                            return (
                              <p className="font-medium">
                                {parsedDate 
                                  ? format(parsedDate, 'EEEE, MMM dd, yyyy')
                                  : 'Invalid Date'
                                }
                              </p>
                            );
                          })()}
                          {session.note && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{session.note}</p>
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
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('attendance.noAttendanceData')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default StudentAttendanceView;
