import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
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
  addMonths,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  Save,
  BookOpen,
  AlertCircle,
  Activity,
  Check,
  CalendarRange,
  Download,
  BarChart2,
} from "lucide-react";
import { API_URL } from "../../config/apiConfig";
import axios from "axios";
import { Spinner } from "../../components/ui/spinner";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";

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

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);



  const [processedClasses, setProcessedClasses] = useState(new Set());
  const [error, setError] = useState(null);

  // Calendar Date Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Class popup state
  const [selectedClass, setSelectedClass] = useState(null);
  const [classPopupOpen, setClassPopupOpen] = useState(false);
  const [classDate, setClassDate] = useState(null);
  const [classAttendance, setClassAttendance] = useState({
    wasHeld: false,
    startTime: "",
    endTime: "",
    students: [],
    notes: "",
  });

  const [popupStudentFilter, setPopupStudentFilter] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[TeacherAttendance] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data,
    });
  };

  const getClassesForDay = useCallback(
    (date) => {
      const dayName = format(date, "EEEE");
      return classes.filter((cls) => {
        const hasScheduleForDay = cls.schedule?.some(
          (sch) => sch.day === dayName,
        );
        return hasScheduleForDay && cls.active;
      });
    },
    [classes],
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTeacherClasses(), loadProcessedClasses()]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError(t("navigation.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const loadProcessedClasses = async () => {
    try {
      const token = user?.token;
      // Fetch statuses for a broad range around current date
      const startDate = format(addWeeks(new Date(), -4), "yyyy-MM-dd");
      const endDate = format(addWeeks(new Date(), 8), "yyyy-MM-dd");

      const response = await axios.get(
        `${API_URL}/api/attendance/processed-classes`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate },
        },
      );

      if (response.data && response.data.success && response.data.data) {
        const processedKeys = response.data.data.map(
          (item) => `${item.classId}-${item.date}`,
        );
        setProcessedClasses(new Set(processedKeys));
      }
    } catch (error) {
      console.error("Error loading processed classes:", error);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = user?.token;
      const response = await axios.get(
        `${API_URL}/api/classes/my-teaching-classes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data) {
        setClasses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Error fetching teacher classes:", error);
      toast.error(t("attendance.failedToLoadClasses"));
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

  const handleExportAttendances = () => {
    toast.info(
      t("attendance.exportTriggered") ||
        "Export functionality will be wired in a bit!",
    );
    logAction("Export monthly attendances triggered");
  };

  const openClassPopup = async (classData, date) => {
    const dayName = format(date, "EEEE");
    const scheduleForDay = classData.schedule?.find(
      (sch) => sch.day === dayName,
    );
    const dateStr = format(date, "yyyy-MM-dd");

    setSelectedClass(classData);
    setClassDate(date);
    setPopupStudentFilter("");
    setClassPopupOpen(true);
    setPopupLoading(true);

    setClassAttendance({
      wasHeld: true,
      startTime: scheduleForDay?.startTime || "",
      endTime: scheduleForDay?.endTime || "",
      students: [],
      notes: "",
    });

    try {
      const token = user?.token;
      const [studentsResponse, attendanceResponse] = await Promise.all([
        axios
          .get(`${API_URL}/api/classes/${classData._id}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${API_URL}/api/attendance/class-attendance`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { classId: classData._id, date: dateStr },
          })
          .catch(() => ({ data: { success: false } })),
      ]);

      const classStudents = studentsResponse.data || [];
      const existingData = attendanceResponse.data?.success
        ? attendanceResponse.data.data
        : null;

      if (existingData) {
        const classKey = `${classData._id}-${dateStr}`;
        setProcessedClasses((prev) => new Set([...prev, classKey]));

        setClassAttendance({
          wasHeld: existingData.wasHeld || false,
          startTime: existingData.startTime || scheduleForDay?.startTime || "",
          endTime: existingData.endTime || scheduleForDay?.endTime || "",
          students: classStudents.map((s) => {
            const existingStudent = existingData.students?.find(
              (es) => es.studentId === s._id || es.studentId?._id === s._id,
            );
            return {
              studentId: s._id,
              name: s.name,
              present: existingStudent ? existingStudent.present : true,
              note: existingStudent ? existingStudent.note : "",
            };
          }),
          notes: existingData.notes || "",
        });
      } else {
        setClassAttendance((prev) => ({
          ...prev,
          students: classStudents.map((s) => ({
            studentId: s._id,
            name: s.name,
            present: true,
            note: "",
          })),
        }));
      }
    } catch (error) {
      console.error("Error opening class popup:", error);
      toast.error(t("attendance.failedToLoadAttendance"));
    } finally {
      setPopupLoading(false);
    }
  };

  const updateStudentAttendance = useCallback((studentId, field, value) => {
    setClassAttendance((prev) => ({
      ...prev,
      students: prev.students.map((student) =>
        student.studentId === studentId
          ? { ...student, [field]: value }
          : student,
      ),
    }));
  }, []);

  const handleToggleAttendance = useCallback(
    (studentId, shouldBePresent) => {
      updateStudentAttendance(studentId, "present", shouldBePresent);
    },
    [updateStudentAttendance],
  );

  const handleNoteChange = useCallback(
    (studentId, note) => {
      updateStudentAttendance(studentId, "note", note);
    },
    [updateStudentAttendance],
  );

  const filteredPopupStudents = useMemo(() => {
    return classAttendance.students.filter(
      (s) =>
        !popupStudentFilter ||
        s.name?.toLowerCase().includes(popupStudentFilter.toLowerCase()),
    );
  }, [classAttendance.students, popupStudentFilter]);

  const saveClassAttendance = async () => {
    try {
      const token = user?.token;
      const startDateTime = new Date(
        `${format(classDate, "yyyy-MM-dd")}T${classAttendance.startTime}:00`,
      );
      const endDateTime = new Date(
        `${format(classDate, "yyyy-MM-dd")}T${classAttendance.endTime}:00`,
      );

      const attendanceData = {
        classId: selectedClass._id,
        date: format(classDate, "yyyy-MM-dd"),
        wasHeld: classAttendance.wasHeld,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        students: classAttendance.students,
        notes: classAttendance.notes,
      };

      const response = await axios.post(
        `${API_URL}/api/attendance/class-session`,
        attendanceData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data && response.data.success) {
        toast.success(t("attendance.attendanceSaved"));
        const classKey = `${selectedClass._id}-${format(classDate, "yyyy-MM-dd")}`;
        setProcessedClasses((prev) => new Set([...prev, classKey]));
        setClassPopupOpen(false);
        logAction("Attendance saved successfully");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(t("attendance.failedToSaveAttendance"));
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
            {t("attendance.managementTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("attendance.managementDescription")}
          </p>
        </div>
      </div>

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
              {/* <Button
                size="sm"
                variant="outline"
                onClick={handleExportAttendances}
                className="h-8 gap-1.5 font-bold text-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("attendance.export") || "Export"}</span>
              </Button> */}
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

        {/* Right Schedule Column */}
        <div className="lg:col-span-2 flex flex-col lg:h-full order-1 lg:order-2">
          <Card className="shadow-sm border bg-card p-6 flex-1 flex flex-col">
            {/* Header controls (arranged in a row on mobile and desktop without wrapping/stacking) */}
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

            {/* Selected Date Classes Details (Line List Format) */}
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
                  {classDate && format(classDate, "EEEE, MMM dd, yyyy")}
                </DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 pr-10">
              <Badge variant="secondary" className="font-mono">
                {classAttendance.students.length} {t("attendance.total")}
              </Badge>
              <Badge
                variant={
                  classAttendance.students.some((s) => !s.present)
                    ? "destructive"
                    : "outline"
                }
                className="font-mono"
              >
                {classAttendance.students.filter((s) => !s.present).length}{" "}
                {t("attendance.absent")}
              </Badge>
            </div>
          </DialogHeader>

          {popupLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner size="lg" className="text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                {t("common.loading")}
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
                        setClassAttendance((prev) => ({
                          ...prev,
                          wasHeld: checked,
                        }))
                      }
                    />
                    <Label
                      htmlFor="wasHeld"
                      className="text-sm font-semibold cursor-pointer"
                    >
                      {t("attendance.classWasHeld")}
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        {t("attendance.startTime")}
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={classAttendance.startTime}
                          className="pl-9 h-10 font-mono"
                          onChange={(e) =>
                            setClassAttendance((prev) => ({
                              ...prev,
                              startTime: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        {t("attendance.endTime")}
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={classAttendance.endTime}
                          className="pl-9 h-10 font-mono"
                          onChange={(e) =>
                            setClassAttendance((prev) => ({
                              ...prev,
                              endTime: e.target.value,
                            }))
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
                  <h3 className="text-base font-semibold text-foreground">
                    {t("attendance.students")}
                  </h3>
                  <div className="relative w-full sm:w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("attendance.searchByName")}
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
                      <p className="text-sm font-medium">
                        {t("attendance.noResults")}
                      </p>
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
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={popupLoading}
              className="px-6 h-9 font-medium shadow-md transition-all active:scale-95 shadow-primary/10"
              onClick={saveClassAttendance}
            >
              <Save className="w-3.5 h-3.5 mr-2" />
              {t("attendance.saveAttendance")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAttendance;
