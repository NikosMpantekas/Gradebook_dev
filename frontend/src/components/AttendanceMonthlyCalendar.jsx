import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useTranslation } from 'react-i18next';
import { format, isSameDay } from 'date-fns';

export function AttendanceMonthlyCalendar({ attendanceRecords = [] }) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  // Adjust first day index to make Monday = 0
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

  const getDayAbbreviations = () => [
    t('calendar.days.mon') || 'Mo',
    t('calendar.days.tue') || 'Tu',
    t('calendar.days.wed') || 'We',
    t('calendar.days.thu') || 'Th',
    t('calendar.days.fri') || 'Fr',
    t('calendar.days.sat') || 'Sa',
    t('calendar.days.sun') || 'Su'
  ];

  // Get attendance records for a specific date
  const getRecordsForDate = (date) => {
    return attendanceRecords.filter(record => {
      const recordDate = new Date(record.session?.scheduledStartAt || record.session?.date || record.markedAt);
      return isSameDay(recordDate, date);
    });
  };

  const goToPreviousMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 sm:h-16" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = isSameDay(date, new Date());
      const records = getRecordsForDate(date);

      const hasAbsence = records.some(r => r.status === 'absent');

      days.push(
        records.length > 0 ? (
          <Popover key={day}>
            <PopoverTrigger asChild>
              <div
                className={`h-12 sm:h-16 flex flex-col items-center justify-center text-sm rounded-xl cursor-pointer transition-all duration-300 transform-gpu border ${isToday
                    ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-lg ring-2 ring-primary/20 scale-105 z-10'
                    : 'hover:bg-accent hover:text-accent-foreground border-border/50 hover:border-primary/40 hover:shadow-xl hover:scale-110 hover:-translate-y-1.5'
                  } relative overflow-hidden group`}
              >
                {/* Background decorative gradient for days with records */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${hasAbsence ? 'from-destructive to-transparent' : 'from-primary to-transparent'
                  }`} />

                <span className={`text-xs sm:text-sm mb-1 z-10 ${isToday ? 'font-bold' : 'font-medium opacity-80'}`}>{day}</span>

                <div className="flex gap-1 justify-center z-10">
                  {records.slice(0, 3).map((r, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm ring-1 ring-white/20 ${r.status === 'present' ? 'bg-green-500' :
                          r.status === 'absent' ? 'bg-red-500' :
                            r.status === 'late' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 shadow-2xl border-2 border-primary/10 bg-background/95 backdrop-blur-md overflow-hidden animate-in fade-in-0 zoom-in-95" side="top" sideOffset={12}>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm font-bold text-foreground">
                    {format(date, 'EEEE, MMMM dd')}
                  </span>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-tighter">
                    {records.length} {t('attendance.sessions')}
                  </Badge>
                </div>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {records.map((r, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-all duration-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="text-sm font-bold truncate tracking-tight text-foreground">
                              {r.class?.subject || r.class?.name || r.session?.title || t('attendance.noSession')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium">
                              {r.session?.scheduledStartAt ? format(new Date(r.session.scheduledStartAt), 'HH:mm') : '--:--'}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={r.status === 'present' ? 'default' : r.status === 'absent' ? 'destructive' : 'secondary'}
                          className="text-[10px] h-5 font-bold uppercase tracking-wider shrink-0"
                        >
                          {t(`attendance.${r.status}`)}
                        </Badge>
                      </div>

                      {/* Show session title as subtitle if it exists and is different from class name */}
                      {r.session?.title && r.session.title !== (r.class?.subject || r.class?.name) && (
                        <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground font-medium pl-5 italic opacity-80">
                          {r.session.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div
            key={day}
            className={`h-12 sm:h-16 flex flex-col items-center justify-center text-sm rounded-xl transition-all border ${isToday
                ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-lg scale-105 z-10'
                : 'hover:bg-muted/40 hover:text-foreground border-transparent'
              }`}
          >
            <span className={`text-xs sm:text-sm ${isToday ? 'font-bold' : 'font-medium opacity-40'}`}>{day}</span>
          </div>
        )
      );
    }
    return days;
  };

  return (
    <div className="w-full p-4 sm:p-6 bg-card rounded-2xl border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="rounded-2xl font-bold text-[10px] uppercase tracking-wider px-4 h-9 bg-primary/5 hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20"
          >
            {t('attendance.today')}
          </Button>
          <h2 className="text-xl font-black text-foreground tracking-tight px-4 py-2 bg-muted/30 rounded-2xl border border-white/5 shadow-inner">
            {getLocalizedMonthName(currentMonth)} {currentYear}
          </h2>
        </div>

        <div className="flex items-center justify-end gap-1.5 bg-muted/20 p-1 rounded-2xl border border-white/5">
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

      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
        {getDayAbbreviations().map((day, index) => (
          <div key={index} className="h-8 flex items-center justify-center text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {generateCalendarDays()}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('attendance.present')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('attendance.absent')}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('attendance.late')}</span>
        </div>
      </div>
    </div>
  );
}
