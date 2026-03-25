import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, parseISO, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { getEvents, deleteEvent, reset } from '../features/events/eventSlice';
import { toast } from 'react-toastify';
import logger from '../services/loggerService';
import CalendarGrid from '../components/calendar/CalendarGrid';
import CalendarEventDialog from '../components/calendar/CalendarEventDialog';
import CalendarFilterDialog from '../components/calendar/CalendarFilterDialog';
import DayDetailsDialog from '../components/calendar/DayDetailsDialog';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter, X } from 'lucide-react';

const Calendar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { events, isLoading, isError, message } = useSelector((state) => state.events);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isDayDetailsDialogOpen, setIsDayDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filter, setFilter] = useState({
    tags: [],
    audience: null
  });

  // Can the user create events?
  const canCreateEvents = user && (
    user.role === 'superadmin' || 
    user.role === 'admin' || 
    user.role === 'teacher' || 
    (user.role === 'secretary' && user.secretaryPermissions?.canSendNotifications)
  );

  // Log component rendering
  logger.info('CALENDAR', 'Calendar component rendering', {
    user: user ? { id: user._id, role: user.role } : 'No user',
    eventsCount: events ? events.length : 0,
    currentMonth: format(currentMonth, 'MMMM yyyy')
  });

  // Fetch events when month changes and reset state when component unmounts
  useEffect(() => {
    if (user) {
      const startDate = startOfMonth(currentMonth).toISOString();
      const endDate = endOfMonth(currentMonth).toISOString();
      
      dispatch(getEvents({ startDate, endDate }));
    }
    
    // Clear any success/error states on component mount
    dispatch(reset());
    
    return () => {
      // Clean up when component unmounts
      dispatch(reset());
    };
  }, [user, dispatch, currentMonth]);

  // Handle errors
  useEffect(() => {
    if (isError) {
      toast.error(message);
      logger.error('CALENDAR', 'Error fetching events', {
        message,
        userId: user?._id,
        userRole: user?.role
      });
    }
  }, [isError, message, user]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Go to current month
  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Open day details dialog when clicking on a day
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setIsDayDetailsDialogOpen(true);
  };
  
  // Close day details dialog
  const handleCloseDayDetailsDialog = () => {
    setIsDayDetailsDialogOpen(false);
  };
  
  // Create new event from day details dialog
  const handleCreateEventFromDayDetails = (date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };

  // Open event dialog with selected event for editing
  const handleEventEdit = (event) => {
    setSelectedEvent(event);
    setSelectedDate(parseISO(event.startDate));
    setIsEventDialogOpen(true);
    setIsDayDetailsDialogOpen(false);
  };
  
  // Handle event deletion
  const handleEventDelete = (eventId) => {
    // Implement deletion logic with confirmation
    if (window.confirm('Are you sure you want to delete this event?')) {
      dispatch(deleteEvent(eventId));
      toast.success('Event deleted successfully');
      setIsDayDetailsDialogOpen(false);
    }
  };

  // Close event dialog
  const handleCloseEventDialog = () => {
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  // Filter events for a specific day
  const getEventsForDay = useCallback((day) => {
    if (!events) return [];
    
    return events.filter(event => {
      const eventDate = parseISO(event.startDate);
      return isSameDay(day, eventDate);
    }).filter(event => {
      // Apply tag filter if set
      if (filter.tags && filter.tags.length > 0) {
        const eventHasMatchingTag = event.tags && event.tags.some(tag => 
          filter.tags.includes(tag)
        );
        if (!eventHasMatchingTag) return false;
      }
      
      // Apply audience filter if set
      if (filter.audience) {
        if (event.audience.targetType !== filter.audience) return false;
      }
      
      return true;
    });
  }, [events, filter]);

  // Open filter dialog
  const handleOpenFilterDialog = () => {
    setIsFilterDialogOpen(true);
  };

  // Close filter dialog
  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false);
  };

  // Apply filters
  const handleApplyFilter = (newFilter) => {
    setFilter(newFilter);
    setIsFilterDialogOpen(false);
  };

  // Clear filters
  const handleClearFilter = () => {
    setFilter({
      tags: [],
      audience: null
    });
    setIsFilterDialogOpen(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="ml-4 text-xl font-semibold text-gray-700">
          Loading calendar...
        </h2>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="Calendar">
      <div className="p-4">
        {/* Header section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <CalendarIcon className="mr-2 w-6 h-6 text-blue-600" />
                Calendar
                </CardTitle>
              </div>
              <div className="flex justify-start md:justify-end space-x-2">
              {canCreateEvents && (
                <Button
                  onClick={() => {
                    setSelectedDate(new Date());
                    setSelectedEvent(null);
                    setIsEventDialogOpen(true);
                  }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="mr-2 w-4 h-4" />
                    <span className="hidden sm:inline">Add Event</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleOpenFilterDialog}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <span className="hidden sm:inline mr-2">Filter</span>
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Calendar navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleCurrentMonth}
                className="ml-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                title="Go to current month"
              >
                  Today
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active filter indicators */}
        {(filter.tags.length > 0 || filter.audience) && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
              Active Filters:
              </h3>
              <div className="flex flex-wrap gap-2">
              {filter.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    {tag}
                    <button
                      onClick={() => {
                    setFilter({
                      ...filter,
                      tags: filter.tags.filter(t => t !== tag)
                    });
                      }}
                      className="ml-2 hover:bg-blue-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
              ))}
              {filter.audience && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                  >
                    Audience: {filter.audience}
                    <button
                      onClick={() => {
                    setFilter({
                      ...filter,
                      audience: null
                    });
                      }}
                      className="ml-2 hover:bg-green-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearFilter}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar grid */}
        <Card>
          <CardContent className="p-4">
          <CalendarGrid 
            currentMonth={currentMonth}
            events={events}
            getEventsForDay={getEventsForDay}
            onDayClick={handleDayClick}
              isMobile={false}
          />
          </CardContent>
        </Card>

        {/* Event dialog */}
        <CalendarEventDialog
          open={isEventDialogOpen}
          onClose={handleCloseEventDialog}
          event={selectedEvent}
          date={selectedDate}
          canEdit={canCreateEvents}
        />

        {/* Filter dialog */}
        <CalendarFilterDialog 
          open={isFilterDialogOpen}
          onClose={handleCloseFilterDialog}
          filter={filter}
          onApply={handleApplyFilter}
          onClear={handleClearFilter}
          events={events}
        />
        
        {/* Day details dialog */}
        <DayDetailsDialog
          open={isDayDetailsDialogOpen}
          onClose={handleCloseDayDetailsDialog}
          selectedDate={selectedDate || new Date()}
          events={events || []}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          onCreateEvent={handleCreateEventFromDayDetails}
        />
      </div>
    </ErrorBoundary>
  );
};

const CalendarWithErrorBoundary = () => (
  <ErrorBoundary componentName="Calendar">
    <Calendar />
  </ErrorBoundary>
);

export default CalendarWithErrorBoundary;
