import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/appConfig.jsx';
import { toast } from 'react-toastify';
import { CheckCircle2, AlertTriangle, Star, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CLASS_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
];

/** Mini weekly calendar for one candidate */
const WeeklyView = ({ assignments, classIdToName }) => {
  const slotsByDay = {};
  DAYS.forEach((d) => { slotsByDay[d] = []; });

  assignments.forEach((asgn, idx) => {
    const name  = classIdToName[asgn.classId?.toString()] || 'Class';
    const color = CLASS_COLORS[idx % CLASS_COLORS.length];
    (asgn.slots || []).forEach((slot) => {
      slotsByDay[slot.day]?.push({ name, color, startTime: slot.startTime, endTime: slot.endTime });
    });
  });

  // Sort each day by start time
  DAYS.forEach((d) => {
    slotsByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const activeDays = DAYS.filter((d) => slotsByDay[d].length > 0);

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(activeDays.length, 5)}, 1fr)` }}>
      {activeDays.map((day) => (
        <div key={day} className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1 text-center">{day.slice(0, 3)}</p>
          {slotsByDay[day].map((item, i) => (
            <div key={i} className={`rounded-md px-2 py-1.5 mb-1 text-[10px] font-medium ${item.color}`}>
              <p className="truncate">{item.name}</p>
              <p className="opacity-80">{item.startTime}–{item.endTime}</p>
            </div>
          ))}
        </div>
      ))}
      {activeDays.length === 0 && (
        <p className="text-xs text-muted-foreground col-span-5">No slots assigned.</p>
      )}
    </div>
  );
};

const ScheduleStep4 = ({ runResult, authHeader }) => {
  const [applying,     setApplying]     = useState(false);
  const [appliedRank,  setAppliedRank]  = useState(runResult?.appliedCandidateRank || null);
  const [confirmRank,  setConfirmRank]  = useState(null);

  if (!runResult) {
    return <p className="text-muted-foreground text-sm">No run result available. Go back and generate first.</p>;
  }

  const { candidates = [], classIds = [], _id: runId } = runResult;

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
        <p className="font-medium">No valid candidates were generated.</p>
        <p className="text-sm text-muted-foreground mt-1">
          {runResult.errorMessage || 'Try relaxing availability restrictions or changing the class config.'}
        </p>
      </div>
    );
  }

  // Build classId → name map from the run's classIds array
  const classIdToName = {};
  (classIds || []).forEach((c) => {
    const id   = c._id || c;
    const name = c.name || id.toString().slice(-6);
    classIdToName[id.toString()] = name;
  });

  const applyCandidate = async (rank) => {
    setApplying(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/schedule-runs/${runId}/apply/${rank}`,
        {},
        authHeader
      );
      if (data.success) {
        setAppliedRank(rank);
        toast.success(`Candidate ${rank} applied — Class.schedule updated for ${data.updatedClasses?.length} class(es)`);
      } else {
        toast.error(data.message || 'Apply failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error applying candidate');
    } finally {
      setApplying(false);
      setConfirmRank(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Compare candidates & apply</h2>
      <p className="text-sm text-muted-foreground">
        Review each candidate timetable. Applying writes the chosen schedule into each class's published timetable.
      </p>

      <Tabs defaultValue={`rank-${candidates[0]?.rank}`}>
        <TabsList className="flex-wrap h-auto gap-1">
          {candidates.map((c) => (
            <TabsTrigger key={c.rank} value={`rank-${c.rank}`} className="gap-1">
              {c.rank === 1 && <Star className="h-3 w-3 text-yellow-500" />}
              Option {c.rank}
              {appliedRank === c.rank && <Check className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {candidates.map((candidate) => {
          const hardViolations = candidate.violations?.filter((v) => v.startsWith('HARD')) || [];
          const warnings       = candidate.violations?.filter((v) => v.startsWith('WARN')) || [];
          const isApplied      = appliedRank === candidate.rank;

          return (
            <TabsContent key={candidate.rank} value={`rank-${candidate.rank}`} className="mt-4 space-y-4">
              {/* Score bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Score</span>
                    <span className="font-semibold text-foreground">{candidate.score}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, candidate.score))}%` }}
                    />
                  </div>
                </div>
                {isApplied && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Applied
                  </Badge>
                )}
              </div>

              {/* Summary */}
              <p className="text-xs text-muted-foreground">{candidate.summary}</p>

              {/* Violations */}
              {hardViolations.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 space-y-1">
                  {hardViolations.map((v, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-300">{v}</p>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 space-y-1">
                  {warnings.map((v, i) => (
                    <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">{v}</p>
                  ))}
                </div>
              )}

              {/* Weekly calendar */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-xs text-muted-foreground">Weekly view</CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklyView assignments={candidate.assignments || []} classIdToName={classIdToName} />
                </CardContent>
              </Card>

              {/* Slot list */}
              <div className="space-y-2">
                {(candidate.assignments || []).map((asgn) => {
                  const name = classIdToName[asgn.classId?.toString()] || asgn.classId?.toString()?.slice(-6);
                  return (
                    <div key={asgn.classId} className="flex items-start gap-3 text-sm">
                      <span className="font-medium min-w-[140px] truncate">{name}</span>
                      <div className="flex flex-wrap gap-1">
                        {(asgn.slots || []).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s.day.slice(0, 3)} {s.startTime}–{s.endTime}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <Button
                className="w-full gap-2"
                variant={isApplied ? 'secondary' : 'default'}
                disabled={applying || isApplied || hardViolations.length > 0}
                onClick={() => setConfirmRank(candidate.rank)}
              >
                {isApplied ? (
                  <><CheckCircle2 className="h-4 w-4" /> Already applied</>
                ) : hardViolations.length > 0 ? (
                  'Cannot apply — hard constraint violations'
                ) : (
                  `Apply Candidate ${candidate.rank}`
                )}
              </Button>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Confirmation dialog */}
      <Dialog open={confirmRank !== null} onOpenChange={() => setConfirmRank(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply candidate {confirmRank}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will overwrite each selected class's published schedule. Existing sessions already
            generated from the old schedule are not affected — regenerate sessions afterwards.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRank(null)}>Cancel</Button>
            <Button onClick={() => applyCandidate(confirmRank)} disabled={applying}>
              {applying ? 'Applying…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleStep4;
