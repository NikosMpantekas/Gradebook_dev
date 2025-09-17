import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

export function MonthlyCalendar({ scheduleData = {} }) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  // Adjust first day index to make Monday = 0 (Sunday becomes 6)
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  // Localized month names
  const getLocalizedMonthName = (monthIndex) => {
    const monthKeys = [
      'calendar.months.january', 'calendar.months.february', 'calendar.months.march', 
      'calendar.months.april', 'calendar.months.may', 'calendar.months.june',
      'calendar.months.july', 'calendar.months.august', 'calendar.months.september', 
      'calendar.months.october', 'calendar.months.november', 'calendar.months.december'
    ];
    return t(monthKeys[monthIndex]) || new Date(currentYear, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  // Localized day abbreviations (Monday first)
  const getDayAbbreviations = () => {
    return [
      t('calendar.days.mon') || 'Mo', 
      t('calendar.days.tue') || 'Tu',
      t('calendar.days.wed') || 'We',
      t('calendar.days.thu') || 'Th',
      t('calendar.days.fri') || 'Fr',
      t('calendar.days.sat') || 'Sa',
      t('calendar.days.sun') || 'Su'
    ];
  };

  // Day name mappings (Monday = 0, Sunday = 6)
  const dayNameMap = {
    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 
    5: 'Friday', 6: 'Saturday', 0: 'Sunday'
  };

  // Generate consistent colors for subjects
  const subjectColors = useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#ec4899', // pink
      '#6b7280', // gray
    ];
    
    const allSubjects = new Set();
    Object.values(scheduleData).forEach(dayClasses => {
      if (Array.isArray(dayClasses)) {
        dayClasses.forEach(classItem => {
          if (classItem.subject) {
            allSubjects.add(classItem.subject);
          }
        });
      }
    });
    
    const colorMap = {};
    Array.from(allSubjects).forEach((subject, index) => {
      colorMap[subject] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [scheduleData]);

  // Get classes for a specific date
  const getClassesForDate = (date) => {
    const dayOfWeek = dayNameMap[date.getDay()];
    const daySchedule = scheduleData[dayOfWeek] || [];
    return Array.isArray(daySchedule) ? daySchedule : [];
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = day === new Date().getDate() && 
                     currentDate.getMonth() === new Date().getMonth() && 
                     currentDate.getFullYear() === new Date().getFullYear();
      
      const classesForDay = getClassesForDate(currentDateForDay);
      
      days.push(
        <div
          key={day}
          className={`h-12 flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-all duration-200 border ${
            isToday 
              ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-sm' 
              : classesForDay.length > 0 
                ? 'hover:bg-accent hover:text-accent-foreground border-border/50 hover:border-primary/30 hover:shadow-sm'
                : 'hover:bg-muted/50 hover:text-foreground border-transparent'
          }`}
        >
          <span className={`text-xs mb-0.5 ${isToday ? 'font-semibold' : 'font-medium'}`}>{day}</span>
          {classesForDay.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-center max-w-full">
              {classesForDay.slice(0, 4).map((classItem, index) => (
                <div
                  key={`${day}-${index}`}
                  className="w-2 h-2 rounded-full shadow-sm"
                  style={{ backgroundColor: subjectColors[classItem.subject] || '#6b7280' }}
                  title={`${classItem.subject} (${classItem.startTime}-${classItem.endTime})`}
                />
              ))}
              {classesForDay.length > 4 && (
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground/70 shadow-sm"
                  title={`+${classesForDay.length - 4} more classes`}
                />
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="w-full p-5">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-9 w-9 p-0 hover:bg-accent/50 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-base font-semibold text-foreground">
          {getLocalizedMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
        </h3>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="h-9 w-9 p-0 hover:bg-accent/50 rounded-lg transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Today Button and Legend */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
          className="h-8 px-4 text-xs font-semibold hover:bg-primary hover:text-primary-foreground border-primary/20 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
        >
          <CalendarIcon className="w-3 h-3 mr-1.5" />
          {t('calendar.today') || 'Today'}
        </Button>
        
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground justify-end">
          {Object.entries(subjectColors).length > 0 ? (
            Object.entries(subjectColors).map(([subject, color]) => (
              <div key={subject} className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                <div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm" 
                  style={{ backgroundColor: color }}
                ></div>
                <span className="truncate max-w-[60px] font-medium" title={subject}>{subject}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
              <div className="w-2.5 h-2.5 bg-muted-foreground/50 rounded-full"></div>
              <span className="font-medium">{t('calendar.noClasses') || 'No classes'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="w-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {getDayAbbreviations().map((day, index) => (
            <div key={index} className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {generateCalendarDays()}
        </div>
      </div>
    </div>
  );
} 