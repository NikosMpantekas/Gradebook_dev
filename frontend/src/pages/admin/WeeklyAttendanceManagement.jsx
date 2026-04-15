import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
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
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  Clock,
  Search,
  UserPlus,
  FileText,
  Download,
  CheckCircle2,
  Plus,
  X,
  Save,
  Settings
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

const WeeklyAttendanceManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [schoolBranches, setSchoolBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  // Load semester dates from localStorage or use defaults
  const [semesterStart, setSemesterStart] = useState(() => {
    return localStorage.getItem('attendance_semester_start') || format(new Date(), 'yyyy-MM-dd');
  });
  const [semesterEnd, setSemesterEnd] = useState(() => {
    return localStorage.getItem('attendance_semester_end') || format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd');
  });
  const [showSemesterConfirm, setShowSemesterConfirm] = useState(false);
  const [pendingSemesterChange, setPendingSemesterChange] = useState(null);
  const [processedClasses, setProcessedClasses] = useState(new Set());
  const [error, setError] = useState(null);

  // Semester configuration handlers
  const handleSemesterStartChange = (value) => {
    if (value !== semesterStart) {
      setPendingSemesterChange({ type: 'start', value });
      setShowSemesterConfirm(true);
    }
  };

  const handleSemesterEndChange = (value) => {
    if (value !== semesterEnd) {
      setPendingSemesterChange({ type: 'end', value });
      setShowSemesterConfirm(true);
    }
  };

  const confirmSemesterChange = () => {
    if (pendingSemesterChange) {
      if (pendingSemesterChange.type === 'start') {
        setSemesterStart(pendingSemesterChange.value);
        localStorage.setItem('attendance_semester_start', pendingSemesterChange.value);
      } else {
        setSemesterEnd(pendingSemesterChange.value);
        localStorage.setItem('attendance_semester_end', pendingSemesterChange.value);
      }
      toast.success(t('attendance.semesterConfigSaved'));
    }
    setShowSemesterConfirm(false);
    setPendingSemesterChange(null);
  };

  const cancelSemesterChange = () => {
    setShowSemesterConfirm(false);
    setPendingSemesterChange(null);
  };

  // Week/day management
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
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

  // Student search for temporary assignment
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
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

  // Generate weeks to display
  const weeksToShow = useMemo(() => {
    const today = new Date();
    const semesterStartDate = new Date(semesterStart);
    const semesterEndDate = new Date(semesterEnd);

    const weeks = [];

    // Generate 3 weeks before current, current week, and weeks until semester end
    for (let offset = -3; offset <= 12; offset++) {
      const weekStart = startOfWeek(addWeeks(today, offset), { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(addWeeks(today, offset), { weekStartsOn: 1 });

      // Only include weeks within semester range
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

  useEffect(() => {
    if (classes.length > 0) {
      fetchSchoolBranches();
    }
  }, [classes]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchClasses(),
        loadProcessedClasses()
      ]);
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
      const startDate = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfWeek(new Date()), 'yyyy-MM-dd');

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
      logAction('Error loading processed classes', { error: error.message });
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = user?.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.get(`${API_URL}/api/classes`, config);

      if (response.data) {
        // Handle both possible response formats
        const classData = response.data.classes || response.data;
        setClasses(Array.isArray(classData) ? classData : []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolBranches = async () => {
    try {
      // Get unique school branch IDs and fetch their details
      const branchIds = [...new Set(classes.map(cls => cls.schoolBranch))].filter(Boolean);

      // Fetch school branch details from API
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
      // Fallback to just IDs
      const branches = [...new Set(classes.map(cls => cls.schoolBranch))].filter(Boolean);
      setSchoolBranches(branches.map(id => ({ id, name: `Branch ${id}` })));
    }
  };

  const getClassesForDay = (date) => {
    const dayName = format(date, 'EEEE'); // Monday, Tuesday, etc.

    return classes.filter(cls => {
      // Check if class has schedule for this day
      const hasScheduleForDay = cls.schedule?.some(sch => sch.day === dayName);

      // Apply branch filter
      const matchesBranch = selectedBranch === 'all' || cls.schoolBranch === selectedBranch;

      return hasScheduleForDay && matchesBranch && cls.active;
    });
  };

  const toggleWeek = (weekOffset) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekOffset)) {
        newSet.delete(weekOffset);
      } else {
        newSet.add(weekOffset);
      }
      return newSet;
    });
  };

  const toggleDay = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const openClassPopup = async (classData, date) => {
    const dayName = format(date, 'EEEE');
    const scheduleForDay = classData.schedule?.find(sch => sch.day === dayName);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Launch popup immediately
    setSelectedClass(classData);
    setClassDate(date);
    setPopupStudentFilter('');
    setClassPopupOpen(true);
    setPopupLoading(true);

    // Reset state first to avoid showing old data
    setClassAttendance({
      wasHeld: true,
      startTime: scheduleForDay?.startTime || '',
      endTime: scheduleForDay?.endTime || '',
      students: [],
      notes: ''
    });

    try {
      const token = user?.token;

      // Fetch both in parallel
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
        // Mark class as processed if data exists
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
        // No existing data, initialize with hydrated students
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

  const searchStudents = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const token = user?.token;
      // Using existing search function in classAttendanceController
      const response = await axios.get(`${API_URL}/api/attendance/students/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { query, role: 'student' }
      });

      // The backend returns { success: true, students: [...] }
      setSearchResults(response.data.students || []);
    } catch (error) {
      console.error('Error searching students:', error);
      setSearchResults([]);
    }
  };

  const addTemporaryStudent = (student) => {
    if (!student) return;

    // Check if student is already in the attendance list to prevent duplicates
    const isAlreadyInList = classAttendance.students.some(s => s.studentId === student._id);

    if (isAlreadyInList) {
      toast.info(t('attendance.studentAlreadyInList'));
      setShowStudentSearch(false);
      setStudentSearch('');
      setSearchResults([]);
      return;
    }

    const studentName = student.name || `${student.firstName} ${student.lastName}`;

    setClassAttendance(prev => ({
      ...prev,
      students: [...prev.students, {
        studentId: student._id,
        name: studentName,
        present: true,
        note: 'Temporary assignment',
        isTemporary: true
      }]
    }));

    // Clear search and filter states so the newly added student is visible
    setStudentSearch('');
    setSearchResults([]);
    setShowStudentSearch(false);
    setPopupStudentFilter('');
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
      // Handle time mapping to capture local timezone offset
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

        // Mark class as processed with green tick
        const classKey = `${selectedClass._id}-${format(classDate, 'yyyy-MM-dd')}`;
        setProcessedClasses(prev => new Set([...prev, classKey]));

        setClassPopupOpen(false);
        setPopupStudentFilter('');
        setShowStudentSearch(false);
        setStudentSearch('');
        setSearchResults([]);
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

        // Remove from processed classes
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


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchInitialData} variant="outline">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            {t('attendance.weeklyManagement')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('attendance.manageWeeklyAttendance')}
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="semesterStart">{t('attendance.semesterStart')}</Label>
                <Input
                  id="semesterStart"
                  type="date"
                  value={semesterStart}
                  onChange={(e) => handleSemesterStartChange(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semesterEnd">{t('attendance.semesterEnd')}</Label>
                <Input
                  id="semesterEnd"
                  type="date"
                  value={semesterEnd}
                  onChange={(e) => handleSemesterEndChange(e.target.value)}
                  className="h-10"
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
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {weeksToShow.map((week) => (
          <Card
            key={week.offset}
            className={cn(
              "shadow-sm border",
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
                        <span className="font-bold">
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
                  <div className="divide-y">
                    {week.days.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayClasses = getClassesForDay(day);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div key={dateKey} className="group">
                          <Collapsible
                            open={expandedDays.has(dateKey)}
                            onOpenChange={() => toggleDay(day)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className={cn(
                                "flex items-center justify-between py-3 px-8 cursor-pointer hover:bg-muted/40 transition-colors border-l-4 group",
                                isToday ? "border-primary bg-primary/[0.04]" : "border-transparent"
                              )}>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "p-1 rounded-md transition-colors",
                                    isToday ? "bg-primary/10 text-primary" : "text-muted-foreground group-hover:bg-muted"
                                  )}>
                                    {expandedDays.has(dateKey) ?
                                      <ChevronDown className="w-3.5 h-3.5" /> :
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    }
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-sm font-semibold",
                                      isToday ? "text-primary" : "text-foreground"
                                    )}>
                                      {format(day, 'EEEE, MMM dd')}
                                    </span>
                                    {isToday && (
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary leading-none mt-0.5">
                                        {t('attendance.today')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                                  {dayClasses.length} {t('attendance.classes')}
                                </Badge>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="bg-muted/10 p-6 px-12">
                                {dayClasses.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic text-center py-4">
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
                                            "h-auto flex flex-col items-start p-4 text-left transition-[transform,shadow,border-color] border group relative hover:shadow-md hover:-translate-y-0.5",
                                            isProcessed
                                              ? "bg-primary/[0.05] border-primary/20 hover:bg-primary/[0.08]"
                                              : "bg-background hover:border-primary/50"
                                          )}
                                          onClick={() => openClassPopup(cls, day)}
                                        >
                                          <div className="flex items-center justify-between w-full mb-2">
                                            <div className="flex items-center gap-2">
                                              {isProcessed && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                              <span className="font-semibold text-sm">{cls.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground">
                                              <Clock className="w-3 h-3" />
                                              {cls.schedule?.find(sch => sch.day === format(day, 'EEEE'))?.startTime || '--:--'}
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 mt-auto">
                                            <Badge variant="outline" className="text-[9px] h-4 font-bold border-muted-foreground/30 text-muted-foreground uppercase leading-none">
                                              {cls.subject}
                                            </Badge>
                                            {isProcessed && (
                                              <Badge className="text-[9px] h-4 font-bold bg-primary/20 text-primary border-none uppercase leading-none">
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

      {/* Semester Change Confirmation Dialog */}
      <AlertDialog open={showSemesterConfirm} onOpenChange={setShowSemesterConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('attendance.confirmSemesterChange')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSemesterChange?.type === 'start'
                ? t('attendance.confirmSemesterStartChange', { date: pendingSemesterChange?.value })
                : t('attendance.confirmSemesterEndChange', { date: pendingSemesterChange?.value })
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSemesterChange}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSemesterChange}>{t('common.confirm')}</AlertDialogAction>
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
            <div className="p-6 space-y-6">
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
                className="px-6 h-9 font-medium shadow-md transition-all active:scale-95 shadow-primary/10"
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
