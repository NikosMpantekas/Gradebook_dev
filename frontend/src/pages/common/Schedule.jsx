import React, { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config/appConfig';
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  BookOpen, 
  Building2,
  Filter
} from 'lucide-react';
// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';

// Redux schedule cache
import { fetchSchedule, serializeCacheKey } from '../../features/schedule/scheduleSlice';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ScheduleSkeleton = () => (
  <div className="container mx-auto px-4 py-6 space-y-6">
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
      </CardHeader>
    </Card>

    {/* Grid skeleton — desktop */}
    <Card className="hidden lg:block">
      <CardContent className="p-4">
        <div className="grid grid-cols-8 gap-0">
          <div className="border-b-2 border-primary border-r border-border h-[50px]" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-b-2 border-primary border-r border-border bg-primary/20 h-[50px] p-2">
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <Fragment key={rowIdx}>
              <div className="border-r border-border border-b bg-muted/30 min-h-[60px] flex items-center justify-center">
                <Skeleton className="h-3 w-10" />
              </div>
              {Array.from({ length: 7 }).map((_, colIdx) => (
                <div key={colIdx} className="border-r border-border border-b min-h-[60px] p-1 relative">
                  {((rowIdx * 7 + colIdx) % 5 === 0) && (
                    <Skeleton className="absolute inset-[2px] rounded-md" />
                  )}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Mobile skeleton */}
    <Card className="lg:hidden">
      <CardContent className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Transform raw API response ({ schedule: { Monday: [...], ... } }) into a
 * processed schedule object keyed by localised day names.
 */
function processSchedule(apiResponse, daysOfWeek, dayMapping) {
  if (!apiResponse?.schedule) return null;

  const processedSchedule = {};
  daysOfWeek.forEach(day => { processedSchedule[day] = []; });

  Object.keys(apiResponse.schedule).forEach(englishDay => {
    const events       = apiResponse.schedule[englishDay];
    const localisedDay = dayMapping[englishDay] || englishDay;
    if (Array.isArray(events) && events.length > 0) {
      processedSchedule[localisedDay] = events.map((event, index) => ({
        ...event,
        _id:         event._id || event.classId || `event-${localisedDay}-${index}`,
        originalDay: englishDay,
        displayDay:  localisedDay,
      }));
    }
  });

  return processedSchedule;
}

// ─── Main component ───────────────────────────────────────────────────────────

const Schedule = () => {
  const { t }    = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user }              = useSelector(state => state.auth);
  const scheduleRedux         = useSelector(state => state.schedule);
  const authToken             = user?.token || localStorage.getItem('token');

  // ── Filter state (admin / teacher only) ───────────────────────────────────
  const [filters, setFilters] = useState({ schoolBranch: 'all', teacher: 'all' });
  const [filterOptions, setFilterOptions] = useState({ schoolBranches: [], teachers: [] });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [branchNames, setBranchNames] = useState({});
  const [subjectColors, setSubjectColors] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const renderedEventsRef = useRef(new Set());

  // ── Day / time config ─────────────────────────────────────────────────────
  const daysOfWeek = [
    t('days.monday'), t('days.tuesday'), t('days.wednesday'),
    t('days.thursday'), t('days.friday'), t('days.saturday'), t('days.sunday')
  ];
  const dayMapping = {
    'Monday':    t('days.monday'),
    'Tuesday':   t('days.tuesday'),
    'Wednesday': t('days.wednesday'),
    'Thursday':  t('days.thursday'),
    'Friday':    t('days.friday'),
    'Saturday':  t('days.saturday'),
    'Sunday':    t('days.sunday')
  };
  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  // ── Build the query params from active filters ─────────────────────────────
  const queryParams = useMemo(() => {
    const params = {};
    if (filters.schoolBranch !== 'all') params.schoolBranch = filters.schoolBranch;
    if (filters.teacher      !== 'all') params.teacherId    = filters.teacher;
    return params;
  }, [filters.schoolBranch, filters.teacher]);

  const cacheKey = useMemo(() => serializeCacheKey(queryParams), [queryParams]);

  // ── Redux-derived loading / error / data for current filter combo ──────────
  const isLoading    = !!scheduleRedux.loadingKeys[cacheKey];
  const errorMessage = scheduleRedux.errorKeys[cacheKey] || null;
  const cachedEntry  = scheduleRedux.cache[cacheKey];

  // Process the raw API response into localised day keys
  const scheduleData = useMemo(
    () => processSchedule(cachedEntry?.data, daysOfWeek, dayMapping),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cachedEntry?.data, t]  // re-process on language change
  );

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSchedule({ queryParams }));

    // Load filter options for admin/teacher
    if (user?.role === 'admin' || user?.role === 'teacher') {
      loadFilterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Re-fetch when filters change (slice handles cache hit internally)
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      dispatch(fetchSchedule({ queryParams }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Reset rendered-events dedup set on each render
  useEffect(() => { renderedEventsRef.current = new Set(); });

  // ── Filter options (admin / teacher) ──────────────────────────────────────
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      const response = await axios.get(`${API_URL}/api/students/teacher/filters`, config);
      const { schoolBranches = [] } = response.data;

      let teacherOptions = [];
      if (user?.role === 'admin') {
        try {
          const usersRes = await axios.get(`${API_URL}/api/users`, config);
          teacherOptions = (usersRes.data || [])
            .filter(u => u.role === 'teacher')
            .map(t => ({ value: t._id, label: t.name }));
        } catch { /* non-critical */ }
      }

      setFilterOptions({ schoolBranches, teachers: teacherOptions });

      const branchIds = schoolBranches.map(b => b.value || b._id || b.id).filter(Boolean);
      if (branchIds.length > 0) fetchBranchNames(branchIds);
    } catch { /* ignore */ } finally {
      setLoadingFilters(false);
    }
  };

  // ── Branch name resolution ─────────────────────────────────────────────────
  const fetchBranchNames = async (branchIds) => {
    if (!branchIds?.length) return;
    try {
      const config   = { headers: { Authorization: `Bearer ${authToken}` } };
      const response = await axios.post(`${API_URL}/api/branches/batch`, { branchIds }, config);
      let branches   = Array.isArray(response.data) ? response.data : (response.data?.branches ?? []);
      const map      = {};
      branches.forEach(b => { if (b?._id && b?.name) map[b._id] = b.name; });
      setBranchNames(prev => ({ ...prev, ...map }));
    } catch {
      const fallback = {};
      branchIds.forEach(id => { if (id && !branchNames[id]) fallback[id] = `Branch ${id.slice(-4)}`; });
      if (Object.keys(fallback).length > 0) setBranchNames(prev => ({ ...prev, ...fallback }));
    }
  };

  // Fetch branch names whenever new schedule data arrives
  useEffect(() => {
    if (!scheduleData) return;
    const ids = new Set();
    Object.values(scheduleData).forEach(events =>
      events.forEach(ev => { if (ev.schoolBranch) ids.add(ev.schoolBranch); })
    );
    if (ids.size > 0) fetchBranchNames(Array.from(ids));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleData]);

  // ── Subject colour ─────────────────────────────────────────────────────────
  const getSubjectColor = (subjectName) => {
    if (!subjectName) return 'hsl(var(--primary))';
    if (subjectColors[subjectName]) return subjectColors[subjectName];
    const colors = [
      'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
      'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--ring))',
      '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
      '#0288d1', '#c2185b', '#00796b', '#5d4037', '#455a64'
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    setSubjectColors(prev => ({ ...prev, [subjectName]: color }));
    return color;
  };

  // ── Merge consecutive slots ────────────────────────────────────────────────
  const mergeConsecutiveClasses = (events) => {
    if (!events?.length) return events;
    const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const merged = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      let endTime = cur.endTime;
      let mergedEvent = { ...cur };
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (
          next.startTime === endTime &&
          next.subject === cur.subject &&
          next.schoolBranch === cur.schoolBranch &&
          next.direction === cur.direction
        ) {
          endTime = next.endTime;
          mergedEvent.endTime = endTime;
          if (next.teacherNames) mergedEvent.teacherNames = [...new Set([...(mergedEvent.teacherNames || []), ...next.teacherNames])];
          if (next.studentNames) mergedEvent.studentNames = [...new Set([...(mergedEvent.studentNames || []), ...next.studentNames])];
          mergedEvent.teacherCount = mergedEvent.teacherNames?.length || 0;
          mergedEvent.studentCount = mergedEvent.studentNames?.length || 0;
          i = j;
        } else break;
      }
      merged.push(mergedEvent);
    }
    return merged;
  };

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (type, value) => setFilters(prev => ({ ...prev, [type]: value }));

  const handleEventClick = (event) => {
    setSelectedEvent({
      ...event,
      teacherNames: event.teacherNames ||
        (event.teachers ? event.teachers.map(t => t.name || t) : []) ||
        (event.teacher ? [typeof event.teacher === 'object' ? event.teacher.name : event.teacher] : []),
      studentNames: event.studentNames ||
        (event.students ? event.students.map(s => s.name || s) : []) ||
        (event.student ? [typeof event.student === 'object' ? event.student.name : event.student] : []),
      teacherCount: event.teacherCount || (event.teacherNames?.length ?? 0) || (event.teachers?.length ?? 0) || (event.teacher ? 1 : 0),
      studentCount: event.studentCount || (event.studentNames?.length ?? 0) || (event.students?.length ?? 0) || (event.student ? 1 : 0),
      schoolBranchName: branchNames[event.schoolBranch] || event.schoolBranch || 'Unknown Branch',
    });
    setDialogOpen(true);
  };

  // ── Dimension / time helpers ──────────────────────────────────────────────
  const formatTime = (time24) => { const [h, m] = time24.split(':'); return `${h}:${m}`; };

  const calculateEventDimensions = (event) => {
    const [sh, sm] = event.startTime.split(':').map(Number);
    const [eh, em] = event.endTime.split(':').map(Number);
    const dur = (eh * 60 + em) - (sh * 60 + sm);
    return { height: (dur / 60) * 60, topOffset: (sm / 60) * 60, durationMinutes: dur };
  };

  const getEventsForTimeSlot = (day, timeSlot) => {
    const events = scheduleData?.[day];
    if (!Array.isArray(events)) return [];
    return events.filter(ev => {
      if (ev.startTime === timeSlot) return true;
      return ev.startTime.split(':')[0] === timeSlot.split(':')[0];
    });
  };

  const getAllEventsForDay = (day) => {
    const events = scheduleData?.[day];
    return Array.isArray(events) ? [...events].sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  };

  // ── Event renderers ───────────────────────────────────────────────────────
  const renderMobileEvent = (event, index) => {
    const bg           = getSubjectColor(event.subject);
    const teacherCount = event.teacherNames?.length ?? 0;
    const studentCount = event.studentNames?.length ?? 0;
    const teacherLabel = teacherCount > 0
      ? event.teacherNames.slice(0, 2).join(', ') + (teacherCount > 2 ? '...' : '') : null;

    return (
      <Card
        key={`mobile-${event._id}-${index}`}
        className="mb-3 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-l-4"
        style={{ borderLeftColor: bg }}
        onClick={() => handleEventClick(event)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-foreground">{event.subject}</h3>
            <span className="text-sm text-muted-foreground">{event.startTime} - {event.endTime}</span>
          </div>
          {teacherLabel && <p className="text-sm text-muted-foreground mb-2">👨‍🏫 {teacherLabel}</p>}
          <div className="flex gap-2 flex-wrap items-center">
            {teacherCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <User className="w-3 h-3 mr-1" />{teacherCount} {t('schedule.teachersLower')}
              </Badge>
            )}
            {studentCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />{studentCount} {t('schedule.studentsLower')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEvent = (event, isCompact = false) => {
    if (!event) return null;
    const { height, topOffset } = calculateEventDimensions(event);
    const teacherCount = event.teacherNames?.length ?? 0;
    const studentCount = event.studentNames?.length ?? 0;
    const teacherLabel = teacherCount > 0
      ? ` • ${event.teacherNames[0]}${teacherCount > 1 ? ` +${teacherCount - 1}` : ''}` : '';
    const bg = getSubjectColor(event.subject);

    return (
      <Card
        key={event._id}
        className="absolute cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] z-10 hover:z-50 overflow-hidden border border-border/20 shadow-sm"
        style={{ top: `${topOffset}px`, left: '2px', right: '2px', height: `${height - 4}px`, minHeight: `${height - 4}px`, backgroundColor: bg }}
        onClick={() => handleEventClick(event)}
      >
        <CardContent className={`h-full flex flex-col justify-between ${isCompact ? 'p-1' : 'p-2'}`}>
          <div className="text-foreground">
            <h4 className={`font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{event.subject}</h4>
            <p className="text-xs opacity-90">{event.startTime} - {event.endTime}</p>
          </div>
          {!isCompact && teacherLabel && <p className="text-xs opacity-90 text-foreground">{teacherLabel}</p>}
          {!isCompact && (teacherCount > 0 || studentCount > 0) && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {teacherCount > 0 && <Badge variant="secondary" className="text-xs h-4"><User className="w-2 h-2 mr-1" />{teacherCount}</Badge>}
              {studentCount > 0 && <Badge variant="secondary" className="text-xs h-4"><Users className="w-2 h-2 mr-1" />{studentCount}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Guard: show skeleton only when we have nothing to display yet ──────────
  if (isLoading && !scheduleData) return <ScheduleSkeleton />;

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          ⚠️ {errorMessage}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
              <CardTitle className="text-3xl font-light">{t('schedule.weeklySchedule')}</CardTitle>
              <p className="text-muted-foreground">
                {user?.role === 'student' && t('schedule.header.student')}
                {user?.role === 'teacher' && t('schedule.header.teacher')}
                {user?.role === 'admin'   && t('schedule.header.admin')}
              </p>
            </div>
          </div>

          {/* Filters — admin & teacher */}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{t('schedule.filtersTitle')}</h3>
                {/* Subtle "revalidating" pulse when loading in the background */}
                {isLoading && scheduleData && (
                  <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                    {t('common.updating') || 'Updating…'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('schedule.branch')}</Label>
                  <Select value={filters.schoolBranch} onValueChange={v => handleFilterChange('schoolBranch', v)} disabled={loadingFilters}>
                    <SelectTrigger><SelectValue placeholder={t('schedule.allBranches')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('schedule.allBranches')}</SelectItem>
                      {filterOptions.schoolBranches.map(branch => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branchNames[branch.value] || branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label>{t('schedule.teacher')}</Label>
                    <Select value={filters.teacher} onValueChange={v => handleFilterChange('teacher', v)} disabled={loadingFilters}>
                      <SelectTrigger><SelectValue placeholder={t('schedule.allTeachers')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('schedule.allTeachers')}</SelectItem>
                        {filterOptions.teachers.map(teacher => (
                          <SelectItem key={teacher.value} value={teacher.value}>{teacher.label}</SelectItem>
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

      {/* Desktop calendar grid */}
      <Card className="hidden lg:block">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 lg:grid-cols-8 gap-0 min-w-[800px]">
              {/* Corner header */}
              <div className="sticky left-0 bg-background z-20 border-b-2 border-primary border-r border-border dark:border-white/10">
                <div className="p-2 h-[50px] flex items-center justify-center text-sm font-semibold">
                  {t('schedule.time')}
                </div>
              </div>
              {/* Day headers */}
              {daysOfWeek.map(day => (
                <div key={`header-${day}`} className="border-b-2 border-primary border-r border-border dark:border-white/10 bg-primary text-primary-foreground">
                  <div className="p-2 text-center h-[50px] flex items-center justify-center text-sm font-semibold">{day}</div>
                </div>
              ))}
              {/* Time rows */}
              {timeSlots.map(timeSlot => (
                <Fragment key={timeSlot}>
                  <div className="border-r border-border dark:border-white/10 border-b bg-muted/30 text-foreground sticky left-0 z-10">
                    <div className="p-2 text-center text-xs font-medium min-h-[60px] flex items-center justify-center">
                      {formatTime(timeSlot)}
                    </div>
                  </div>
                  {daysOfWeek.map(day => {
                    const events = getEventsForTimeSlot(day, timeSlot);
                    return (
                      <div key={`${day}-${timeSlot}`} className="border-r border-border dark:border-white/10 border-b bg-background relative min-h-[60px]">
                        {mergeConsecutiveClasses(events).map(ev => renderEvent(ev, false))}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile list */}
      <Card className="lg:hidden">
        <CardContent className="p-4">
          <div className="space-y-4">
            {daysOfWeek.map(day => {
              const events = getAllEventsForDay(day);
              if (!events.length) return null;
              return (
                <div key={day} className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">{day}</h3>
                  {events.map((ev, i) => renderMobileEvent(ev, i))}
                </div>
              );
            })}
            {daysOfWeek.every(day => !getAllEventsForDay(day).length) && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('schedule.noLessonsThisWeek')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('schedule.lessonDetails')}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('schedule.lesson')}: {selectedEvent.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{t('schedule.time')}: {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{t('schedule.branch')}: {
                      selectedEvent.schoolBranch
                        ? branchNames[selectedEvent.schoolBranch] || selectedEvent.schoolBranchName || selectedEvent.schoolBranch
                        : t('schedule.unknownBranch')
                    }</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{t('schedule.direction')}: {selectedEvent.direction}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      {t('schedule.teachers')} ({selectedEvent.teacherCount || 0}):
                    </h4>
                    {selectedEvent.teacherNames?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.teacherNames.map((teacher, i) => (
                          <Badge key={i} variant="secondary">{teacher}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('schedule.noTeachersAssigned')}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      {t('schedule.students')} ({selectedEvent.studentCount || 0}):
                    </h4>
                    {selectedEvent.studentNames?.length > 0 ? (
                      <div className="max-h-[200px] overflow-auto">
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.studentNames.slice(0, 10).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                        {selectedEvent.studentNames.length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('schedule.andMoreStudents', { count: selectedEvent.studentNames.length - 10 })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('schedule.noStudentsRegistered')}</p>
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
