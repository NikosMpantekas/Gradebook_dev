import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  addMonths
} from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DatePicker } from '../../components/ui/date-picker';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Clock,
  Search,
  Download,
  CheckCircle2,
  Save,
  Settings,
  BookOpen,
  AlertCircle,
  Check,
  CalendarRange,
  BarChart2,
  X
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';
import { Spinner } from '../../components/ui/spinner';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import { convertToCSV, downloadCSV } from '../../utils/exportUtils';

// Memoized Student Row Component
const StudentRow = React.memo(({ student, t, onToggle, onNoteChange }) => {
  const initials = student.name
    ? student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 border-b last:border-0 transition-colors",
        !student.present
          ? "bg-destructive/5 dark:bg-destructive/10 hover:bg-destructive/10"
          : "bg-background hover:bg-muted/30",
      )}
    >
      {/* Student Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
            student.present
              ? "bg-primary/10 text-primary"
              : "bg-destructive/20 text-destructive",
          )}
        >
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "text-sm font-semibold truncate",
              !student.present
                ? "text-destructive font-bold"
                : "text-foreground",
            )}
          >
            {student.name}
          </span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider mt-0.5",
              student.present
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive",
            )}
          >
            {student.present ? t("attendance.present") : t("attendance.absent")}
          </span>
        </div>
      </div>

      {/* Control Actions (Toggle + Note) */}
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {/* Toggle Button Group */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 text-xs font-bold rounded-md transition-all duration-200",
              student.present
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600/90"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent",
            )}
            onClick={() => onToggle(student.studentId, true)}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {t("attendance.present")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 text-xs font-bold rounded-md transition-all duration-200",
              !student.present
                ? "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent",
            )}
            onClick={() => onToggle(student.studentId, false)}
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {t("attendance.absent")}
          </Button>
        </div>

        {/* Note Input */}
        <div className="relative flex-1 min-w-[150px] sm:max-w-[200px]">
          <Input
            placeholder={t("attendance.addNote")}
            value={student.note || ""}
            onChange={(e) => onNoteChange(student.studentId, e.target.value)}
            className="h-8.5 text-xs bg-muted/30 border-border/60 focus:bg-background focus-visible:ring-1"
          />
        </div>
      </div>
    </div>
  );
});

const WeeklyAttendanceManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [schoolBranches, setSchoolBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Semester dates – synced from the backend so all users share the same range
  const [semesterStart, setSemesterStart] = useState('');
  const [semesterEnd, setSemesterEnd] = useState('');
  const [semesterLoading, setSemesterLoading] = useState(true);
  // Staged values held locally until the user hits "Save Dates"
  const [stagedStart, setStagedStart] = useState('');
  const [stagedEnd, setStagedEnd] = useState('');
  const [showSemesterConfirm, setShowSemesterConfirm] = useState(false);
  const [processedClasses, setProcessedClasses] = useState(new Set());
  const [error, setError] = useState(null);

  // Calendar Date Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Export State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    type: 'all',
    filterId: '',
    dateRange: 'semester',
    customStartDate: '',
    customEndDate: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStudents, setExportStudents] = useState([]);
  const [exportStudentSearch, setExportStudentSearch] = useState('');
  const [isSearchingExportStudents, setIsSearchingExportStudents] = useState(false);

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
    console.log(`[WeeklyAttendanceManagement] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  const getClassesForDay = useCallback(
    (date) => {
      // Parse semester boundaries
      const semStart = new Date(semesterStart);
      semStart.setHours(0, 0, 0, 0);
      const semEnd = new Date(semesterEnd);
      semEnd.setHours(23, 59, 59, 999);

      // Compare target date (set to noon to avoid timezone shift checks)
      const target = new Date(date);
      target.setHours(12, 0, 0, 0);

      // Check if target date is within semester bounds
      if (target < semStart || target > semEnd) {
        return [];
      }

      const dayName = format(date, 'EEEE'); // Monday, Tuesday, etc.

      return classes.filter(cls => {
        // Check if class has schedule for this day
        const hasScheduleForDay = cls.schedule?.some(sch => sch.day === dayName);

        // Apply branch filter
        const matchesBranch = selectedBranch === 'all' || cls.schoolBranch === selectedBranch;

        return hasScheduleForDay && matchesBranch && cls.active;
      });
    },
    [classes, selectedBranch, semesterStart, semesterEnd]
  );

  // All class instances for the currently viewed month (both processed and pending)
  const monthlyClassInstances = useMemo(() => {
    const start = startOfMonth(currentMonthDate);
    const end = endOfMonth(currentMonthDate);
    const days = eachDayOfInterval({ start, end });
    const instances = [];

    days.forEach((day) => {
      const dayClasses = getClassesForDay(day);
      dayClasses.forEach((cls) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const classKey = `${cls._id}-${dateStr}`;
        const isProcessed = processedClasses.has(classKey);
        instances.push({
          ...cls,
          date: day,
          dateStr,
          isProcessed,
          startTime:
            cls.schedule?.find((sch) => sch.day === format(day, "EEEE"))
              ?.startTime || "--:--",
        });
      });
    });

    // Sort chronologically, latest first
    return instances.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [currentMonthDate, classes, processedClasses, getClassesForDay]);

  // Calendar Days Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonthDate);
    const lastDay = endOfMonth(currentMonthDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    // Adjust day index to start week on Monday = 0
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    return {
      days: daysInMonth,
      firstDayIndex,
    };
  }, [currentMonthDate]);

  // Scheduled classes for the selected day
  const selectedDateClasses = useMemo(() => {
    const dayClasses = getClassesForDay(selectedDate);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return dayClasses.map((cls) => {
      const classKey = `${cls._id}-${dateStr}`;
      const isProcessed = processedClasses.has(classKey);
      return {
        ...cls,
        isProcessed,
        date: selectedDate,
      };
    });
  }, [selectedDate, classes, processedClasses, getClassesForDay]);

  const getLocalizedMonthName = (date) => {
    const monthIndex = date.getMonth();
    const monthKeys = [
      "calendar.months.january",
      "calendar.months.february",
      "calendar.months.march",
      "calendar.months.april",
      "calendar.months.may",
      "calendar.months.june",
      "calendar.months.july",
      "calendar.months.august",
      "calendar.months.september",
      "calendar.months.october",
      "calendar.months.november",
      "calendar.months.december",
    ];
    return t(monthKeys[monthIndex]) || format(date, "MMMM");
  };

  const getDayAbbreviations = () => [
    t("calendar.days.mon") || "Mo",
    t("calendar.days.tue") || "Tu",
    t("calendar.days.wed") || "We",
    t("calendar.days.thu") || "Th",
    t("calendar.days.fri") || "Fr",
    t("calendar.days.sat") || "Sa",
    t("calendar.days.sun") || "Su",
  ];

  // Load semester settings from API (shared across all users)
  const loadSemesterSettings = async () => {
    try {
      setSemesterLoading(true);
      const token = user?.token;
      const response = await axios.get(`${API_URL}/api/semester-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        setSemesterStart(response.data.data.semesterStart);
        setSemesterEnd(response.data.data.semesterEnd);
        // Sync staged values too
        setStagedStart(response.data.data.semesterStart);
        setStagedEnd(response.data.data.semesterEnd);
      }
    } catch (error) {
      console.error('Error loading semester settings:', error);
      // Fall back to a wide window so the calendar is never empty
      const now = new Date();
      const fallbackStart = `${now.getFullYear()}-09-01`;
      const fallbackEnd = `${now.getFullYear() + 1}-06-30`;
      setSemesterStart(fallbackStart);
      setSemesterEnd(fallbackEnd);
      setStagedStart(fallbackStart);
      setStagedEnd(fallbackEnd);
    } finally {
      setSemesterLoading(false);
    }
  };

  // Semester configuration handlers
  // Changes are staged locally until the user presses "Save Dates",
  // so the calendar popover doesn't dismiss mid-pick.
  const handleSemesterStartChange = (value) => {
    if (value) setStagedStart(value);
  };

  const handleSemesterEndChange = (value) => {
    if (value) setStagedEnd(value);
  };

  // Called when the user explicitly presses "Save Dates"
  const requestSemesterSave = () => {
    if (!stagedStart || !stagedEnd) return;
    if (stagedStart === semesterStart && stagedEnd === semesterEnd) return;
    setShowSemesterConfirm(true);
  };

  const confirmSemesterChange = async () => {
    if (stagedStart >= stagedEnd) {
      toast.error(t('attendance.semesterStartMustBeBeforeEnd', 'Start date must be before end date'));
      setShowSemesterConfirm(false);
      return;
    }

    try {
      const token = user?.token;
      await axios.put(
        `${API_URL}/api/semester-settings`,
        { semesterStart: stagedStart, semesterEnd: stagedEnd },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSemesterStart(stagedStart);
      setSemesterEnd(stagedEnd);
      toast.success(t('attendance.semesterConfigSaved'));
    } catch (error) {
      console.error('Error saving semester settings:', error);
      toast.error(t('attendance.failedToSaveSemesterSettings', 'Failed to save semester settings'));
    }

    setShowSemesterConfirm(false);
  };

  const cancelSemesterChange = () => {
    // Revert staged values back to last saved values
    setStagedStart(semesterStart);
    setStagedEnd(semesterEnd);
    setShowSemesterConfirm(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      fetchSchoolBranches();
    }
  }, [classes]);

  useEffect(() => {
    if (classes.length > 0 && semesterStart && semesterEnd) {
      loadProcessedClasses();
    }
  }, [semesterStart, semesterEnd, classes.length]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Load semester settings first so the calendar boundaries are correct
      // before we try to render class schedules
      await loadSemesterSettings();
      await fetchClasses();
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadProcessedClasses = async () => {
    try {
      const token = user?.token;
      const response = await axios.get(`${API_URL}/api/attendance/processed-classes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate: semesterStart, endDate: semesterEnd }
      });

      if (response.data && response.data.success && response.data.data) {
        const processedKeys = response.data.data.map(item => `${item.classId}-${item.date}`);
        setProcessedClasses(new Set(processedKeys));
      }
    } catch (error) {
      console.error('Error loading processed classes:', error);
      logAction('Error loading processed classes', { error: error.message });
    }
  };

  const fetchClasses = async () => {
    try {
      const token = user?.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.get(`${API_URL}/api/classes`, config);

      if (response.data) {
        const classData = response.data.classes || response.data;
        setClasses(Array.isArray(classData) ? classData : []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(t('attendance.failedToLoadClasses'));
    }
  };

  const fetchSchoolBranches = async () => {
    try {
      const branchIds = [...new Set(classes.map(cls => cls.schoolBranch))].filter(Boolean);
      const token = user?.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const branchDetails = await Promise.all(
        branchIds.map(async (branchId) => {
          try {
            const response = await axios.get(`${API_URL}/api/school-branches/${branchId}`, config);
            return {
              id: branchId,
              name: response.data.name || `Branch ${branchId}`
            };
          } catch (error) {
            console.warn(`Failed to fetch branch ${branchId}:`, error);
            return {
              id: branchId,
              name: `Branch ${branchId}`
            };
          }
        })
      );

      setSchoolBranches(branchDetails);
    } catch (error) {
      console.error('Error processing school branches:', error);
      const branches = [...new Set(classes.map(cls => cls.schoolBranch))].filter(Boolean);
      setSchoolBranches(branches.map(id => ({ id, name: `Branch ${id}` })));
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonthDate((prev) => addMonths(prev, -1));
  };

  const goToNextMonth = () => {
    setCurrentMonthDate((prev) => addMonths(prev, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDate(today);
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
      setPopupStudentFilter('');
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
      logAction('Saving class attendance', { classId: selectedClass._id, date: classDate });

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
        setPopupStudentFilter('');
        logAction('Class attendance saved successfully');
      } else {
        throw new Error('Failed to save attendance - no success response');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      logAction('Error saving attendance', { error: error.message });
      toast.error(t('attendance.failedToSaveAttendance'));
    }
  };

  const handleResetAttendance = async () => {
    if (!window.confirm(t('attendance.confirmReset', 'Are you sure you want to reset the attendance for this class? All marked data and the session record will be permanently deleted.'))) {
      return;
    }

    try {
      const dateStr = format(classDate, 'yyyy-MM-dd');
      logAction('Resetting class attendance', { classId: selectedClass._id, date: dateStr });

      const token = user?.token;
      const response = await axios.delete(`${API_URL}/api/attendance/class-session/${selectedClass._id}/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        toast.success(t('attendance.attendanceResetSuccess', 'Attendance reset successfully'));

        const classKey = `${selectedClass._id}-${dateStr}`;
        setProcessedClasses(prev => {
          const newSet = new Set(prev);
          newSet.delete(classKey);
          return newSet;
        });

        setClassPopupOpen(false);
        logAction('Class attendance reset successfully');
      }
    } catch (error) {
      console.error('Error resetting attendance:', error);
      toast.error(t('attendance.failedToResetAttendance', 'Failed to reset attendance'));
    }
  };

  // Export Logic
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const token = user?.token;

      let start, end;
      const today = new Date();

      switch (exportConfig.dateRange) {
        case 'week':
          start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'month':
          start = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
          end = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
          break;
        case 'semester':
          start = semesterStart;
          end = semesterEnd;
          break;
        case 'custom':
          start = exportConfig.customStartDate;
          end = exportConfig.customEndDate;
          break;
        default:
          start = semesterStart;
          end = semesterEnd;
      }

      const params = {
        type: exportConfig.type,
        startDate: start,
        endDate: end
      };

      if (exportConfig.type !== 'all') {
        if (!exportConfig.filterId) {
          toast.error(t('attendance.selectTarget', 'Please select a target for export'));
          setExportLoading(false);
          return;
        }
        params.filterId = exportConfig.filterId;
      }

      const response = await axios.get(`${API_URL}/api/attendance/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;
        if (data.length === 0) {
          toast.info(t('attendance.noDataForExport', 'No records found for the selected criteria'));
          setExportLoading(false);
          return;
        }

        const total = data.length;
        const present = data.filter(r => r.status === 'present').length;
        const absent = data.filter(r => r.status === 'absent').length;
        const uniqueSessions = new Set(data.map(r => `${format(new Date(r.date), 'yyyy-MM-dd')}|${r.className}`)).size;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

        const formattedData = data
          .filter(r => r.status === 'absent')
          .map(r => ({
            ...r,
            date: r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '',
            status: t(`attendance.${r.status}`)
          }));

        const columns = [
          { key: 'date', label: t('common.date') },
          { key: 'className', label: t('classes.className') },
          { key: 'studentName', label: t('students.studentName') },
          { key: 'status', label: t('common.status') },
          { key: 'note', label: t('attendance.note') }
        ];

        let csv = convertToCSV(formattedData, columns);
        
        csv += `\n\n`;
        csv += `${t('attendance.totalPresent')},${present}\n`;
        csv += `${t('attendance.totalAbsent')},${absent}\n`;
        csv += `${t('attendance.totalSessions')},${uniqueSessions}\n`;
        csv += `${t('attendance.attendancePercentage')},${percentage}%\n`;

        const filename = `Attendance_${exportConfig.type}_${start}_${end}.csv`;
        downloadCSV(csv, filename);
        toast.success(t('attendance.exportCompleted'));
        setExportDialogOpen(false);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('attendance.exportFailed'));
    } finally {
      setExportLoading(false);
    }
  };

  const searchExportStudents = async (query) => {
    if (!query || query.length < 2) return;
    try {
      setIsSearchingExportStudents(true);
      const token = user?.token;
      const response = await axios.get(`${API_URL}/api/attendance/students/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { query }
      });
      if (response.data && response.data.success) {
        setExportStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error searching students for export:', error);
    } finally {
      setIsSearchingExportStudents(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (exportStudentSearch) {
        searchExportStudents(exportStudentSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [exportStudentSearch]);

  if (loading && classes.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchInitialData} variant="outline">
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('attendance.weeklyManagement')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('attendance.manageWeeklyAttendance')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm hover:shadow-md bg-background">
                <Download className="w-4 h-4 text-primary" />
                <span className="font-semibold">{t('attendance.exportReports', 'Export Reports')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 m-auto translate-x-0 translate-y-0 w-[95vw] sm:max-w-[500px] h-fit max-h-[95vh] p-0 gap-0 shadow-2xl border overflow-hidden flex flex-col duration-0 animate-none data-[state=open]:animate-none data-[state=closed]:animate-none">
              <DialogHeader className="p-6 bg-primary/[0.03] border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">{t('attendance.exportReports')}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">{t('attendance.exportDescription', 'Generate and download attendance reports in CSV format')}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {/* Export Type / Scope */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('attendance.exportScope', 'Export Scope')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['all', 'class', 'student'].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={exportConfig.type === type ? "default" : "outline"}
                        className={cn(
                          "h-10 text-xs font-bold uppercase tracking-wider transition-all",
                          exportConfig.type === type ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"
                        )}
                        onClick={() => setExportConfig({ ...exportConfig, type, filterId: '' })}
                      >
                        {t(`attendance.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Target Selection (Conditional) */}
                {exportConfig.type === 'class' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('attendance.selectClass')}</Label>
                    <Select
                      value={exportConfig.filterId}
                      onValueChange={(val) => setExportConfig({ ...exportConfig, filterId: val })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('attendance.chooseClass', 'Select a class...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {exportConfig.type === 'student' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('attendance.selectStudent')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('attendance.searchStudents')}
                        value={exportStudentSearch}
                        onChange={(e) => setExportStudentSearch(e.target.value)}
                        className="pl-9 h-11"
                      />
                      {isSearchingExportStudents && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                    
                    {exportStudents.length > 0 && (
                      <div className="border rounded-lg divide-y bg-muted/20 max-h-[150px] overflow-y-auto overflow-x-hidden">
                        {exportStudents.map(student => (
                          <div
                            key={student._id}
                            className={cn(
                              "p-2.5 px-4 text-sm cursor-pointer transition-colors flex items-center justify-between group",
                              exportConfig.filterId === student._id ? "bg-primary/10 text-primary" : "hover:bg-background"
                            )}
                            onClick={() => {
                              setExportConfig({ ...exportConfig, filterId: student._id });
                              setExportStudentSearch(student.name);
                              setExportStudents([]);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{student.name}</span>
                              <span className="text-[10px] text-muted-foreground group-hover:text-primary/70">{student.email}</span>
                            </div>
                            {exportConfig.filterId === student._id && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Date Range Selection */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('attendance.dateRange', 'Date Range')}</Label>
                  <Select
                    value={exportConfig.dateRange}
                    onValueChange={(val) => setExportConfig({ ...exportConfig, dateRange: val })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">{t('attendance.currentWeek')}</SelectItem>
                      <SelectItem value="month">{t('attendance.currentMonth', 'Current Month')}</SelectItem>
                      <SelectItem value="semester">{t('attendance.fullSemester', 'Full Semester')}</SelectItem>
                      <SelectItem value="custom">{t('attendance.customRange', 'Custom Range')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportConfig.dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t('attendance.startDate')}</Label>
                      <Input
                        type="date"
                        value={exportConfig.customStartDate}
                        onChange={(e) => setExportConfig({ ...exportConfig, customStartDate: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t('attendance.endDate')}</Label>
                      <Input
                        type="date"
                        value={exportConfig.customEndDate}
                        onChange={(e) => setExportConfig({ ...exportConfig, customEndDate: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="p-4 bg-muted/50 border-t flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDialogOpen(false)}
                  className="px-6 h-9 font-medium"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="px-6 h-9 font-medium shadow-md shadow-primary/10"
                >
                  {exportLoading ? (
                    <Spinner size="sm" className="text-primary-foreground" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {t('attendance.downloadCSV', 'Download CSV')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Semester Configuration Card */}
        <Card className="lg:col-span-12 shadow-sm border bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('attendance.semesterDates')}
            </CardTitle>
            <CardDescription>
              {t('attendance.semesterConfigDescription', 'Set the active dates for the current academic semester')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>{t('attendance.semesterStart')}</Label>
                <DatePicker
                  value={stagedStart}
                  onChange={handleSemesterStartChange}
                  placeholder={t('attendance.semesterStart')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('attendance.semesterEnd')}</Label>
                <DatePicker
                  value={stagedEnd}
                  onChange={handleSemesterEndChange}
                  placeholder={t('attendance.semesterEnd')}
                  min={stagedStart}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchFilter">{t('attendance.schoolBranch')}</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t('attendance.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('attendance.allBranches')}</SelectItem>
                    {schoolBranches.map(branch => (
                      <SelectItem key={branch.id || branch} value={branch.id || branch}>
                        {branch.name || branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Save button — only visible when staged values differ from saved */}
              <div className="flex items-end">
                <Button
                  onClick={requestSemesterSave}
                  disabled={
                    !stagedStart ||
                    !stagedEnd ||
                    (stagedStart === semesterStart && stagedEnd === semesterEnd)
                  }
                  className="w-full h-10 gap-2 font-semibold shadow-sm shadow-primary/10"
                >
                  <Save className="w-4 h-4" />
                  {t('attendance.saveDates', 'Save Dates')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Monthly Attendances Card Wrapper */}
        <div className="lg:col-span-1 relative lg:h-full lg:min-h-0 order-2 lg:order-1">
          <Card className="border border-border/80 shadow-sm bg-card hover:shadow-md transition-all duration-300 flex flex-col lg:absolute lg:inset-0 overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 gap-4 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-bold tracking-tight truncate">
                  {t("attendance.monthlyAttendances") || "Monthly Attendances"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
              {monthlyClassInstances.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/10 rounded-xl border border-dashed border-border/40 m-4 flex-1">
                  <CalendarRange className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("attendance.noClassesScheduled") ||
                      "No classes scheduled for this month"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[350px] lg:flex-1 lg:h-0 lg:min-h-0 w-full px-6 pb-6">
                  <div className="space-y-2.5 px-3">
                    {monthlyClassInstances.map((inst, index) => {
                      const itemKey = `${inst._id}-${inst.dateStr}-${index}`;
                      return (
                        <div
                          key={itemKey}
                          onClick={() => openClassPopup(inst, inst.date)}
                          className={cn(
                            "p-2.5 rounded-xl border flex flex-col gap-2 transition-all duration-200 cursor-pointer select-none",
                            inst.isProcessed
                              ? "bg-emerald-500/[0.01] border-emerald-500/10 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]"
                              : "bg-background border-border/60 hover:border-primary/20 hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex flex-col">
                              <span className="font-bold text-xs text-foreground truncate">
                                {inst.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                {format(inst.date, "MMM dd")}
                                <span className="text-muted-foreground/40">
                                  •
                                </span>
                                <Clock className="w-3 h-3 text-muted-foreground/70" />
                                {inst.startTime}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {inst.isProcessed ? (
                                <Badge className="text-[9px] h-5 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider px-2 pointer-events-none hover:bg-emerald-500/10">
                                  {t("attendance.saved")}
                                </Badge>
                              ) : (
                                <Badge className="text-[8px] h-4.5 font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider px-1.5 pointer-events-none hover:bg-amber-500/10">
                                  {t("attendance.pending")}
                                </Badge>
                              )}

                              {inst.isProcessed ? (
                                <Check className="w-2.5 h-2.5 inline text-emerald-500 dark:text-emerald-400" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Calendar Column */}
        <div className="lg:col-span-2 flex flex-col lg:h-full order-1 lg:order-2">
          <Card className="shadow-sm border bg-card p-6 flex-1 flex flex-col">
            {/* Header controls */}
            <div className="flex flex-row items-center justify-between gap-2 mb-6 border-b pb-4 relative">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="rounded-2xl font-bold text-[10px] uppercase tracking-wider px-3 h-9 bg-primary/5 hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20 shrink-0"
              >
                {t("attendance.today") || "Today"}
              </Button>
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight absolute left-1/2 -translate-x-1/2 shrink-0">
                {getLocalizedMonthName(currentMonthDate)}{" "}
                {currentMonthDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-1.5 bg-muted/20 p-1 rounded-2xl border border-white/5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
              {getDayAbbreviations().map((day, index) => (
                <div
                  key={index}
                  className="h-8 flex items-center justify-center text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.2em]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {/* Spacers for start of month offset */}
              {Array.from({ length: calendarDays.firstDayIndex }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className="h-12 sm:h-16" />
                ),
              )}

              {/* Day cells */}
              {calendarDays.days.map((day) => {
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const dayClasses = getClassesForDay(day);
                const dateStr = format(day, "yyyy-MM-dd");

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "h-12 sm:h-16 flex flex-col items-center justify-center text-sm rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden group",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold border-primary shadow-lg ring-2 ring-primary/20 scale-105 z-10"
                        : isToday
                          ? "bg-accent/50 text-accent-foreground font-semibold border-accent hover:bg-accent/70 hover:scale-105"
                          : "bg-background hover:bg-accent hover:text-accent-foreground border-border/50 hover:border-primary/40 hover:scale-105",
                    )}
                  >
                    {/* Background decorative gradient on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br from-primary to-transparent" />

                    <span
                      className={cn(
                        "text-xs sm:text-sm mb-1 z-10",
                        isSelected
                          ? "font-bold text-primary-foreground"
                          : isToday
                            ? "font-bold text-accent-foreground"
                            : "font-medium opacity-80 text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Class Dots */}
                    <div className="flex gap-1 justify-center z-10">
                      {dayClasses.map((cls) => {
                        const classKey = `${cls._id}-${dateStr}`;
                        const isProcessed = processedClasses.has(classKey);
                        return (
                          <div
                            key={cls._id}
                            className={cn(
                              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm ring-1",
                              isSelected
                                ? "ring-primary-foreground/20"
                                : "ring-white/20",
                              isProcessed ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Date Classes Details */}
            <div className="mt-6 pt-6 border-t border-border/60">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>
                  {t("attendance.classesForDate") || "Classes for"}{" "}
                  {format(selectedDate, "MMMM dd, yyyy")}
                </span>
              </h3>

              {selectedDateClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/40">
                  <CalendarRange className="w-6 h-6 text-muted-foreground/50 mb-2 opacity-55" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("attendance.noClassesForDate") ||
                      "No classes scheduled for this date"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border rounded-xl overflow-hidden bg-background">
                  {selectedDateClasses.map((cls) => (
                    <div
                      key={cls._id}
                      className={cn(
                        "flex flex-row items-center justify-between p-4 gap-4 transition-colors hover:bg-muted/10",
                        cls.isProcessed
                          ? "bg-emerald-500/[0.01]"
                          : "bg-background",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {cls.isProcessed ? (
                          <div className="p-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-foreground truncate">
                            {cls.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                            {cls.schedule?.find(
                              (sch) => sch.day === format(selectedDate, "EEEE"),
                            )?.startTime || "--:--"}
                            <span className="text-muted-foreground/40">•</span>
                            <Users className="w-3.5 h-3.5" />
                            {cls.studentsCount ||
                              cls.students?.length ||
                              0}{" "}
                            {t("attendance.students")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {cls.isProcessed ? (
                          <Badge className="hidden sm:inline-flex text-[9px] h-5 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider px-2 pointer-events-none hover:bg-emerald-500/10">
                            <Check className="w-2.5 h-2.5 mr-0.5 inline" />
                            {t("attendance.saved")}
                          </Badge>
                        ) : (
                          <Badge className="hidden sm:inline-flex text-[9px] h-5 font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider px-2 pointer-events-none hover:bg-amber-500/10">
                            {t("attendance.pending")}
                          </Badge>
                        )}

                        <Button
                          size="sm"
                          variant={cls.isProcessed ? "outline" : "default"}
                          className={cn(
                            "h-8 text-xs font-bold px-3 transition-all",
                            cls.isProcessed
                              ? "hover:bg-emerald-500/[0.05] hover:text-emerald-600 hover:border-emerald-500/30"
                              : "shadow-sm shadow-primary/10 hover:bg-primary/95",
                          )}
                          onClick={() => openClassPopup(cls, selectedDate)}
                        >
                          {cls.isProcessed
                            ? t("common.edit") || "Edit"
                            : t("attendance.markAttendance") || "Check In"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AlertDialog open={showSemesterConfirm} onOpenChange={setShowSemesterConfirm}>
        <AlertDialogContent className="fixed inset-0 m-auto translate-x-0 translate-y-0 w-[90vw] sm:max-w-md h-fit p-6 shadow-2xl border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">{t('attendance.confirmSemesterChange')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
              {t(
                'attendance.confirmSemesterBothChange',
                'This will update the active semester to {{start}} – {{end}}. All users will see this change.',
                { start: stagedStart, end: stagedEnd }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-3">
            <AlertDialogCancel onClick={cancelSemesterChange} className="h-9 px-4 text-xs font-semibold">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSemesterChange} className="h-9 px-4 text-xs font-bold">{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                {t('attendance.loadingAttendance', 'Loading attendance details...')}
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

          <DialogFooter className="p-4 bg-muted/50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              {processedClasses.has(`${selectedClass?._id}-${classDate && format(classDate, 'yyyy-MM-dd')}`) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 font-medium"
                  onClick={handleResetAttendance}
                >
                  <X className="w-3.5 h-3.5 mr-2" />
                  {t('common.reset')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                className="px-6 h-9 font-medium shadow-md shadow-primary/10"
                onClick={saveClassAttendance}
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                {t('attendance.saveAttendance')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAttendanceManagement;
