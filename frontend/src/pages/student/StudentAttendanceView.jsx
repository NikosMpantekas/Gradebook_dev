import React, { useState, useEffect, useMemo } from 'react';
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
import { AttendanceMonthlyCalendar } from '../../components/AttendanceMonthlyCalendar';

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
    fetchAttendanceData();
  }, [selectedMonth]);

  // The controller's $project removes classId and unwinds 'class' as a scalar object (not array).
  // So we match against record.class._id.
  const filteredAttendance = useMemo(() => {
    if (!selectedClass) return attendanceData;
    const targetId = String(selectedClass._id);
    return attendanceData.filter(record => {
      const recordClassId = record.class?._id ? String(record.class._id) : null;
      return recordClassId === targetId;
    });
  }, [attendanceData, selectedClass]);

  // Calculate stats whenever filteredAttendance changes
  useEffect(() => {
    calculateStats(filteredAttendance);
  }, [filteredAttendance]);

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
        // Default to 'all' attendance information
        setSelectedClass(null);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // Always fetch ALL attendance for the month to allow instant switching
      const response = await axios.get(
        `${API_URL}/api/attendance/student/${user._id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        config
      );

      if (response.data && response.data.attendance) {
        setAttendanceData(Array.isArray(response.data.attendance) ? response.data.attendance : []);
      } else {
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

  const calculateStats = (recordsToCalculate) => {
    if (!recordsToCalculate.length) {
      setStats({
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        attendanceRate: 0
      });
      return;
    }

    const validRecords = recordsToCalculate.filter(record => record && record.status);
    const totalSessions = validRecords.length;
    const presentSessions = validRecords.filter(record => record.status === 'present' || record.status === 'late').length;
    const absentSessions = validRecords.filter(record => record.status === 'absent').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

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

  const StatsCard = ({ title, value, icon: Icon, colorClass, subValue }) => (
    <div className="overflow-hidden relative rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex items-center justify-between space-x-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">{title}</p>
          <div className="flex items-baseline space-x-1.5">
            <h3 className="text-xl font-black tracking-tight">{value}</h3>
            {subValue && <span className="text-[10px] font-bold text-muted-foreground truncate">{subValue}</span>}
          </div>
        </div>
        <div className={`p-2 rounded-xl ${colorClass.replace('bg-', 'bg-').replace('-500', '/10')} text-${colorClass.split('-')[1]}-500 shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-wide text-foreground">
            {t('attendance.myAttendance')}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            {t('attendance.viewAttendanceHistory')}
          </p>
        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection */}
        <Card className="lg:col-span-1 border-none shadow-none bg-transparent">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-[10px] uppercase font-black tracking-[.2em]">{t('navigation.classes')}</span>
            </div>
          </div>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-[88px] w-full bg-muted/40 rounded-2xl border border-border/10" />
                    <div className="h-[20px] w-24 bg-muted/40 rounded mx-1" />
                    <div className="space-y-3">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="h-[76px] w-full bg-muted/20 rounded-2xl border border-border/10" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedClass(null)}
                      className={`w-full group relative flex items-center p-5 rounded-2xl transition-all duration-300 border ${selectedClass === null
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02] z-10'
                        : 'bg-card border-border/40 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                    >
                      <div className="flex-1 text-left min-w-0 flex items-center space-x-4">
                        <TrendingUp className={`h-5 w-5 ${selectedClass === null ? 'text-primary-foreground' : 'text-primary'}`} />
                        <div>
                          <div className={`font-bold text-base tracking-tight truncate ${selectedClass === null ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {t('attendance.allAttendance')}
                          </div>
                          <div className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-60 ${selectedClass === null ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {t('attendance.comprehensiveView')}
                          </div>
                        </div>
                      </div>
                      <div className={`ml-4 transition-all duration-300 ${selectedClass === null ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:scale-110'}`}>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </button>



                    <div className="space-y-2">
                      {classes.map((classItem) => {
                        const isActive = selectedClass?._id === classItem._id;
                        return (
                          <button
                            key={classItem._id}
                            onClick={() => setSelectedClass(classItem)}
                            className={`w-full group relative flex items-center p-4 rounded-2xl transition-all duration-300 border ${isActive
                              ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02] z-10'
                              : 'bg-card border-border/40 hover:border-primary/40 hover:bg-primary/5'
                              }`}
                          >
                            <div className="flex-1 text-left min-w-0">
                              <div className={`font-bold text-sm tracking-tight truncate ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                                {classItem.subject || classItem.name}
                              </div>
                              {classItem.subject && classItem.subject !== classItem.name && (
                                <div className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-60 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                  {classItem.name}
                                </div>
                              )}
                            </div>
                            <div className={`ml-4 transition-all duration-300 ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:scale-110'}`}>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Stats Overview in Sidebar */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[.2em] px-1 flex items-center space-x-2">
                  <div className="w-1.5 h-[1px] bg-border" />
                  <span>{t('attendance.overview')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <StatsCard
                    title={t('attendance.totalSessions')}
                    value={stats.totalSessions}
                    icon={Calendar}
                    colorClass="bg-blue-500"
                  />
                  <StatsCard
                    title={t('attendance.attendedSessions')}
                    value={stats.presentSessions}
                    icon={CheckCircle2}
                    colorClass="bg-green-500"
                    subValue={stats.totalSessions > 0 ? `${Math.round((stats.presentSessions / stats.totalSessions) * 100)}%` : '0%'}
                  />
                  <StatsCard
                    title={t('attendance.missedSessions')}
                    value={stats.absentSessions}
                    icon={XCircle}
                    colorClass="bg-red-500"
                    subValue={stats.totalSessions > 0 ? `${Math.round((stats.absentSessions / stats.totalSessions) * 100)}%` : '0%'}
                  />
                  <StatsCard
                    title={t('attendance.attendanceRate')}
                    value={`${stats.attendanceRate}%`}
                    icon={TrendingUp}
                    colorClass="bg-amber-500"
                  />
                </div>
              </div>
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
              <div className="w-full h-[400px] bg-muted/10 rounded-2xl border border-border/10 flex flex-col p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="h-10 w-48 bg-muted/30 rounded-xl" />
                  <div className="h-10 w-32 bg-muted/30 rounded-xl" />
                </div>
                <div className="grid grid-cols-7 gap-4 flex-1">
                  {Array.from({ length: 28 }, (_, i) => (
                    <div key={i} className="bg-muted/20 rounded-xl shadow-inner border border-border/5" />
                  ))}
                </div>
              </div>
            ) : (
              <AttendanceMonthlyCalendar attendanceRecords={filteredAttendance} />
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
              <span>{t('attendance.detailedSessionHistory')} {selectedClass ? selectedClass.name : t('attendance.allClasses')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-muted/20">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-muted/40 rounded-xl" />
                      <div>
                        <div className="h-4 w-48 bg-muted/40 rounded mb-2" />
                        <div className="h-3 w-32 bg-muted/30 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-20 bg-muted/40 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttendance.length > 0 ? (
                  filteredAttendance
                    .filter(session => {
                      const sessionDate = session.date || session.session?.scheduledStartAt || session.session?.date;
                      return sessionDate;
                    })
                    .sort((a, b) => new Date(b.date || b.session?.date) - new Date(a.date || a.session?.date))
                    .map((session, index) => {
                      const isPresent = session.status === 'present' || session.status === 'late';
                      const isLate = session.status === 'late';

                      return (
                        <div key={index} className="group relative bg-card border border-border/40 rounded-3xl p-5 transition-all duration-300 hover:shadow-2xl hover:border-primary/20 hover:-translate-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <div className={`p-4 rounded-2xl ${isPresent ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'} transition-transform duration-300 group-hover:scale-110 shadow-inner`}>
                                {isPresent ? (
                                  isLate ? <Clock className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />
                                ) : (
                                  <XCircle className="h-6 w-6" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">
                                  {session.class?.subject || session.class?.name || '--'}
                                </h4>
                                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[.15em] text-muted-foreground">
                                  <span>
                                    {(() => {
                                      const sessionDate = session.date || session.session?.scheduledStartAt || session.session?.date;
                                      const parsedDate = safeParseDate(sessionDate);
                                      return parsedDate ? format(parsedDate, 'EEEE, MMM dd, yyyy') : 'Invalid Date';
                                    })()}
                                  </span>
                                  {session.session?.scheduledStartAt && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                      <span className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {format(new Date(session.session.scheduledStartAt), 'HH:mm')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-none border-border/10">
                              {session.note && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-muted/30 border-none px-3 py-1">
                                  {session.note}
                                </Badge>
                              )}
                              <Badge
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-none shadow-sm ${isPresent
                                  ? isLate ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                                  }`}
                              >
                                {t(`attendance.${session.status}`)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
