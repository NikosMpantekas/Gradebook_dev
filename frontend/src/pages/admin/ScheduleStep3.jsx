import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/appConfig.jsx';
import { toast } from 'react-toastify';
import { Zap, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';

const WEIGHT_FIELDS = [
  { key: 'preferredDays',    label: 'Preferred days',     desc: 'Reward slots on preferred days' },
  { key: 'avoidLateHours',   label: 'Avoid late hours',   desc: 'Penalise sessions after 17:00' },
  { key: 'minimizeGaps',     label: 'Minimise gaps',      desc: 'Penalise idle time between teacher sessions' },
  { key: 'teacherStability', label: 'Teacher stability',  desc: 'Favour consistent teacher assignment' },
];

const ScheduleStep3 = ({
  selectedClasses,
  classConfigs,
  userAvailability,
  genOptions,
  setGenOptions,
  setRunResult,
  onGenerated,
  authHeader,
}) => {
  const [generating,    setGenerating]    = useState(false);
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  const updateWeight = (key, value) => {
    setGenOptions((prev) => ({ ...prev, weights: { ...prev.weights, [key]: value } }));
  };

  const handleGenerate = async () => {
    if (selectedClasses.length === 0) {
      toast.error('No classes selected');
      return;
    }

    // Save schedulingConfig for each class before generating
    for (const cls of selectedClasses) {
      const cfg = classConfigs[cls._id];
      if (!cfg) continue;
      try {
        await axios.put(
          `${API_URL}/api/schedule-runs/class-config/${cls._id}`,
          {
            schedulingConfig: {
              sessionsPerWeek:        cfg.sessionsPerWeek        || 1,
              sessionDurationMinutes: cfg.sessionDurationMinutes || 60,
              preferredDays:          cfg.preferredDays          || [],
            },
          },
          authHeader
        );
      } catch (err) {
        console.warn(`[Step3] Could not save config for ${cls._id}:`, err.message);
      }
    }

    setGenerating(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/schedule-runs/generate`,
        {
          classIds:       selectedClasses.map((c) => c._id),
          candidateCount: genOptions.candidateCount,
          weights:        genOptions.weights,
        },
        authHeader
      );

      if (data.success && data.run) {
        setRunResult(data.run);
        toast.success(`Generated ${data.run.candidates?.length || 0} candidate(s)`);
        onGenerated();
      } else {
        toast.error(data.message || 'Generation failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating schedules');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Generate timetable candidates</h2>

      {/* Candidate count */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Number of candidates (1–5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              min={1} max={5} step={1}
              value={[genOptions.candidateCount]}
              onValueChange={([v]) => setGenOptions((p) => ({ ...p, candidateCount: v }))}
              className="flex-1"
            />
            <span className="text-2xl font-bold text-primary w-8 text-center">
              {genOptions.candidateCount}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            More candidates means more variety to choose from.
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-medium mb-2">Run summary</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {selectedClasses.map((cls) => {
              const cfg = classConfigs[cls._id] || {};
              return (
                <li key={cls._id}>
                  <span className="font-medium text-foreground">{cls.name}</span>
                  {' — '}
                  {cfg.sessionsPerWeek || 1}×/wk · {cfg.sessionDurationMinutes || 60} min
                  {(cfg.preferredDays || []).length > 0 && ` · prefers ${cfg.preferredDays.join(', ')}`}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Advanced weights (collapsible) */}
      <div>
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced optimisation weights
        </button>

        {showAdvanced && (
          <Card className="mt-3">
            <CardContent className="pt-4 space-y-4">
              {WEIGHT_FIELDS.map(({ key, label, desc }) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs font-medium">{label}</Label>
                    <span className="text-xs text-muted-foreground">
                      {(genOptions.weights?.[key] ?? 1.0).toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    min={0} max={3} step={0.1}
                    value={[genOptions.weights?.[key] ?? 1.0]}
                    onValueChange={([v]) => updateWeight(key, v)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate button */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={generating || selectedClasses.length === 0}
      >
        {generating
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          : <><Zap className="h-4 w-4" /> Generate {genOptions.candidateCount} Candidate(s)</>}
      </Button>
    </div>
  );
};

export default ScheduleStep3;
