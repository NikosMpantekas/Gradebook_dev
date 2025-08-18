import React, { useState, useEffect, Fragment } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  BookOpen, 
  Building2, 
  X,
  Filter
} from 'lucide-react';
import { Spinner } from '../../components/ui/spinner';
// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Label } from '../../components/ui/label';


const Schedule = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter states for admin and teacher
  const [filters, setFilters] = useState({
    schoolBranch: 'all',
    teacher: 'all'
  });
  const [filterOptions, setFilterOptions] = useState({
    schoolBranches: [],
    teachers: []
  });
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // Store branch names for display (mapping branch IDs to names)
  const [branchNames, setBranchNames] = useState({});
  
  // Store subject colors for consistent coloring
  const [subjectColors, setSubjectColors] = useState({});
  
  // Event rendering reference to avoid duplicates
  const renderedEventsRef = React.useRef(new Set());
  
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', 
    '21:00', '22:00', '23:00'
  ];
  
  // Generate consistent color for a subject based on its name
  const getSubjectColor = (subjectName) => {
    if (!subjectName) return 'hsl(var(--primary))';
    
    if (subjectColors[subjectName]) {
      return subjectColors[subjectName];
    }
    
    // Generate a consistent color based on subject name
    const colors = [
      'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', 
      'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--ring))',
      '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
      '#0288d1', '#c2185b', '#00796b', '#5d4037', '#455a64'
    ];
    
    // Simple hash function to get consistent color for same subject
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];
    
    setSubjectColors(prev => ({ ...prev, [subjectName]: color }));
    return color;
  };
  
  // Merge consecutive time slots for the same class/subject
  const mergeConsecutiveClasses = (events) => {
    if (!events || events.length === 0) return events;
    
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const mergedEvents = [];
    
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      
      // Look for the next event that might be a continuation
      let endTime = currentEvent.endTime;
      let mergedEvent = { ...currentEvent };
      
      // Check if next events are consecutive and same subject/class
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const nextEvent = sortedEvents[j];
        
        // Check if this is a consecutive time slot for the same class
        if (
          nextEvent.startTime === endTime &&
          nextEvent.subject === currentEvent.subject &&
          nextEvent.schoolBranch === currentEvent.schoolBranch &&
          nextEvent.direction === currentEvent.direction
        ) {
          // Merge this event
          endTime = nextEvent.endTime;
          mergedEvent.endTime = endTime;
          
          // Merge teacher and student arrays
          if (nextEvent.teacherNames) {
            mergedEvent.teacherNames = [...new Set([
              ...(mergedEvent.teacherNames || []),
              ...nextEvent.teacherNames
            ])];
          }
          if (nextEvent.studentNames) {
            mergedEvent.studentNames = [...new Set([
              ...(mergedEvent.studentNames || []),
              ...nextEvent.studentNames
            ])];
          }
          
          // Update counts
          mergedEvent.teacherCount = mergedEvent.teacherNames?.length || 0;
          mergedEvent.studentCount = mergedEvent.studentNames?.length || 0;
          
          // Skip this event in the next iteration
          i = j;
        } else {
          break;
        }
      }
      
      mergedEvents.push(mergedEvent);
    }
    
    return mergedEvents;
  };
  
  useEffect(() => {
    // Only load filter options for admin and teacher roles
    if (user?.role === 'admin' || user?.role === 'teacher') {
      loadFilterOptions();
    }
    // Always fetch schedule data for all roles
    fetchScheduleData();
  }, []);

  // Load filter options for admins and teachers only
  const loadFilterOptions = async () => {
    // Skip filter loading for students
    if (user?.role === 'student') {
      console.log('Skipping filter options for student role');
      return;
    }
    
    setLoadingFilters(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${authToken}` }
      };
      
      console.log('Loading filter options for role:', user?.role);
      
      const response = await axios.get(`${API_URL}/api/students/teacher/filters`, config);
      console.log('Filter API response:', response.data);
      
      const { schoolBranches = [] } = response.data;
      
      // For admins, also fetch teachers
      let teacherOptions = [];
      if (user?.role === 'admin') {
        try {
          console.log('Loading teacher options for admin');
          
          // Use regular users endpoint and filter for teachers
          const teachersResponse = await axios.get(`${API_URL}/api/users`, config);
          console.log('Users API response found:', teachersResponse.data?.length || 0, 'users');
          
          // Extract only teachers from the response
          const teachers = teachersResponse.data?.filter(user => user.role === 'teacher') || [];
          console.log('Filtered', teachers.length, 'teachers from users list');
          
          teacherOptions = teachers.map(teacher => ({
            value: teacher._id,
            label: teacher.name
          }));
        } catch (error) {
          console.error('Error fetching teachers:', error);
        }
      }
      
      const branches = schoolBranches || [];
      console.log('Setting filter options - branches:', branches);
      console.log('Setting filter options - teachers:', teacherOptions);
      
      setFilterOptions({
        schoolBranches: branches,
        teachers: teacherOptions
      });
      
      // Fetch branch names for display if we have branch IDs
      if (branches.length > 0) {
        const branchIds = branches.map(branch => branch.value || branch._id || branch.id).filter(Boolean);
        if (branchIds.length > 0) {
          console.log('Fetching branch names for filter IDs:', branchIds);
          fetchBranchNames(branchIds);
        }
      } else {
        console.warn('No branch data available in filter options');
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      setError('Failed to load filter options. Some features may not work properly.');
    } finally {
      setLoadingFilters(false);
    }
  };

  // Fetch branch names for display from their IDs
  const fetchBranchNames = async (branchIds) => {
    if (!branchIds || branchIds.length === 0) return;
    
    try {
      const config = {
        headers: { Authorization: `Bearer ${authToken}` }
      };
      
      console.log('Fetching branch names for IDs:', branchIds);
      const response = await axios.post(`${API_URL}/api/branches/batch`, { branchIds }, config);
      
      if (response.data && Array.isArray(response.data)) {
        const branchNameMap = {};
        response.data.forEach(branch => {
          if (branch && branch._id && branch.name) {
            branchNameMap[branch._id] = branch.name;
          }
        });
        
        setBranchNames(prev => ({ ...prev, ...branchNameMap }));
        console.log('Branch names loaded:', branchNameMap);
      } else {
        console.warn('Invalid branch data format received:', response.data);
      }
    } catch (error) {
      console.error('Error fetching branch names:', error);
      // Set fallback branch names to avoid showing IDs
      const fallbackNames = {};
      branchIds.forEach(id => {
        if (id && !branchNames[id]) {
          fallbackNames[id] = `Branch ${id.slice(-4)}`;
        }
      });
      if (Object.keys(fallbackNames).length > 0) {
        setBranchNames(prev => ({ ...prev, ...fallbackNames }));
      }
    }
  };

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${authToken}` }
      };
      
      // Build query parameters for filters
      const queryParams = new URLSearchParams();
      if (filters.schoolBranch !== 'all') queryParams.append('schoolBranch', filters.schoolBranch);
      if (filters.teacher !== 'all') queryParams.append('teacherId', filters.teacher);
      
      const queryString = queryParams.toString();
      const url = `${API_URL}/api/schedule${queryString ? `?${queryString}` : ''}`;
      
      console.log('Schedule - Fetching data for role:', user?.role);
      console.log('Schedule - Request URL:', url);
      console.log('Schedule - Current filters:', filters);
      
      const response = await axios.get(url, config);
      
      // Ensure we have the right data structure
      if (response.data && response.data.schedule) {
        console.log('Schedule - API success, raw data:', response.data);
        console.log('Schedule - Total classes reported by API:', response.data.totalClasses || 0);
        
        // Check if we have any classes at all
        let totalEvents = 0;
        Object.keys(response.data.schedule).forEach(day => {
          const events = response.data.schedule[day];
          if (Array.isArray(events)) {
            totalEvents += events.length;
            console.log(`Schedule - Day ${day}: ${events.length} events`);
          }
        });
        console.log('Schedule - Total events across all days:', totalEvents);
        
        // Process schedule data and ensure each event has a unique ID
        const processedSchedule = {};
        Object.keys(response.data.schedule).forEach(day => {
          const events = response.data.schedule[day];
          if (Array.isArray(events)) {
            processedSchedule[day] = events.map((event, index) => {
              // Ensure each event has a unique ID for rendering
              return { 
                ...event,
                _id: event._id || event.classId || `event-${day}-${index}`
              };
            });
          } else {
            processedSchedule[day] = [];
          }
        });
        
        // Extract branch IDs from schedule data for name resolution
        const branchIds = new Set();
        Object.keys(processedSchedule).forEach(day => {
          const events = processedSchedule[day];
          if (Array.isArray(events)) {
            events.forEach(event => {
              if (event.schoolBranch) {
                branchIds.add(event.schoolBranch);
              }
            });
          }
        });
        
        // Fetch branch names for all events if not already loaded
        if (branchIds.size > 0) {
          console.log('Schedule - Fetching branch names for events:', Array.from(branchIds));
          fetchBranchNames(Array.from(branchIds));
        }
        
        setScheduleData(processedSchedule);
        console.log('Schedule - Data processed and set to state');
      } else {
        console.warn('Schedule - Unexpected data format received:', response.data);
        setScheduleData({});
      }
      
      setError(null);
    } catch (error) {
      console.error('Schedule - Error fetching data:', error);
      setError(`Failed to load schedule data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    console.log(`Filter change: ${filterType} = ${value}`);
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // Apply filters and trigger data refresh when filters change
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      fetchScheduleData();
      
      // Debug log current filter state
      console.log('Current filters:', filters);
      console.log('Current filter options:', filterOptions);
    }
  }, [filters.schoolBranch, filters.teacher]);

  // Clear rendered events ref when schedule data changes
  useEffect(() => {
    renderedEventsRef.current = new Set();
    fetchScheduleData();
    loadFilterOptions();
  }, [user?.role, filters]);

  // Load filter options once on component mount
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      loadFilterOptions();
    }
  }, [user?.role]);

  // Reset rendered events on each render
  useEffect(() => {
    renderedEventsRef.current = new Set();
  });

  // Handle event click
  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    
    // Log branch info for debugging
    if (event.schoolBranch) {
      console.log('School branch ID:', event.schoolBranch);
      console.log('Mapped branch name:', branchNames[event.schoolBranch] || 'Not found in mapping');
    }
    
    // Enhanced event processing for dialog display
    const enhancedEvent = {
      ...event,
      // Handle teachers data - check multiple possible formats
      teacherNames: event.teacherNames || 
                   (event.teachers ? event.teachers.map(t => t.name || t) : []) ||
                   (event.teacher ? [typeof event.teacher === 'object' ? event.teacher.name : event.teacher] : []),
      
      // Handle students data - check multiple possible formats  
      studentNames: event.studentNames || 
                   (event.students ? event.students.map(s => s.name || s) : []) ||
                   (event.student ? [typeof event.student === 'object' ? event.student.name : event.student] : []),
      
      // Calculate counts if not provided
      teacherCount: event.teacherCount || 
                   (event.teacherNames ? event.teacherNames.length : 0) ||
                   (event.teachers ? event.teachers.length : 0) ||
                   (event.teacher ? 1 : 0),
                   
      studentCount: event.studentCount || 
                   (event.studentNames ? event.studentNames.length : 0) ||
                   (event.students ? event.students.length : 0) ||
                   (event.student ? 1 : 0),
      
      // Ensure branch name is resolved
      schoolBranchName: branchNames[event.schoolBranch] || event.schoolBranch || 'Unknown Branch'
    };
    
    console.log('Enhanced event for dialog:', enhancedEvent);
    console.log('Teachers data:', {
      original: event.teachers || event.teacher || event.teacherNames,
      processed: enhancedEvent.teacherNames,
      count: enhancedEvent.teacherCount
    });
    console.log('Students data:', {
      original: event.students || event.student || event.studentNames,
      processed: enhancedEvent.studentNames,
      count: enhancedEvent.studentCount
    });
    
    setSelectedEvent(enhancedEvent);
    setDialogOpen(true);
  };

  // Format time to 24-hour format
  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':');
    return `${hours}:${minutes}`;
  };

  // Get events for a specific day and time slot - UPDATED to prevent splitting
  const getEventsForTimeSlot = (day, timeSlot) => {
    if (!scheduleData || !scheduleData[day]) {
      console.log(`Schedule - No data for day: ${day}`);
      return [];
    }
    
    // Only return events that START at this time slot (not events that span through it)
    const timeSlotHour = parseInt(timeSlot.split(':')[0]);
    const events = scheduleData[day].filter(event => {
      const startHour = parseInt(event.startTime.split(':')[0]);
      const startMinute = parseInt(event.startTime.split(':')[1]);
      
      // Only include events that start exactly at this hour (regardless of minutes)
      return startHour === timeSlotHour;
    });
    
    if (events.length > 0) {
      console.log(`Schedule - Day: ${day}, TimeSlot: ${timeSlot}, Events starting at this hour: ${events.length}`);
      console.log('Schedule - Event subjects:', events.map(e => `${e.subject} (${e.startTime}-${e.endTime})`).join(', '));
    }
    
    return events;
  };

  // Calculate how many time slots an event spans and its exact positioning
  const calculateEventDimensions = (event) => {
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);
    
    // Calculate total duration in minutes
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Calculate fractional positioning within the hour slot
    const minuteOffset = startMin; // How many minutes past the hour does this event start
    const fractionalOffset = (minuteOffset / 60) * 60; // Convert to pixels (assuming 60px per hour)
    
    // Calculate height based on actual duration (60px = 1 hour)
    const height = (durationMinutes / 60) * 60;
    
    console.log(`Schedule - Event ${event.subject}: Start ${event.startTime}, End ${event.endTime}`);
    console.log(`Schedule - Calculated: offset=${fractionalOffset}px, height=${height}px, duration=${durationMinutes}min`);
    
    return {
      height,
      topOffset: fractionalOffset,
      durationMinutes
    };
  };

  // Mobile-specific event rendering function to prevent floating classes
  const renderMobileEvent = (event, index) => {
    const backgroundColor = getSubjectColor(event.subject);
    
    // Get teacher and student counts
    const teacherCount = event.teacherNames ? event.teacherNames.length : 0;
    const studentCount = event.studentNames ? event.studentNames.length : 0;
    const teacherDisplay = event.teacherNames && event.teacherNames.length > 0 
      ? event.teacherNames.slice(0, 2).join(', ') + (event.teacherNames.length > 2 ? '...' : '')
      : null;

    return (
      <Card
        key={`mobile-${event._id}-${index}`}
        className="mb-3 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-l-4"
        style={{ borderLeftColor: backgroundColor }}
        onClick={() => handleEventClick(event)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-foreground">
              {event.subject}
            </h3>
            <span className="text-sm text-muted-foreground">
              {event.startTime} - {event.endTime}
            </span>
          </div>
          
          {teacherDisplay && (
            <p className="text-sm text-muted-foreground mb-2">
              👨‍🏫 {teacherDisplay}
            </p>
          )}
          
          <div className="flex gap-2 flex-wrap items-center">
            {teacherCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                {teacherCount} Teacher{teacherCount > 1 ? 's' : ''}
              </Badge>
            )}
            {studentCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {studentCount} Student{studentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render event in calendar with proper fractional positioning
  const renderEvent = (event, isCompact = false) => {
    if (!event) {
      console.log('Schedule - Attempt to render null event');
      return null;
    }
    
    // Calculate precise dimensions and positioning
    const { height, topOffset } = calculateEventDimensions(event);
    const teacherCount = event.teacherNames?.length || 0;
    const studentCount = event.studentNames?.length || 0;
    
    console.log(`Schedule - Rendering event: ${event.subject} at ${event.startTime}-${event.endTime}, ID: ${event._id}`);
    console.log(`Schedule - Position: top=${topOffset}px, height=${height}px`);
    
    // Get branch name if available from our mapping
    const branchName = event.schoolBranch ? 
      (branchNames[event.schoolBranch] || event.schoolBranch) : 
      'Unknown Branch';
      
    // Handle teacher display
    const teacherDisplay = event.teacherNames?.length > 0 ? 
      ` • ${event.teacherNames[0]}${event.teacherNames.length > 1 ? ` +${event.teacherNames.length - 1}` : ''}` : 
      '';
    
    // Determine color based on subject
    const backgroundColor = getSubjectColor(event.subject);
    
    return (
      <Card
        key={event._id}
        className="absolute cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] z-10 overflow-hidden border border-border/20 shadow-sm"
        style={{
          top: `${topOffset}px`,
          left: '2px',
          right: '2px',
          height: `${height - 4}px`,
          minHeight: `${height - 4}px`,
          backgroundColor: backgroundColor,
        }}
        onClick={() => handleEventClick(event)}
      >
        <CardContent className={`h-full flex flex-col justify-between ${isCompact ? 'p-1' : 'p-2'}`}>
          <div className="text-foreground">
            <h4 className={`font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {event.subject}
            </h4>
            <p className={`text-xs opacity-90 ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {event.startTime} - {event.endTime}
            </p>
          </div>
          {!isCompact && teacherDisplay && (
            <p className="text-xs opacity-90 text-foreground">
              {teacherDisplay}
            </p>
          )}
          {!isCompact && (teacherCount > 0 || studentCount > 0) && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {teacherCount > 0 && (
                <Badge variant="secondary" className="text-xs h-4">
                  <User className="w-2 h-2 mr-1" />
                  {teacherCount}
                </Badge>
              )}
              {studentCount > 0 && (
                <Badge variant="secondary" className="text-xs h-4">
                  <Users className="w-2 h-2 mr-1" />
                  {studentCount}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

if (loading) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner variant="default" />
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
          <div className="flex items-center space-x-2">
            <span>⚠️ {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary rounded-lg">
              <Calendar className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-3xl font-light">Weekly Schedule</CardTitle>
              <p className="text-muted-foreground">
                {user?.role === 'student' && 'Your class timetable for the week'}
                {user?.role === 'teacher' && 'Your teaching schedule and classes'}
                {user?.role === 'admin' && 'School-wide class schedules and timetables'}
              </p>
            </div>
          </div>

          {/* Filters for Admin and Teacher */}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Filter Schedule</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* School Branch Filter */}
                <div className="space-y-2">
                  <Label htmlFor="schoolBranch">School Branch</Label>
                  <Select
                    value={filters.schoolBranch}
                    onValueChange={(value) => handleFilterChange('schoolBranch', value)}
                    disabled={loadingFilters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {filterOptions.schoolBranches.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branchNames[branch.value] || branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Teacher Filter (Admin only) */}
                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Teacher</Label>
                    <Select
                      value={filters.teacher}
                      onValueChange={(value) => handleFilterChange('teacher', value)}
                      disabled={loadingFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Teachers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        {filterOptions.teachers.map((teacher) => (
                          <SelectItem key={teacher.value} value={teacher.value}>
                            {teacher.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 lg:grid-cols-8 gap-0 min-w-[800px]">
              {/* Time column header */}
              <div className="sticky left-0 bg-background z-20 border-b-2 border-primary border-r border-border">
                <div className="p-2 h-[50px] flex items-center justify-center text-sm font-semibold">
                  Time
                </div>
              </div>

              {/* Day headers */}
              {daysOfWeek.map((day) => (
                <div key={`header-${day}`} className="border-b-2 border-primary border-r border-border bg-primary text-primary-foreground">
                  <div className="p-2 text-center h-[50px] flex items-center justify-center text-sm font-semibold">
                    {day}
                  </div>
                </div>
              ))}

              {/* Time slots and events */}
              {timeSlots.map((timeSlot) => (
                <Fragment key={timeSlot}>
                  {/* Time label */}
                  <div className="border-r border-border border-b border-border bg-muted/30 text-foreground sticky left-0 z-10">
                    <div className="p-2 text-center text-xs font-medium min-h-[60px] flex items-center justify-center">
                      {formatTime(timeSlot)}
                    </div>
                  </div>

                  {/* Day columns */}
                  {daysOfWeek.map((day) => {
                    const events = getEventsForTimeSlot(day, timeSlot);
                    const mergedEvents = mergeConsecutiveClasses(events);
                    
                    return (
                      <div
                        key={`${day}-${timeSlot}`}
                        className="border-r border-border border-b border-border min-h-[60px] bg-background relative overflow-visible"
                      >
                        {mergedEvents.map((event) => {
                          const eventKey = `${event._id}-${timeSlot}`;
                          if (renderedEventsRef.current.has(eventKey)) return null;
                          renderedEventsRef.current.add(eventKey);
                          return renderEvent(event, true);
                        })}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Class Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Subject: {selectedEvent.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Time: {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>School Branch: {selectedEvent.schoolBranch ? (
                      branchNames[selectedEvent.schoolBranch] || selectedEvent.schoolBranchName || selectedEvent.schoolBranch
                    ) : 'Unknown Branch'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Direction: {selectedEvent.direction}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Teachers ({selectedEvent.teacherCount || 0}):
                    </h4>
                    {selectedEvent.teacherNames && selectedEvent.teacherNames.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.teacherNames.map((teacher, index) => (
                          <Badge key={index} variant="secondary">
                            {teacher}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No teachers assigned</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      Students ({selectedEvent.studentCount || 0}):
                    </h4>
                    {selectedEvent.studentNames && selectedEvent.studentNames.length > 0 ? (
                      <div className="max-h-[200px] overflow-auto">
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.studentNames.slice(0, 10).map((student, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {student}
                            </Badge>
                          ))}
                        </div>
                        {selectedEvent.studentNames.length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            and {selectedEvent.studentNames.length - 10} more students...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No students enrolled</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
