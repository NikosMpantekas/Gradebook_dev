import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { getClasses, deleteClass, createClass, updateClass } from '../../features/classes/classSlice';
import { getSchools } from '../../features/schools/schoolSlice';
import { getUsers } from '../../features/users/userSlice';
import { useTranslation } from 'react-i18next';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Search as SearchIcon,
  Clock as ScheduleIcon,
  Building as SchoolIcon,
  Users as GroupIcon,
  User as PersonIcon,
  BookOpen as BookIcon,
  X as ClearIcon
} from 'lucide-react';

// Import our custom components
import { useIsMobile } from '../../components/hooks/use-mobile';

const ManageClasses = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useSelector((state) => state.auth);
  const { classes: reduxClasses, isLoading, isError, message } = useSelector(
    (state) => state.classes
  );
  const { schools } = useSelector((state) => state.schools);
  const { users } = useSelector((state) => state.users);
  const { t } = useTranslation();
  
  // State for dialog operations
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [localLoading, setLocalLoading] = useState(true);
  const [forceRefreshTrigger, setForceRefreshTrigger] = useState(0);
  
  // State for form tabs
  const [tabValue, setTabValue] = useState('basic');
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  // Force the branch school for new classes
  const branchSchoolId = '6834cef6ae7eb00ba4d0820d'; // Φροντιστήριο Βαθύ
  
  const [classData, setClassData] = useState({
    subjectName: '',
    directionName: '',
    schoolId: branchSchoolId, // Pre-select branch school
    students: [],
    teachers: [],
    schedule: [
      { day: 'Monday', startTime: '', endTime: '', active: false },
      { day: 'Tuesday', startTime: '', endTime: '', active: false },
      { day: 'Wednesday', startTime: '', endTime: '', active: false },
      { day: 'Thursday', startTime: '', endTime: '', active: false },
      { day: 'Friday', startTime: '', endTime: '', active: false },
      { day: 'Saturday', startTime: '', endTime: '', active: false },
      { day: 'Sunday', startTime: '', endTime: '', active: false },
    ],
  });
  
  // States for filtering teachers and students
  const [teacherFilter, setTeacherFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  
  // Filtered lists
  const filteredTeachers = useMemo(() => {
    return users
      .filter(user => user.role === 'teacher')
      .filter(teacher => 
        teacher.firstName?.toLowerCase().includes(teacherFilter.toLowerCase()) || 
        teacher.lastName?.toLowerCase().includes(teacherFilter.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(teacherFilter.toLowerCase())
      );
  }, [users, teacherFilter]);
  
  const filteredStudents = useMemo(() => {
    return users
      .filter(user => user.role === 'student')
      .filter(student => 
        student.firstName?.toLowerCase().includes(studentFilter.toLowerCase()) || 
        student.lastName?.toLowerCase().includes(studentFilter.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentFilter.toLowerCase())
      );
  }, [users, studentFilter]);

  // Filter classes when searchTerm or classes changes
  const applyFilters = useCallback(() => {
    // If no classes yet from Redux, don't try to filter
    if (!reduxClasses) {
      setFilteredClasses([]);
      return;
    }
    
    // If no search term, use all classes
    if (!searchTerm.trim()) {
      setFilteredClasses(reduxClasses);
      return;
    }

    console.log(`Filtering ${reduxClasses.length} classes with term: ${searchTerm}`);
    
    const filtered = reduxClasses.filter((cls) => {
      // Search in all text fields
      return (
        cls.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.direction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.teachers?.some(
          (t) =>
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        cls.students?.some(
          (s) =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    });

    setFilteredClasses(filtered);
    console.log(`Found ${filtered.length} classes matching search term`);
  }, [searchTerm, reduxClasses]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, reduxClasses, applyFilters]);

  // Load all required data
  const loadData = async () => {
    try {
      setLocalLoading(true);
      await dispatch(getClasses()).unwrap();
      await dispatch(getSchools()).unwrap();
      await dispatch(getUsers()).unwrap();
      console.log('Initial data load complete');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load required data');
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // This will run when component unmounts
    return () => {
      console.log('ManageClasses component unmounting');
    };
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }
  }, [isError, message]);

  // Force refresh function that can be called when we need to ensure the UI updates
  const forceRefreshClasses = useCallback(async () => {
    try {
      console.log('Force refreshing classes list');
      setLocalLoading(true);
      await dispatch(getClasses()).unwrap();
      setForceRefreshTrigger(prev => prev + 1); // Increment trigger to force re-render
      console.log('Classes refreshed successfully');
    } catch (error) {
      console.error('Error refreshing classes:', error);
      toast.error('Failed to refresh classes data');
    } finally {
      setLocalLoading(false);
    }
  }, [dispatch]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setDeleteId(null);
  };

  const handleAdd = () => {
    setFormMode('add');
    
    // Reset the filters too
    setTeacherFilter('');
    setStudentFilter('');
    
    setClassData({
      subjectName: '',
      directionName: '',
      schoolId: branchSchoolId, // Always use the branch school ID
      students: [],
      teachers: [],
      schedule: [
        { day: 'Monday', startTime: '', endTime: '', active: false },
        { day: 'Tuesday', startTime: '', endTime: '', active: false },
        { day: 'Wednesday', startTime: '', endTime: '', active: false },
        { day: 'Thursday', startTime: '', endTime: '', active: false },
        { day: 'Friday', startTime: '', endTime: '', active: false },
        { day: 'Saturday', startTime: '', endTime: '', active: false },
        { day: 'Sunday', startTime: '', endTime: '', active: false },
      ],
    });
    setFormOpen(true);
  };

  // CRITICAL FIX: Enhanced handleFormClose function to properly reset all states
  const handleFormClose = () => {
    console.log('Closing form and resetting all states');
    
    // Reset submission state immediately to fix "updating forever" issue
    setIsSubmitting(false);
    
    // Close the dialog
    setFormOpen(false);
    setOpen(false);
    
    // Reset form when dialog closes
    setClassData({
      subjectName: '',
      directionName: '',
      schoolId: branchSchoolId,
      students: [],
      teachers: [],
      schedule: [
        { day: 'Monday', active: false, startTime: '', endTime: '' },
        { day: 'Tuesday', active: false, startTime: '', endTime: '' },
        { day: 'Wednesday', active: false, startTime: '', endTime: '' },
        { day: 'Thursday', active: false, startTime: '', endTime: '' },
        { day: 'Friday', active: false, startTime: '', endTime: '' },
        { day: 'Saturday', active: false, startTime: '', endTime: '' },
        { day: 'Sunday', active: false, startTime: '', endTime: '' },
      ],
    });
    
    // Reset the form mode and tabs
    setFormMode('add');
    setTabValue('basic');
    
    // Force refresh classes with a short delay to ensure backend is updated
    setTimeout(() => {
      forceRefreshClasses().catch(err => {
        console.error('Error in delayed refresh after form close:', err);
        toast.error('Could not refresh class list');
      });
    }, 500);
  };
  
  const handleEdit = (classItem) => {
    console.log('Editing class:', classItem);
    setFormMode('edit');
    
    // Create complete schedule template with all days of the week
    const fullWeekTemplate = [
      { day: 'Monday', startTime: '', endTime: '', active: false },
      { day: 'Tuesday', startTime: '', endTime: '', active: false },
      { day: 'Wednesday', startTime: '', endTime: '', active: false },
      { day: 'Thursday', startTime: '', endTime: '', active: false },
      { day: 'Friday', startTime: '', endTime: '', active: false },
      { day: 'Saturday', startTime: '', endTime: '', active: false },
      { day: 'Sunday', startTime: '', endTime: '', active: false },
    ];
    
    // Map existing schedule to the template
    let processedSchedule = [...fullWeekTemplate];
    if (classItem.schedule && Array.isArray(classItem.schedule)) {
      // Process each day in the existing schedule
      classItem.schedule.forEach(item => {
        // Find the day in our template
        const dayIndex = processedSchedule.findIndex(d => d.day === item.day);
        if (dayIndex >= 0) {
          // Update the template with the existing schedule data
          processedSchedule[dayIndex] = {
            ...processedSchedule[dayIndex],
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            active: true // If it's in the schedule, it's active
          };
        }
      });
    }
    
    // Get the IDs of teachers and students
    const teacherIds = (classItem.teachers || []).map(teacher => 
      typeof teacher === 'string' ? teacher : teacher._id
    );
    
    const studentIds = (classItem.students || []).map(student => 
      typeof student === 'string' ? student : student._id
    );
    
    // Store the class ID for update operation
    const classId = classItem._id;
    
    setClassData({
      _id: classId, // Store the ID in the state
      subjectName: classItem.subject || classItem.subjectName || '',
      directionName: classItem.direction || classItem.directionName || '',
      schoolId: classItem.schoolBranch || classItem.schoolId || '',
      students: studentIds,
      teachers: teacherIds,
      schedule: processedSchedule,
    });
    
    console.log('Setting form data:', {
      _id: classId,
      subjectName: classItem.subject || classItem.subjectName || '',
      directionName: classItem.direction || classItem.directionName || '',
      schoolId: classItem.schoolBranch || classItem.schoolId || '',
      students: studentIds.length,
      teachers: teacherIds.length,
      schedule: processedSchedule
    });
    
    setFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setClassData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...classData.schedule];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      [field]: value,
    };
    
    // If setting times on an inactive day, auto-activate it
    if ((field === 'startTime' || field === 'endTime') && value && !updatedSchedule[index].active) {
      updatedSchedule[index].active = true;
    }
    
    setClassData((prevData) => ({
      ...prevData,
      schedule: updatedSchedule,
    }));
  };
  
  // Toggle teacher selection with checkbox
  const handleTeacherToggle = (teacherId) => {
    setClassData(prevData => {
      const isSelected = prevData.teachers.includes(teacherId);
      const updatedTeachers = isSelected 
        ? prevData.teachers.filter(id => id !== teacherId)
        : [...prevData.teachers, teacherId];
        
      return {
        ...prevData,
        teachers: updatedTeachers
      };
    });
  };
  
  // Toggle student selection with checkbox
  const handleStudentToggle = (studentId) => {
    setClassData(prevData => {
      const isSelected = prevData.students.includes(studentId);
      const updatedStudents = isSelected 
        ? prevData.students.filter(id => id !== studentId)
        : [...prevData.students, studentId];
        
      return {
        ...prevData,
        students: updatedStudents
      };
    });
  };
  
  // Toggle day activation in schedule
  const handleDayToggle = (index) => {
    const updatedSchedule = [...classData.schedule];
    const newActiveState = !updatedSchedule[index].active;
    
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      active: newActiveState,
      // Keep times if activating, reset if deactivating
      startTime: newActiveState ? updatedSchedule[index].startTime : '',
      endTime: newActiveState ? updatedSchedule[index].endTime : '',
    };
    
    console.log(`Toggling day ${updatedSchedule[index].day} to ${newActiveState ? 'active' : 'inactive'}`);
    
    setClassData(prevData => ({
      ...prevData,
      schedule: updatedSchedule
    }));
  };
  
  // Enhanced form submission handler to fix "updating forever" issue
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    console.log('Starting form submission, setting isSubmitting=true');
    setIsSubmitting(true);

    if (!classData.subjectName || !classData.directionName || !classData.schoolId) {
      toast.error('Subject name, direction name, and school are required');
      setIsSubmitting(false);
      return;
    }

    // Prepare active schedule days for submission
    const activeScheduleDays = classData.schedule
      .filter((day) => day.active)
      .map((day) => {
        // Validate time entries
        if (!day.startTime || !day.endTime) {
          toast.error(`Please complete time entries for ${day.day}`);
          setIsSubmitting(false);
          return null;
        }
        // Remove the 'active' flag before submission
        const { active, ...scheduleDayWithoutActive } = day;
        return scheduleDayWithoutActive;
      });

    // Check if any schedule validation failed
    if (activeScheduleDays.includes(null)) {
      return; // Stop if validation failed for any day
    }

    // Prepare submission data
    const submissionData = {
      ...classData,
      subject: classData.subjectName,
      direction: classData.directionName,
      schoolBranch: classData.schoolId,
      schedule: activeScheduleDays,
    };
    
    try {
      if (formMode === 'add') {
        // Create a new class
        console.log('Creating new class with data:', submissionData);
        try {
          const addResult = await dispatch(createClass(submissionData)).unwrap();
          console.log('Class creation result:', addResult);
          toast.success('Class created successfully');
          
          // Close dialog first then refresh data to avoid UI jank
          handleFormClose(); // This already resets isSubmitting
        } catch (createError) {
          console.error('Failed to create class:', createError);
          toast.error(`Creation failed: ${createError?.message || 'Unknown error'}`);
          setIsSubmitting(false); // Only reset here if handleFormClose isn't called
        }
      } else {
        // For update mode, verify we have a class ID
        if (!classData._id) {
          console.error('Cannot update class: Missing class ID');
          toast.error('Cannot update class: Missing ID');
          setIsSubmitting(false);
          return;
        }
        
        // CRITICAL FIX: Ensure the ID is properly set with priority
        const classIdToUse = classData._id;
        const enhancedData = {
          ...submissionData,
          _id: classIdToUse,  // Primary ID format
          id: classIdToUse    // Alternative ID format for robustness
        };
        
        console.log('Updating class with ID:', classIdToUse);
        console.log('Full update payload:', enhancedData);
        
        try {
          console.log('Dispatching updateClass action...');
          const updateResult = await dispatch(updateClass(enhancedData)).unwrap();
          console.log('Class update API success:', updateResult);
          
          // CRITICAL FIX: Always close dialog on success to prevent "updating forever"
          toast.success('Class updated successfully');
          handleFormClose(); // This function now resets isSubmitting and refreshes data
          
          console.log('Update workflow complete, dialog closed and refresh triggered');
        } catch (updateError) {
          // Handle errors properly
          console.error('Class update operation failed:', updateError);
          toast.error(`Update failed: ${updateError?.message || 'Unknown error'}`);
          
          // IMPORTANT: Always close dialog and reset states even on error
          handleFormClose();
        }
      }
    } catch (generalError) {
      // This catches any other errors not caught by the inner try-catch blocks
      console.error('Unhandled form submission error:', generalError);
      toast.error(generalError?.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };  

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      await dispatch(deleteClass(deleteId)).unwrap();
      toast.success('Class deleted successfully');
      handleClose();
    } catch (error) {
      toast.error(`Error deleting class: ${error?.message || 'Unknown error'}`);
    }
  };

  // Mobile card layout for classes
  const renderMobileContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
          <span className="ml-2 text-sm text-foreground">Loading classes...</span>
        </div>
      );
    }

    if (!filteredClasses || filteredClasses.length === 0) {
      return (
        <div className="py-4 text-center">
          <p className="text-muted-foreground">
            No classes found.
          </p>
        </div>
      );
    }

    return (
      <div className="px-1 sm:px-2">
        {filteredClasses.map((classItem) => (
          <Card
            key={classItem._id}
            className="mb-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 dark:border-gray-600 dark:hover:shadow-gray-800/50"
          >
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12 flex-shrink-0 bg-primary">
                  <AvatarFallback>
                    <BookIcon className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
                      {classItem.subject || classItem.subjectName}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {classItem.direction || classItem.directionName}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {schools?.find((s) => s._id === classItem.schoolBranch || s._id === classItem.schoolId)?.name || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.students?.length || 0} students
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <PersonIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.teachers?.length || 0} teachers
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ScheduleIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.schedule && classItem.schedule.length > 0 ? 'Has schedule' : 'No schedule'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end mt-4 gap-2">
                {classItem.schedule && classItem.schedule.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleEdit(classItem);
                      setTabValue('schedule'); // Go directly to schedule tab
                    }}
                    title="View Schedule"
                    className="hover:bg-muted dark:hover:bg-gray-700"
                  >
                    <ScheduleIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleEdit(classItem);
                    setTabValue('basic'); // Go to basic info tab
                  }}
                  title="Edit Class"
                  className="hover:bg-muted dark:hover:bg-gray-700"
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(classItem._id)}
                  title="Delete Class"
                  className="hover:bg-red-700 dark:hover:bg-red-600"
                >
                  <DeleteIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Desktop table layout
  const renderDesktopContent = () => {
    return (
      <div className="mt-6 rounded-lg border bg-card dark:border-gray-600">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left p-4 text-foreground font-medium">
                  Subject
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Direction
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  School
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Students
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Teachers
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Schedule
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex justify-center items-center gap-3 py-6">
                      <Spinner size="sm" />
                      <span className="text-base text-foreground">Loading classes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClasses && filteredClasses.length > 0 ? (
                filteredClasses.map((classItem) => (
                  <tr key={classItem._id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-800">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 bg-primary">
                          <AvatarFallback className="text-xs">
                            <BookIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-base">
                          {classItem.subject || classItem.subjectName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {classItem.direction || classItem.directionName}
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {schools?.find((s) => s._id === classItem.schoolBranch || s._id === classItem.schoolId)?.name || 'N/A'}
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {classItem.students?.length || 0} students
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {classItem.teachers?.length || 0} teachers
                    </td>
                    <td className="p-4">
                      {classItem.schedule && classItem.schedule.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEdit(classItem);
                            setTabValue('schedule'); // Go directly to schedule tab
                          }}
                          title="View Schedule"
                          className="hover:bg-muted dark:hover:bg-gray-700"
                        >
                          <ScheduleIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No schedule</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEdit(classItem);
                            setTabValue('basic'); // Go to basic info tab
                          }}
                          title="Edit Class"
                          className="hover:bg-muted dark:hover:bg-gray-700 px-4 py-2"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(classItem._id)}
                          title="Delete Class"
                          className="hover:bg-red-700 dark:hover:bg-red-600 px-4 py-2"
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <span className="text-muted-foreground text-base">No classes found.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Show loading state if data is being loaded
  if (localLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="xl" />
          <span className="ml-2 text-base text-foreground">{t('admin.manageClassesPage.messages.loadingClasses')}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.manageClassesPage.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.manageClassesPage.subtitle')}
        </p>
      </div>
      
      {/* Search and add controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.manageClassesPage.searchPlaceholder')}
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleAdd}
          className="w-full sm:w-auto gap-2"
        >
          <AddIcon className="h-4 w-4" />
          {t('admin.manageClassesPage.addClass')}
        </Button>
      </div>
      
      {/* Classes table */}
      {isMobile ? renderMobileContent() : renderDesktopContent()}
      
      {/* Delete confirmation dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.manageClassesPage.dialogs.deleteClass.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.manageClassesPage.dialogs.deleteClass.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit form dialog */}
      <Dialog open={formOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? t('admin.manageClassesPage.dialogs.addClass.title') : t('admin.manageClassesPage.dialogs.editClass.title')}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t('admin.manageClassesPage.tabs.basicInfo')}</TabsTrigger>
                <TabsTrigger value="people">{t('admin.manageClassesPage.tabs.people')}</TabsTrigger>
                <TabsTrigger value="schedule">{t('admin.manageClassesPage.tabs.schedule')}</TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subjectName" className="text-sm font-medium">
                      {t('admin.manageClassesPage.form.subjectName')} *
                    </Label>
                    <Input
                      id="subjectName"
                      name="subjectName"
                      value={classData.subjectName}
                      onChange={handleFormChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="directionName" className="text-sm font-medium">
                      {t('admin.manageClassesPage.form.directionName')} *
                    </Label>
                    <Input
                      id="directionName"
                      name="directionName"
                      value={classData.directionName}
                      onChange={handleFormChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="schoolId" className="text-sm font-medium">
                      {t('admin.manageClassesPage.form.school')} *
                    </Label>
                    <Select
                      name="schoolId"
                      value={classData.schoolId}
                      onValueChange={(value) => handleFormChange({ target: { name: 'schoolId', value } })}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('admin.manageClassesPage.form.school')} />
                      </SelectTrigger>
                      <SelectContent>
                        {schools && schools.length > 0 ? (
                          schools.map((school) => (
                            <SelectItem key={school._id} value={school._id}>
                              {school.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem disabled>{t('admin.manageClassesPage.form.noSchoolsAvailable')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              {/* Students & Teachers Tab */}
              <TabsContent value="people" className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-4 block">
                    {t('admin.manageClassesPage.form.selectStudents')}
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                    {filteredStudents.map((student) => (
                      <div key={student._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`student-${student._id}`}
                          checked={classData.students.includes(student._id)}
                          onCheckedChange={() => handleStudentToggle(student._id)}
                        />
                        <Label htmlFor={`student-${student._id}`} className="text-sm">
                          {student.firstName} {student.lastName} • {student.email}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {classData.students.length > 0 && (
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClassData({...classData, students: []})}
                        className="gap-2"
                      >
                        <ClearIcon className="h-4 w-4" />
                        {t('common.clearAll')}
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium mb-4 block">
                    {t('admin.manageClassesPage.form.selectTeachers')}
                  </Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                    {filteredTeachers.map((teacher) => (
                      <div key={teacher._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`teacher-${teacher._id}`}
                          checked={classData.teachers.includes(teacher._id)}
                          onCheckedChange={() => handleTeacherToggle(teacher._id)}
                        />
                        <Label htmlFor={`teacher-${teacher._id}`} className="text-sm">
                          {teacher.firstName} {teacher.lastName} • {teacher.email}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {classData.teachers.length > 0 && (
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClassData({...classData, teachers: []})}
                        className="gap-2"
                      >
                        <ClearIcon className="h-4 w-4" />
                        {t('common.clearAll')}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-4">
                <div>
                  <Label className="text-base font-medium block mb-2">
                    {t('admin.manageClassesPage.form.schedule')}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.manageClassesPage.form.scheduleDescription')}
                  </p>
                  
                  <div className="space-y-3">
                    {classData.schedule.map((daySchedule, index) => (
                      <Card key={daySchedule.day} className={`p-4 ${daySchedule.active ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''}`}>
                        <div className="flex items-center space-x-4">
                          <Checkbox
                            id={`day-${index}`}
                            checked={daySchedule.active}
                            onCheckedChange={() => handleDayToggle(index)}
                          />
                          <Label htmlFor={`day-${index}`} className={`text-sm font-medium ${daySchedule.active ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                            {daySchedule.day}
                          </Label>
                          
                          {daySchedule.active && (
                            <div className="flex items-center space-x-2 ml-auto">
                              <div>
                                <Label htmlFor={`start-${index}`} className="text-xs text-muted-foreground">
                                  {t('admin.manageClassesPage.form.startTime')}
                                </Label>
                                <Input
                                  id={`start-${index}`}
                                  type="time"
                                  value={daySchedule.startTime || ''}
                                  onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                                  className="w-32"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`end-${index}`} className="text-xs text-muted-foreground">
                                  {t('admin.manageClassesPage.form.endTime')}
                                </Label>
                                <Input
                                  id={`end-${index}`}
                                  type="time"
                                  value={daySchedule.endTime || ''}
                                  onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                                  className="w-32"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFormClose} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    {formMode === 'add' ? t('admin.manageClassesPage.dialogs.addClass.creating') : t('admin.manageClassesPage.dialogs.editClass.updating')}
                  </div>
                ) : (
                  formMode === 'add' ? t('admin.manageClassesPage.dialogs.addClass.create') : t('admin.manageClassesPage.dialogs.editClass.update')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageClasses;
