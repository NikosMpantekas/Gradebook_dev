import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';
import { AttendanceMonthlyCalendar } from '../../components/AttendanceMonthlyCalendar';

const StudentAttendanceView = () => {
  const { t } = useTranslation();
  const { user, token } = useSelector((state) => state.auth);

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

  const [initialLoading, setInitialLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
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
    const loadInitialData = async () => {
      setInitialLoading(true);
      await Promise.all([fetchClasses(), fetchAttendanceData(false)]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchAttendanceData(true);
    }
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
    }
  };

  const fetchAttendanceData = async (isBackground = false) => {
    try {
      if (isBackground) {
        setAttendanceLoading(true);
      }
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
      if (isBackground) {
        setAttendanceLoading(false);
      }
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

  const StatsCard = ({ title, value, icon: Icon, colorClass, subValue }) => {
    const iconStyle = {
      'bg-blue-500': { color: 'hsl(var(--info))' },
      'bg-green-500': { color: 'hsl(var(--success))' },
      'bg-red-500': { color: 'hsl(var(--error))' },
      'bg-amber-500': { color: 'hsl(var(--warning))' },
    }[colorClass] || { color: 'hsl(var(--primary))' };

    return (
      <Card className="transition-[box-shadow] hover:shadow-lg hover:shadow-primary/20 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4" style={iconStyle} />
        </CardHeader>
        <CardContent className="flex flex-col justify-center flex-1 pt-0">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {subValue && <span className="text-xs text-muted-foreground font-medium">{subValue}</span>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('attendance.myAttendance')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('attendance.viewAttendanceHistory')}
          </p>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>{t('navigation.classes')}</span>
            </CardTitle>
            <CardDescription>
              {t('attendance.selectClassToView')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                {initialLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[20px] w-24 mx-1" />
                    <div className="space-y-3">
                      {Array.from({ length: 3 }, (_, i) => (
                        <Skeleton key={i} className="h-[60px] w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedClass(null)}
                      className={`w-full group relative flex items-center p-4 rounded-lg transition-all duration-200 border ${selectedClass === null
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] hover:shadow-sm'
                        }`}
                    >
                      <div className="flex-1 text-left min-w-0 flex items-center space-x-4">
                        <TrendingUp className={`h-5 w-5 ${selectedClass === null ? 'text-primary-foreground' : 'text-primary'}`} />
                        <div>
                          <div className={`font-semibold text-sm truncate ${selectedClass === null ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {t('attendance.allAttendance')}
                          </div>
                          <div className={`text-[10px] uppercase font-medium mt-0.5 opacity-80 ${selectedClass === null ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {t('attendance.comprehensiveView')}
                          </div>
                        </div>
                      </div>
                      <div className={`ml-4 transition-all duration-200 ${selectedClass === null ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:scale-110'}`}>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>

                    <div className="space-y-2">
                      {classes.map((classItem) => {
                        const isActive = selectedClass?._id === classItem._id;
                        return (
                          <button
                            key={classItem._id}
                            onClick={() => setSelectedClass(classItem)}
                            className={`w-full group relative flex items-center p-3 rounded-lg transition-all duration-200 border ${isActive
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                              : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] hover:shadow-sm'
                              }`}
                          >
                            <div className="flex-1 text-left min-w-0">
                              <div className={`font-semibold text-sm truncate ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                                {classItem.subject || classItem.name}
                              </div>
                              {classItem.subject && classItem.subject !== classItem.name && (
                                <div className={`text-[10px] uppercase font-medium mt-0.5 opacity-80 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                  {classItem.name}
                                </div>
                              )}
                            </div>
                            <div className={`ml-4 transition-all duration-200 ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-hover:scale-110'}`}>
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
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground px-1">{t('attendance.overview')}</h3>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
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
          <CardContent className="p-6">
            {initialLoading ? (
              <div className="w-full flex flex-col space-y-6">
                {/* Header Skeleton */}
                <div className="grid grid-cols-[1fr_auto] gap-y-3 gap-x-4 border-b pb-4 items-center">
                  {/* 1. Title Skeleton */}
                  <div className="flex items-center gap-2 order-1">
                    <Skeleton className="h-6 w-48 bg-muted/30 rounded" />
                  </div>

                  {/* 2. Today Button Skeleton */}
                  <div className="order-2 justify-self-end">
                    <Skeleton className="h-9 w-24 bg-muted/30 rounded-2xl" />
                  </div>

                  {/* 3. Month/Year Skeleton */}
                  <div className="order-3 justify-self-start">
                    <Skeleton className="h-7 w-24 bg-muted/20 rounded-2xl" />
                  </div>

                  {/* 4. Arrows Skeleton */}
                  <div className="order-4 justify-self-end">
                    <Skeleton className="h-9 w-20 bg-muted/20 rounded-xl" />
                  </div>
                </div>
                {/* Calendar Grid Skeleton */}
                <div className="grid grid-cols-7 gap-4 flex-1 min-h-[300px]">
                  {Array.from({ length: 28 }, (_, i) => (
                    <div key={i} className="bg-muted/20 rounded-xl shadow-inner border border-border/5 h-12" />
                  ))}
                </div>
                {/* Mini Details List Skeleton */}
                <div className="pt-6 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-48 bg-muted/30 rounded" />
                    <Skeleton className="h-5 w-16 bg-muted/20 rounded-2xl" />
                  </div>
                  <div className="flex flex-col divide-y divide-border/30 max-h-[300px] overflow-hidden">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="flex items-center justify-between py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 bg-muted/30 rounded-full" />
                          <div className="flex items-baseline gap-2">
                            <Skeleton className="h-3.5 w-28 bg-muted/30 rounded" />
                            <Skeleton className="h-3 w-16 bg-muted/20 rounded" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-12 bg-muted/20 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <AttendanceMonthlyCalendar 
                  attendanceRecords={filteredAttendance} 
                  currentDate={selectedMonth}
                  setCurrentDate={setSelectedMonth}
                  selectedClass={selectedClass}
                />

                {/* Mini Details List */}
                <div className="pt-6 border-t border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>
                        {t('attendance.detailedSessionHistory')} — {format(selectedMonth, 'MMMM yyyy')}
                      </span>
                    </h4>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                      {filteredAttendance.length} {t('attendance.sessions')}
                    </Badge>
                  </div>

                  {filteredAttendance.length > 0 ? (
                    <div className="flex flex-col divide-y divide-border/30 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredAttendance
                        .filter(session => session.date || session.session?.scheduledStartAt || session.session?.date)
                        .sort((a, b) => new Date(b.date || b.session?.date) - new Date(a.date || a.session?.date))
                        .map((session, index) => {
                          const isPresent = session.status === 'present' || session.status === 'late';
                          const isLate = session.status === 'late';
                          const sessionDate = session.date || session.session?.scheduledStartAt || session.session?.date;
                          const parsedDate = safeParseDate(sessionDate);

                          return (
                            <div key={index} className="flex items-center justify-between py-3 px-2 hover:bg-muted/10 rounded-lg transition-colors gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0">
                                  {isPresent ? (
                                    isLate ? <Clock className="h-4 w-4" style={{ color: 'hsl(var(--warning))' }} /> : <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                                  ) : (
                                    <XCircle className="h-4 w-4" style={{ color: 'hsl(var(--error))' }} />
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 min-w-0">
                                  <h5 className="text-xs font-bold text-foreground truncate">
                                    {session.class?.subject || session.class?.name || '--'}
                                  </h5>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {parsedDate ? format(parsedDate, 'EEE, MMM dd') : ''}
                                    {session.session?.scheduledStartAt && ` • ${format(new Date(session.session.scheduledStartAt), 'HH:mm')}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {session.note && (
                                  <span className="text-[9px] bg-muted/50 border px-1.5 py-0.5 rounded text-muted-foreground max-w-[120px] truncate" title={session.note}>
                                    {session.note}
                                  </span>
                                )}
                                <Badge
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border-none shadow-sm capitalize ${
                                    isPresent
                                      ? isLate ? 'bg-[hsl(var(--warning))] text-white' : 'bg-[hsl(var(--success))] text-white'
                                      : 'bg-[hsl(var(--error))] text-white'
                                  }`}
                                >
                                  {t(`attendance.${session.status}`)}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      {t('attendance.noAttendanceData')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default StudentAttendanceView;
