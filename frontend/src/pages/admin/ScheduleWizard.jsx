import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../../config/appConfig.jsx';
import { toast } from 'react-toastify';
import { CalendarClock, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import ScheduleStep2 from './ScheduleStep2';
import ScheduleStep3 from './ScheduleStep3';
import ScheduleStep4 from './ScheduleStep4';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STEPS = [
  { id: 1, label: 'Select Classes' },
  { id: 2, label: 'Restrictions' },
  { id: 3, label: 'Generate' },
  { id: 4, label: 'Compare & Apply' },
];

const ScheduleWizard = () => {
  const { user } = useSelector((s) => s.auth);
  const authHeader = { headers: { Authorization: `Bearer ${user?.token}` } };

  const [step,      setStep]      = useState(1);
  const [classes,   setClasses]   = useState([]);
  const [loading,   setLoading]   = useState(false);

  // Step 1 state
  const [selectedIds,   setSelectedIds]   = useState([]);
  const [classConfigs,  setClassConfigs]  = useState({}); // classId → {sessionsPerWeek, sessionDurationMinutes, preferredDays}

  // Step 2 state — availability per userId
  const [userAvailability, setUserAvailability] = useState({}); // userId → weeklyWindows

  // Step 3 state — generate options
  const [genOptions, setGenOptions] = useState({ candidateCount: 3, weights: {} });

  // Step 4 state — run result
  const [runResult, setRunResult] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/classes`, authHeader);
        const list = data.classes || data || [];
        setClasses(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const toggleClass = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (!classConfigs[id]) {
      setClassConfigs((prev) => ({
        ...prev,
        [id]: { sessionsPerWeek: 1, sessionDurationMinutes: 60, preferredDays: [] },
      }));
    }
  };

  const updateConfig = (classId, field, value) => {
    setClassConfigs((prev) => ({ ...prev, [classId]: { ...prev[classId], [field]: value } }));
  };

  const togglePreferredDay = (classId, day) => {
    setClassConfigs((prev) => {
      const current = prev[classId]?.preferredDays || [];
      const updated  = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
      return { ...prev, [classId]: { ...prev[classId], preferredDays: updated } };
    });
  };

  const selectedClasses = classes.filter((c) => selectedIds.includes(c._id));

  const canProceed = {
    1: selectedIds.length > 0,
    2: true,
    3: true,
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarClock className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Schedule Wizard</h1>
          <p className="text-sm text-muted-foreground">Generate and apply optimised timetable candidates</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${step === s.id ? 'bg-primary text-primary-foreground' : step > s.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {step > s.id ? <Check className="h-3.5 w-3.5" /> : <span>{s.id}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1 ─────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select classes to schedule</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading classes…</p>
          ) : classes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No classes found. Create classes first.</p>
          ) : (
            <div className="grid gap-3">
              {classes.map((cls) => {
                const checked = selectedIds.includes(cls._id);
                const cfg     = classConfigs[cls._id] || {};
                return (
                  <Card key={cls._id} className={`border-2 transition-colors ${checked ? 'border-primary/50' : ''}`}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`cls-${cls._id}`}
                          checked={checked}
                          onCheckedChange={() => toggleClass(cls._id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`cls-${cls._id}`} className="text-sm font-medium cursor-pointer">
                            {cls.name}
                            <span className="ml-2 text-xs text-muted-foreground">{cls.subject} · {cls.direction}</span>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(cls.teachers || []).length} teacher(s) · {(cls.students || []).length} student(s)
                          </p>
                          {checked && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Sessions / week</Label>
                                <Input type="number" min={1} max={7} value={cfg.sessionsPerWeek || 1}
                                  onChange={(e) => updateConfig(cls._id, 'sessionsPerWeek', Number(e.target.value))}
                                  className="h-7 text-sm mt-1" />
                              </div>
                              <div>
                                <Label className="text-xs">Duration (min)</Label>
                                <Input type="number" min={15} max={300} step={15} value={cfg.sessionDurationMinutes || 60}
                                  onChange={(e) => updateConfig(cls._id, 'sessionDurationMinutes', Number(e.target.value))}
                                  className="h-7 text-sm mt-1" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs mb-1 block">Preferred days (optional)</Label>
                                <div className="flex flex-wrap gap-1">
                                  {DAYS.map((day) => (
                                    <Badge key={day} variant="outline"
                                      className={`cursor-pointer text-xs transition-colors
                                        ${(cfg.preferredDays || []).includes(day) ? 'bg-primary text-primary-foreground' : ''}`}
                                      onClick={() => togglePreferredDay(cls._id, day)}>
                                      {day.slice(0, 3)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <ScheduleStep2
          selectedClasses={selectedClasses}
          userAvailability={userAvailability}
          setUserAvailability={setUserAvailability}
          authHeader={authHeader}
        />
      )}

      {step === 3 && (
        <ScheduleStep3
          selectedClasses={selectedClasses}
          classConfigs={classConfigs}
          userAvailability={userAvailability}
          genOptions={genOptions}
          setGenOptions={setGenOptions}
          setRunResult={setRunResult}
          onGenerated={() => setStep(4)}
          authHeader={authHeader}
        />
      )}

      {step === 4 && (
        <ScheduleStep4
          runResult={runResult}
          authHeader={authHeader}
        />
      )}

      {/* Navigation */}
      <Separator className="my-6" />
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step < 4 && step !== 3 && (
          <Button disabled={!canProceed[step]} onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScheduleWizard;
