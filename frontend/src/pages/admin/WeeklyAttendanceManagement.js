import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../../config/appConfig';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  FileText,
  Download,
  Filter,
  Search,
  Plus,
  Save,
  X,
  Check
} from 'lucide-react';

const WeeklyAttendanceManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [schoolBranches, setSchoolBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [semesterStart, setSemesterStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [semesterEnd, setSemesterEnd] = useState(format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'));
  const [error, setError] = useState(null);

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
      const branches = [...new Set(classes.map(cls => cls.schoolBranch))].filter(Boolean);
      setSchoolBranches(branches);
    } catch (error) {
      console.error('Error processing school branches:', error);
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

      await axios.post(`${API_URL}/api/attendance/class-session`, attendanceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(t('attendance.attendanceSaved'));
      setClassPopupOpen(false);
      logAction('Class attendance saved successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('attendance.weeklyManagement')}</h1>
          <p className="text-gray-600">{t('attendance.manageWeeklyAttendance')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
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
                onChange={(e) => setSemesterStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="semesterEnd">{t('attendance.semesterEnd')}</Label>
              <Input
                id="semesterEnd"
                type="date"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
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
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
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
          <Card key={week.offset} className={week.isCurrent ? 'border-blue-500 bg-blue-50' : ''}>
            <Collapsible
              open={expandedWeeks.has(week.offset)}
              onOpenChange={() => toggleWeek(week.offset)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
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
                      <Card key={dateKey} className={isToday ? 'border-green-500 bg-green-50' : 'border-gray-200'}>
                        <Collapsible
                          open={expandedDays.has(dateKey)}
                          onOpenChange={() => toggleDay(day)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                              <CardTitle className="flex items-center justify-between text-base">
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
                                <Badge variant="outline">{dayClasses.length} {t('attendance.classes')}</Badge>
                              </CardTitle>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {dayClasses.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">{t('attendance.noClassesScheduled')}</p>
                              ) : (
                                <div className="grid gap-3">
                                  {dayClasses.map(classData => {
                                    const scheduleForDay = classData.schedule?.find(sch => sch.day === format(day, 'EEEE'));
                                    
                                    return (
                                      <Card 
                                        key={classData._id}
                                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => openClassPopup(classData, day)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <h4 className="font-semibold">{classData.name}</h4>
                                              <p className="text-sm text-gray-600">
                                                {classData.subject} - {classData.direction}
                                              </p>
                                              <p className="text-sm text-gray-500">
                                                {scheduleForDay?.startTime} - {scheduleForDay?.endTime}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">{classData.schoolBranch}</Badge>
                                              <Users className="w-4 h-4 text-gray-400" />
                                              <span className="text-sm text-gray-500">{classData.students?.length || 0}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
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
