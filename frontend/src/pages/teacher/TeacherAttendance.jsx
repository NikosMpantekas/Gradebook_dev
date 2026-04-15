import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  Save,
  BookOpen
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';
import { Spinner } from '../../components/ui/spinner';
import { cn } from '../../lib/utils';

// Memoized Student Row Component
const StudentRow = React.memo(({ student, t, onToggle, onNoteChange }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border-b last:border-0 transition-colors cursor-pointer",
        !student.present
          ? "bg-destructive/5 dark:bg-destructive/10 hover:bg-destructive/10"
          : "bg-background hover:bg-muted/50"
      )}
      onClick={() => onToggle(student.studentId, !student.present)}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <Checkbox
          id={`absent-${student.studentId}`}
          checked={!student.present}
          onCheckedChange={(checked) => onToggle(student.studentId, !checked)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "h-5 w-5",
            !student.present && "data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
          )}
        />

        <div className="flex flex-col min-w-0">
          <span className={cn(
            "text-sm font-medium truncate",
            !student.present ? "text-destructive font-semibold" : "text-foreground"
          )}
          >
            {student.name}
          </span>
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-bold mt-0.5",
            !student.present ? "text-destructive" : "text-muted-foreground"
          )}>
            {!student.present ? t('attendance.absent') : t('attendance.present')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 note-input ml-4">
        <Input
          placeholder={t('attendance.addNote')}
          value={student.note || ''}
          onChange={(e) => onNoteChange(student.studentId, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-8 text-xs w-[180px] bg-muted/30 border-none focus:bg-background"
        />
      </div>
    </div>
  );
});

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  // Semester boundaries (Read-only for teachers, uses defaults or localStorage if present)
  const [semesterStart] = useState(() => {
    return localStorage.getItem('attendance_semester_start') || format(new Date(), 'yyyy-MM-dd');
  });
  const [semesterEnd] = useState(() => {
    return localStorage.getItem('attendance_semester_end') || format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd');
  });

  const [processedClasses, setProcessedClasses] = useState(new Set());
  const [error, setError] = useState(null);

  // Week/day management
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([0])); // Current week expanded by default
  const [expandedDays, setExpandedDays] = useState(new Set([format(new Date(), 'yyyy-MM-dd')])); // Today expanded

  // Class popup state
  const [selectedClass, setSelectedClass] = useState(null);
  const [classPopupOpen, setClassPopupOpen] = useState(false);
  const [classDate, setClassDate] = useState(null);
  const [classAttendance, setClassAttendance] = useState({
    wasHeld: false,
    startTime: '',
    endTime: '',
    students: [],
    notes: ''
  });

  const [popupStudentFilter, setPopupStudentFilter] = useState('');
  const [popupLoading, setPopupLoading] = useState(false);

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[TeacherAttendance] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  // Generate weeks to display (Matches admin logic)
  const weeksToShow = useMemo(() => {
    const today = new Date();
    const semesterStartDate = new Date(semesterStart);
    const semesterEndDate = new Date(semesterEnd);

    const weeks = [];

    // Generate range of weeks
    for (let offset = -3; offset <= 12; offset++) {
      const weekStart = startOfWeek(addWeeks(today, offset), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(today, offset), { weekStartsOn: 1 });

      if (isWithinInterval(weekStart, { start: semesterStartDate, end: semesterEndDate }) ||
        isWithinInterval(weekEnd, { start: semesterStartDate, end: semesterEndDate })) {
        weeks.push({
          offset,
          start: weekStart,
          end: weekEnd,
          isCurrent: offset === 0,
          days: eachDayOfInterval({ start: weekStart, end: weekEnd })
        });
      }
    }

    return weeks;
  }, [semesterStart, semesterEnd]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTeacherClasses(),
        loadProcessedClasses()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError(t('navigation.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadProcessedClasses = async () => {
    try {
      const token = user?.token;
      // Fetch statuses for a broad range around current date
      const startDate = format(addWeeks(new Date(), -4), 'yyyy-MM-dd');
      const endDate = format(addWeeks(new Date(), 8), 'yyyy-MM-dd');

      const response = await axios.get(`${API_URL}/api/attendance/processed-classes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });

      if (response.data && response.data.success && response.data.data) {
        const processedKeys = response.data.data.map(item => `${item.classId}-${item.date}`);
        setProcessedClasses(new Set(processedKeys));
      }
    } catch (error) {
      console.error('Error loading processed classes:', error);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = user?.token;
      const response = await axios.get(`${API_URL}/api/classes/my-teaching-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setClasses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error(t('attendance.failedToLoadClasses'));
    }
  };

  const getClassesForDay = (date) => {
    const dayName = format(date, 'EEEE');
    return classes.filter(cls => {
      const hasScheduleForDay = cls.schedule?.some(sch => sch.day === dayName);
      return hasScheduleForDay && cls.active;
    });
  };

  const toggleWeek = (weekOffset) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekOffset)) newSet.delete(weekOffset);
      else newSet.add(weekOffset);
      return newSet;
    });
  };

  const toggleDay = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) newSet.delete(dateKey);
      else newSet.add(dateKey);
      return newSet;
    });
  };

  const openClassPopup = async (classData, date) => {
    const dayName = format(date, 'EEEE');
    const scheduleForDay = classData.schedule?.find(sch => sch.day === dayName);
    const dateStr = format(date, 'yyyy-MM-dd');

    setSelectedClass(classData);
    setClassDate(date);
    setPopupStudentFilter('');
    setClassPopupOpen(true);
    setPopupLoading(true);

    setClassAttendance({
      wasHeld: true,
      startTime: scheduleForDay?.startTime || '',
      endTime: scheduleForDay?.endTime || '',
      students: [],
      notes: ''
    });

    try {
      const token = user?.token;
      const [studentsResponse, attendanceResponse] = await Promise.all([
        axios.get(`${API_URL}/api/classes/${classData._id}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/attendance/class-attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { classId: classData._id, date: dateStr }
        }).catch(() => ({ data: { success: false } }))
      ]);

      const classStudents = studentsResponse.data || [];
      const existingData = attendanceResponse.data?.success ? attendanceResponse.data.data : null;

      if (existingData) {
        const classKey = `${classData._id}-${dateStr}`;
        setProcessedClasses(prev => new Set([...prev, classKey]));

        setClassAttendance({
          wasHeld: existingData.wasHeld || false,
          startTime: existingData.startTime || scheduleForDay?.startTime || '',
          endTime: existingData.endTime || scheduleForDay?.endTime || '',
          students: classStudents.map(s => {
            const existingStudent = existingData.students?.find(es => es.studentId === s._id || es.studentId?._id === s._id);
            return {
              studentId: s._id,
              name: s.name,
              present: existingStudent ? existingStudent.present : true,
              note: existingStudent ? existingStudent.note : ''
            };
          }),
          notes: existingData.notes || ''
        });
      } else {
        setClassAttendance(prev => ({
          ...prev,
          students: classStudents.map(s => ({
            studentId: s._id,
            name: s.name,
            present: true,
            note: ''
          }))
        }));
      }
    } catch (error) {
      console.error('Error opening class popup:', error);
      toast.error(t('attendance.failedToLoadAttendance'));
    } finally {
      setPopupLoading(false);
    }
  };

  const updateStudentAttendance = useCallback((studentId, field, value) => {
    setClassAttendance(prev => ({
      ...prev,
      students: prev.students.map(student =>
        student.studentId === studentId
          ? { ...student, [field]: value }
          : student
      )
    }));
  }, []);

  const handleToggleAttendance = useCallback((studentId, shouldBePresent) => {
    updateStudentAttendance(studentId, 'present', shouldBePresent);
  }, [updateStudentAttendance]);

  const handleNoteChange = useCallback((studentId, note) => {
    updateStudentAttendance(studentId, 'note', note);
  }, [updateStudentAttendance]);

  const filteredPopupStudents = useMemo(() => {
    return classAttendance.students.filter(s =>
      !popupStudentFilter ||
      s.name?.toLowerCase().includes(popupStudentFilter.toLowerCase())
    );
  }, [classAttendance.students, popupStudentFilter]);

  const saveClassAttendance = async () => {
    try {
      const token = user?.token;
      const startDateTime = new Date(`${format(classDate, 'yyyy-MM-dd')}T${classAttendance.startTime}:00`);
      const endDateTime = new Date(`${format(classDate, 'yyyy-MM-dd')}T${classAttendance.endTime}:00`);

      const attendanceData = {
        classId: selectedClass._id,
        date: format(classDate, 'yyyy-MM-dd'),
        wasHeld: classAttendance.wasHeld,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        students: classAttendance.students,
        notes: classAttendance.notes
      };

      const response = await axios.post(`${API_URL}/api/attendance/class-session`, attendanceData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        toast.success(t('attendance.attendanceSaved'));
        const classKey = `${selectedClass._id}-${format(classDate, 'yyyy-MM-dd')}`;
        setProcessedClasses(prev => new Set([...prev, classKey]));
        setClassPopupOpen(false);
        logAction('Attendance saved successfully');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error(t('attendance.failedToSaveAttendance'));
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('attendance.managementTitle')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('attendance.managementDescription')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {weeksToShow.map((week) => (
          <Card
            key={week.offset}
            className={cn(
              "shadow-sm border transition-all duration-300",
              week.isCurrent ? "border-primary/50 ring-1 ring-primary/10 bg-primary/[0.02]" : "bg-card hover:border-muted-foreground/20"
            )}
          >
            <Collapsible
              open={expandedWeeks.has(week.offset)}
              onOpenChange={() => toggleWeek(week.offset)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4 px-6 border-b last:border-b-0">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-full",
                        week.isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {expandedWeeks.has(week.offset) ?
                          <ChevronDown className="w-3.5 h-3.5" /> :
                          <ChevronRight className="w-3.5 h-3.5" />
                        }
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold tracking-tight">
                          {format(week.start, 'MMMM dd')} - {format(week.end, 'MMMM dd, yyyy')}
                        </span>
                        {week.isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            {t('attendance.currentWeek')}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="p-0">
                  <div className="divide-y border-t border-border/40">
                    {week.days.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayClasses = getClassesForDay(day);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div key={dateKey} className="group transition-all duration-200">
                          <Collapsible
                            open={expandedDays.has(dateKey)}
                            onOpenChange={() => toggleDay(day)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className={cn(
                                "flex items-center justify-between py-3.5 px-8 cursor-pointer hover:bg-muted/40 transition-colors border-l-4 group/day",
                                isToday ? "border-primary bg-primary/[0.04]" : "border-transparent"
                              )}>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "p-1 rounded-md transition-colors",
                                    isToday ? "bg-primary/10 text-primary" : "text-muted-foreground group-hover/day:bg-muted"
                                  )}>
                                    {expandedDays.has(dateKey) ?
                                      <ChevronDown className="w-4 h-4" /> :
                                      <ChevronRight className="w-4 h-4" />
                                    }
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-sm font-semibold tracking-tight",
                                      isToday ? "text-primary font-bold" : "text-foreground"
                                    )}>
                                      {format(day, 'EEEE, MMM dd')}
                                    </span>
                                    {isToday && (
                                      <span className="text-[9px] font-black uppercase tracking-widest text-primary leading-none mt-0.5">
                                        {t('attendance.today')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                                  {dayClasses.length} {t('attendance.classes')}
                                </Badge>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="bg-muted/5 p-6 px-12 border-t border-border/10">
                                {dayClasses.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/20 rounded-xl border border-dashed border-border/40">
                                    {t('attendance.noClassesScheduled')}
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {dayClasses.map(cls => {
                                      const classKey = `${cls._id}-${format(day, 'yyyy-MM-dd')}`;
                                      const isProcessed = processedClasses.has(classKey);

                                      return (
                                        <Button
                                          key={cls._id}
                                          variant="outline"
                                          className={cn(
                                            "h-auto flex flex-col items-start p-4 text-left transition-all duration-300 border rounded-2xl group relative hover:shadow-lg hover:-translate-y-1 active:scale-95",
                                            isProcessed
                                              ? "bg-primary/[0.05] border-primary/20 hover:bg-primary/[0.08] hover:border-primary/40 ring-1 ring-primary/5"
                                              : "bg-background border-border/40 hover:border-primary/50"
                                          )}
                                          onClick={() => openClassPopup(cls, day)}
                                        >
                                          <div className="flex items-center justify-between w-full mb-3">
                                            <div className="flex items-center gap-2.5">
                                              {isProcessed ? (
                                                <div className="p-1 bg-primary/20 text-primary rounded-full">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                              ) : (
                                                <div className="p-1 bg-muted text-muted-foreground rounded-full">
                                                  <BookOpen className="w-3.5 h-3.5" />
                                                </div>
                                              )}
                                              <span className="font-bold text-sm tracking-tight">{cls.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                              <Clock className="w-3 h-3" />
                                              {cls.schedule?.find(sch => sch.day === format(day, 'EEEE'))?.startTime || '--:--'}
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 mt-auto">
                                            {isProcessed && (
                                              <Badge className="text-[9px] h-4 font-black bg-primary text-primary-foreground border-none uppercase tracking-widest px-2 leading-none">
                                                {t('attendance.saved')}
                                              </Badge>
                                            )}
                                          </div>
                                        </Button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Class Attendance Popup */}
      <Dialog open={classPopupOpen} onOpenChange={setClassPopupOpen}>
        <DialogContent className="fixed inset-0 m-auto translate-x-0 translate-y-0 w-[95vw] sm:max-w-4xl h-fit max-h-[95vh] sm:max-h-[90vh] p-0 gap-0 shadow-2xl border overflow-hidden flex flex-col duration-0 animate-none data-[state=open]:animate-none data-[state=closed]:animate-none">
          <DialogHeader className="p-4 sm:p-6 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold leading-none">
                  {selectedClass?.name}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {classDate && format(classDate, 'EEEE, MMM dd, yyyy')}
                </DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 pr-10">
              <Badge variant="secondary" className="font-mono">
                {classAttendance.students.length} {t('attendance.total')}
              </Badge>
              <Badge variant={classAttendance.students.some(s => !s.present) ? "destructive" : "outline"} className="font-mono">
                {classAttendance.students.filter(s => !s.present).length} {t('attendance.absent')}
              </Badge>
            </div>
          </DialogHeader>

          {popupLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner size="lg" className="text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                {t('common.loading')}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Main Config Grid */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2.5 p-4 rounded-lg bg-accent/50 dark:bg-accent/10 border transition-colors hover:bg-accent/80">
                    <Checkbox
                      id="wasHeld"
                      checked={classAttendance.wasHeld}
                      onCheckedChange={(checked) =>
                        setClassAttendance(prev => ({ ...prev, wasHeld: checked }))
                      }
                    />
                    <Label htmlFor="wasHeld" className="text-sm font-semibold cursor-pointer">
                      {t('attendance.classWasHeld')}
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('attendance.startTime')}</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={classAttendance.startTime}
                          className="pl-9 h-10 font-mono"
                          onChange={(e) =>
                            setClassAttendance(prev => ({ ...prev, startTime: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t('attendance.endTime')}</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={classAttendance.endTime}
                          className="pl-9 h-10 font-mono"
                          onChange={(e) =>
                            setClassAttendance(prev => ({ ...prev, endTime: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student List Section */}
              <div className="space-y-4 pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-foreground">{t('attendance.students')}</h3>
                  <div className="relative w-full sm:w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('attendance.searchByName')}
                      value={popupStudentFilter}
                      onChange={(e) => setPopupStudentFilter(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1 min-h-[200px] max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border rounded-lg bg-muted/20">
                  {filteredPopupStudents.map((student) => (
                    <StudentRow
                      key={student.studentId}
                      student={student}
                      t={t}
                      onToggle={handleToggleAttendance}
                      onNoteChange={handleNoteChange}
                    />
                  ))}

                  {popupStudentFilter && filteredPopupStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm font-medium">{t('attendance.noResults')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 bg-muted/50 border-t flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              className="px-6 h-9 font-medium"
              onClick={() => setClassPopupOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              disabled={popupLoading}
              className="px-6 h-9 font-medium shadow-md transition-all active:scale-95 shadow-primary/10"
              onClick={saveClassAttendance}
            >
              <Save className="w-3.5 h-3.5 mr-2" />
              {t('attendance.saveAttendance')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAttendance;
