import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
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
  CheckCircle2 
} from 'lucide-react';
import { API_URL } from '../../config/apiConfig';
import axios from 'axios';
import { Spinner } from '../../components/ui/spinner';


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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchClasses(),
        fetchSchoolBranches()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

  const openClassPopup = (classData, date) => {
    const dayName = format(date, 'EEEE');
    const scheduleForDay = classData.schedule?.find(sch => sch.day === dayName);
    
    setSelectedClass(classData);
    setClassDate(date);
    setClassAttendance({
      wasHeld: false,
      startTime: scheduleForDay?.startTime || '',
      endTime: scheduleForDay?.endTime || '',
      students: classData.students?.map(studentId => ({
        studentId,
        present: false,
        note: ''
      })) || [],
      notes: ''
    });
    setClassPopupOpen(true);
  };

  const searchStudents = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { query, role: 'student' }
      });
      
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching students:', error);
      setSearchResults([]);
    }
  };

  const addTemporaryStudent = (student) => {
    setClassAttendance(prev => ({
      ...prev,
      students: [...prev.students, {
        studentId: student._id,
        present: false,
        note: 'Temporary assignment',
        isTemporary: true
      }]
    }));
    setStudentSearch('');
    setSearchResults([]);
    setShowStudentSearch(false);
  };

  const updateStudentAttendance = (studentId, field, value) => {
    setClassAttendance(prev => ({
      ...prev,
      students: prev.students.map(student => 
        student.studentId === studentId 
          ? { ...student, [field]: value }
          : student
      )
    }));
  };

  const saveClassAttendance = async () => {
    try {
      logAction('Saving class attendance', { classId: selectedClass._id, date: classDate });
      
      const token = localStorage.getItem('token');
      const attendanceData = {
        classId: selectedClass._id,
        date: format(classDate, 'yyyy-MM-dd'),
        wasHeld: classAttendance.wasHeld,
        startTime: classAttendance.startTime,
        endTime: classAttendance.endTime,
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

  const exportAttendance = async (type, filterId = null) => {
    try {
      logAction('Exporting attendance', { type, filterId });
      
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/reports/attendance/export`;
      const params = { type };
      
      if (filterId) {
        params.filterId = filterId;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `attendance-${type}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(t('attendance.exportCompleted'));
    } catch (error) {
      console.error('Error exporting attendance:', error);
      toast.error(t('attendance.exportFailed'));
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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('attendance.weeklyManagement')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('attendance.manageWeeklyAttendance')}
        </p>
      </div>
        
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Export buttons */}
        <Select onValueChange={(value) => exportAttendance(value)}>
          <SelectTrigger className="w-40">
            <Download className="w-4 h-4" />
            <span>{t('attendance.export')}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('attendance.exportAll')}</SelectItem>
            <SelectItem value="class">{t('attendance.exportByClass')}</SelectItem>
            <SelectItem value="student">{t('attendance.exportByStudent')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Semester Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('attendance.semesterDates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="semesterStart">{t('attendance.semesterStart')}</Label>
              <Input
                id="semesterStart"
                type="date"
                value={semesterStart}
                onChange={(e) => handleSemesterStartChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="semesterEnd">{t('attendance.semesterEnd')}</Label>
              <Input
                id="semesterEnd"
                type="date"
                value={semesterEnd}
                onChange={(e) => handleSemesterEndChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="branchFilter">{t('attendance.schoolBranch')}</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
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

      {/* Weekly View */}
      <div className="space-y-4">
        {weeksToShow.map(week => (
          <Card key={week.offset} className={week.isCurrent ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400' : 'dark:bg-gray-800 dark:border-gray-700'}>
            <Collapsible
              open={expandedWeeks.has(week.offset)}
              onOpenChange={() => toggleWeek(week.offset)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      {expandedWeeks.has(week.offset) ? 
                        <ChevronDown className="w-5 h-5" /> : 
                        <ChevronRight className="w-5 h-5" />
                      }
                      <span>
                        {format(week.start, 'MMM dd')} - {format(week.end, 'MMM dd, yyyy')}
                        {week.isCurrent && <Badge className="ml-2">{t('attendance.currentWeek')}</Badge>}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {week.days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayClasses = getClassesForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <Card key={dateKey} className={isToday ? 'border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-400' : 'border-gray-200 dark:border-gray-600 dark:bg-gray-800'}>
                        <Collapsible
                          open={expandedDays.has(dateKey)}
                          onOpenChange={() => toggleDay(day)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 py-3">
                              <CardTitle className="flex items-center justify-between text-base text-gray-900 dark:text-gray-100">
                                <div className="flex items-center gap-2">
                                  {expandedDays.has(dateKey) ? 
                                    <ChevronDown className="w-4 h-4" /> : 
                                    <ChevronRight className="w-4 h-4" />
                                  }
                                  <span>
                                    {format(day, 'EEEE, MMM dd')}
                                    {isToday && <Badge variant="secondary" className="ml-2">{t('attendance.today')}</Badge>}
                                  </span>
                                </div>
                                <Badge variant="outline" className="dark:border-gray-500 dark:text-gray-300">{dayClasses.length} {t('attendance.classes')}</Badge>
                              </CardTitle>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {dayClasses.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('attendance.noClassesScheduled')}</p>
                              ) : (
                                <div className="grid gap-3">
                                  {dayClasses.map(cls => {
                                    const classKey = `${cls._id}-${format(day, 'yyyy-MM-dd')}`;
                                    const isProcessed = processedClasses.has(classKey);
                                    
                                    return (
                                      <Button
                                        key={cls._id}
                                        variant="outline"
                                        className={`w-full justify-between dark:border-gray-600 dark:hover:bg-gray-700 ${
                                          isProcessed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''
                                        }`}
                                        onClick={() => openClassPopup(cls, day)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isProcessed && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                          <Users className="w-4 h-4" />
                                          <span className="font-medium dark:text-gray-100">{cls.name}</span>
                                          <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-300">{cls.subject}</Badge>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                          {cls.schedule?.find(sch => sch.day === format(day, 'EEEE'))?.startTime || 'No time set'}
                                        </span>
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedClass?.name} - {classDate && format(classDate, 'EEEE, MMM dd, yyyy')}
            </DialogTitle>
            <DialogDescription>
              {t('attendance.markAttendanceForClass')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Class Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wasHeld"
                checked={classAttendance.wasHeld}
                onCheckedChange={(checked) => 
                  setClassAttendance(prev => ({ ...prev, wasHeld: checked }))
                }
              />
              <Label htmlFor="wasHeld" className="font-medium">
                {t('attendance.classWasHeld')}
              </Label>
            </div>

            {/* Time Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">{t('attendance.startTime')}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={classAttendance.startTime}
                  onChange={(e) => 
                    setClassAttendance(prev => ({ ...prev, startTime: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">{t('attendance.endTime')}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={classAttendance.endTime}
                  onChange={(e) => 
                    setClassAttendance(prev => ({ ...prev, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Student List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-medium">{t('attendance.students')}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStudentSearch(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('attendance.addStudent')}
                </Button>
              </div>

              {/* Student Search */}
              {showStudentSearch && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" />
                    <Input
                      placeholder={t('attendance.searchStudents')}
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        searchStudents(e.target.value);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowStudentSearch(false);
                        setStudentSearch('');
                        setSearchResults([]);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {searchResults.map(student => (
                        <div
                          key={student._id}
                          className="flex items-center justify-between p-2 bg-white rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => addTemporaryStudent(student)}
                        >
                          <span>{student.name}</span>
                          <Plus className="w-4 h-4" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Student Attendance List */}
              <div className="space-y-3">
                {classAttendance.students.map((student, index) => (
                  <Card key={student.studentId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={student.present}
                          onCheckedChange={(checked) => 
                            updateStudentAttendance(student.studentId, 'present', checked)
                          }
                        />
                        <div>
                          <p className="font-medium">Student {index + 1}</p>
                          {student.isTemporary && (
                            <Badge variant="secondary" className="text-xs">
                              {t('attendance.temporary')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Input
                        placeholder={t('attendance.note')}
                        value={student.note}
                        onChange={(e) => 
                          updateStudentAttendance(student.studentId, 'note', e.target.value)
                        }
                        className="w-48"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{t('attendance.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('attendance.additionalNotes')}
                value={classAttendance.notes}
                onChange={(e) => 
                  setClassAttendance(prev => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClassPopupOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveClassAttendance}>
              <Save className="w-4 h-4 mr-2" />
              {t('attendance.saveAttendance')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAttendanceManagement;
