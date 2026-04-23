import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/appConfig.jsx';
import { toast } from 'react-toastify';
import { Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS     = Array.from({ length: 28 }, (_, i) => 420 + i * 30); // 07:00 – 20:30, step 30 min

const minutesToTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * AvailabilityGrid — a day × time toggle grid for a single user.
 * Stores availability as {day: [{startTime, endTime}]} (30-min cells).
 */
const AvailabilityGrid = ({ userId, windows, onChange }) => {
  const isActive = (day, startMin) =>
    (windows[day] || []).some((w) => w.startTime === minutesToTime(startMin));

  const toggle = (day, startMin) => {
    const time = minutesToTime(startMin);
    const endTime = minutesToTime(startMin + 30);
    const existing = windows[day] || [];
    const already   = existing.some((w) => w.startTime === time);
    const updated   = already
      ? existing.filter((w) => w.startTime !== time)
      : [...existing, { startTime: time, endTime }];

    onChange(userId, { ...windows, [day]: updated });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="w-14 py-1 text-left text-muted-foreground font-normal">Time</th>
            {DAYS.map((d) => (
              <th key={d} className="py-1 text-center font-medium min-w-[54px]">
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((startMin) => (
            <tr key={startMin}>
              <td className="py-px text-muted-foreground pr-1">{minutesToTime(startMin)}</td>
              {DAYS.map((day) => (
                <td key={day} className="py-px px-0.5">
                  <button
                    type="button"
                    onClick={() => toggle(day, startMin)}
                    className={`w-full h-5 rounded-sm border transition-colors
                      ${isActive(day, startMin)
                        ? 'bg-primary/80 border-primary'
                        : 'bg-muted/30 border-border hover:bg-primary/20'}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1">Click cells to toggle availability. Filled = available.</p>
    </div>
  );
};

const ScheduleStep2 = ({ selectedClasses, userAvailability, setUserAvailability, authHeader }) => {
  const [savingId, setSavingId] = useState(null);

  // Collect unique teachers and students across all selected classes
  const teacherMap = {};
  const studentMap = {};
  selectedClasses.forEach((cls) => {
    (cls.teachers || []).forEach((t) => { if (t._id) teacherMap[t._id] = t; });
    (cls.students || []).forEach((s) => { if (s._id) studentMap[s._id] = s; });
  });
  const teachers = Object.values(teacherMap);
  const students = Object.values(studentMap);

  // Initialise local availability from loaded data
  useEffect(() => {
    const loadAvail = async () => {
      const allUsers = [...teachers, ...students];
      for (const u of allUsers) {
        if (!u._id || userAvailability[u._id]) continue;
        try {
          const { data } = await axios.get(`${API_URL}/api/users/${u._id}`, authHeader);
          const avail = data.schedulingAvailability?.weeklyWindows || {};
          setUserAvailability((prev) => ({ ...prev, [u._id]: avail }));
        } catch {
          setUserAvailability((prev) => ({ ...prev, [u._id]: {} }));
        }
      }
    };
    if (teachers.length + students.length > 0) loadAvail();
  }, [selectedClasses.length]);

  const handleChange = (userId, weeklyWindows) => {
    setUserAvailability((prev) => ({ ...prev, [userId]: weeklyWindows }));
  };

  const saveAvailability = async (userId) => {
    setSavingId(userId);
    try {
      await axios.put(
        `${API_URL}/api/schedule-runs/availability/${userId}`,
        { schedulingAvailability: { weeklyWindows: userAvailability[userId] || {} } },
        authHeader
      );
      toast.success('Availability saved');
    } catch {
      toast.error('Failed to save availability');
    } finally {
      setSavingId(null);
    }
  };

  const UserPanel = ({ person, role }) => (
    <Card key={person._id} className="mb-4">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {role === 'teacher' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          {person.name}
          <Badge variant="outline" className="text-[10px]">{role}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AvailabilityGrid
          userId={person._id}
          windows={userAvailability[person._id] || {}}
          onChange={handleChange}
        />
        <button
          className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
          disabled={savingId === person._id}
          onClick={() => saveAvailability(person._id)}
        >
          {savingId === person._id ? 'Saving…' : 'Save availability →'}
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Set availability restrictions</h2>
      <p className="text-sm text-muted-foreground">
        Toggle the cells when each person is <strong>available</strong>. Leave all empty to treat them as fully available.
      </p>

      {teachers.length === 0 && students.length === 0 ? (
        <p className="text-muted-foreground text-sm">Selected classes have no teachers or students yet.</p>
      ) : (
        <Tabs defaultValue="teachers">
          <TabsList>
            <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="teachers" className="mt-4">
            {teachers.length === 0
              ? <p className="text-sm text-muted-foreground">No teachers assigned.</p>
              : teachers.map((t) => <UserPanel key={t._id} person={t} role="teacher" />)}
          </TabsContent>
          <TabsContent value="students" className="mt-4">
            {students.length === 0
              ? <p className="text-sm text-muted-foreground">No students enrolled.</p>
              : students.map((s) => <UserPanel key={s._id} person={s} role="student" />)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ScheduleStep2;
