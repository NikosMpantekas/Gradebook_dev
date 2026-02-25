import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { DatePicker } from '../../components/ui/date-picker';
import { TimePicker } from '../../components/ui/time-picker';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Power, PowerOff, Clock, History, AlertTriangle, CheckCircle,
  Trash2, RefreshCw, Calendar, Zap, Wrench, Users, Info,
  ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import api from '../../app/axios';
import { cn } from '../../lib/utils';

const ROLES = [
  { key: 'admin', label: 'Admins', icon: ShieldCheck, color: 'blue' },
  { key: 'teacher', label: 'Teachers', icon: Users, color: 'violet' },
  { key: 'student', label: 'Students', icon: Users, color: 'emerald' },
  { key: 'parent', label: 'Parents', icon: Users, color: 'orange' },
];

const roleColors = {
  blue: { chip: 'bg-blue-500/15 text-blue-400 border-blue-500/30', active: 'bg-blue-500 text-white border-blue-500' },
  violet: { chip: 'bg-violet-500/15 text-violet-400 border-violet-500/30', active: 'bg-violet-500 text-white border-violet-500' },
  emerald: { chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', active: 'bg-emerald-500 text-white border-emerald-500' },
  orange: { chip: 'bg-orange-500/15 text-orange-400 border-orange-500/30', active: 'bg-orange-500 text-white border-orange-500' },
};

const SystemMaintenance = () => {
  const { toast } = useToast();

  const [maintenanceData, setMaintenanceData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [formData, setFormData] = useState({
    isMaintenanceMode: false,
    maintenanceType: 'scheduled', // 'scheduled' | 'emergency'
    message: '',                  // unified message + reason
    hasEstimatedCompletion: false,
    estimatedDate: '',
    estimatedTime: '',
    allowedRoles: [],
  });

  useEffect(() => {
    fetchMaintenanceData();
    fetchMaintenanceHistory();
  }, []);

  const formatETA = (est) => {
    if (!est) return null;
    try {
      const date = new Date(est);
      if (isNaN(date.getTime())) return null;

      const now = new Date();
      const diffMs = date - now;

      // Past by more than 5 minutes → treat as done
      if (diffMs < -5 * 60000) return null;

      const diffMins = Math.ceil(diffMs / 60000);
      const diffHrs = Math.ceil(diffMs / 3600000);

      if (diffMins <= 1) return 'Σύντομα';
      if (diffMins <= 60) return `~${diffMins} λεπτά`;
      if (diffHrs <= 23) return `~${diffHrs} ώρες`;

      // More than a day away — show full date + time
      return date.toLocaleString('el-GR', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const fetchMaintenanceData = async () => {
    try {
      const response = await api.get('/api/system/maintenance');
      const data = response.data;
      setMaintenanceData(data);

      let estimatedDate = '';
      let estimatedTime = '';
      const hasEst = !!data.estimatedCompletion;
      if (hasEst) {
        // Parse the date string as UTC to avoid local timezone interpretation issues
        const d = new Date(data.estimatedCompletion);

        // Extract local date components from the Date object
        estimatedDate = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0')
        ].join('-');
        estimatedTime = [
          String(d.getHours()).padStart(2, '0'),
          String(d.getMinutes()).padStart(2, '0')
        ].join(':');
      }

      setFormData({
        isMaintenanceMode: data.isMaintenanceMode,
        maintenanceType: data.maintenanceType || 'scheduled',
        message: data.maintenanceMessage || data.reason || '',
        hasEstimatedCompletion: hasEst,
        estimatedDate,
        estimatedTime,
        allowedRoles: data.allowedRoles || [],
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch maintenance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceHistory = async () => {
    try {
      const response = await api.get('/api/system/maintenance/history');
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('[SYSTEM MAINTENANCE] Error fetching history:', error);
    }
  };

  const buildPayload = (overrideMode) => {
    const isEnabled = overrideMode !== undefined ? overrideMode : formData.isMaintenanceMode;
    let estimatedCompletion = null;
    if (formData.hasEstimatedCompletion && formData.estimatedDate) {
      const time = formData.estimatedTime || '00:00';
      estimatedCompletion = `${formData.estimatedDate}T${time}`;
    }
    return {
      isMaintenanceMode: isEnabled,
      maintenanceMessage: formData.message,
      reason: formData.message,
      estimatedCompletion,
      allowedRoles: formData.allowedRoles,
      maintenanceType: formData.maintenanceType,
    };
  };

  const handleToggleMaintenance = async () => {
    const enabling = !formData.isMaintenanceMode;
    if (enabling && !formData.message.trim()) {
      toast({ title: 'Message Required', description: 'Please provide a maintenance message before enabling.', variant: 'destructive' });
      return;
    }

    setUpdating(true);
    try {
      const payload = buildPayload(enabling);
      const response = await api.put('/api/system/maintenance', payload);
      toast({ title: enabling ? '🔴 Maintenance Enabled' : '✅ System Online', description: response.data.message });
      await fetchMaintenanceData();
      await fetchMaintenanceHistory();
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update maintenance mode', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdating(true);
    try {
      const payload = buildPayload();
      await api.put('/api/system/maintenance', payload);
      toast({ title: 'Settings Updated', description: 'Maintenance settings saved successfully.' });
      await fetchMaintenanceData();
      await fetchMaintenanceHistory();
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update settings', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear the maintenance history?')) return;
    try {
      await api.delete('/api/system/maintenance/history');
      toast({ title: 'History Cleared' });
      setHistory([]);
    } catch {
      toast({ title: 'Error', description: 'Failed to clear history', variant: 'destructive' });
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter(r => r !== role)
        : [...prev.allowedRoles, role],
    }));
  };

  const formatTimestamp = (ts) => ts ? new Date(ts).toLocaleString('el-GR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const getActionBadge = (action) => {
    const map = {
      enabled: { cls: 'bg-red-500/15 text-red-400 border border-red-500/20', label: 'Enabled' },
      disabled: { cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', label: 'Disabled' },
      updated: { cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20', label: 'Updated' },
    };
    const v = map[action] || map.updated;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.cls}`}>{v.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Loading maintenance settings...</span>
      </div>
    );
  }

  const isActive = formData.isMaintenanceMode;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Maintenance</h1>
          <p className="text-sm text-muted-foreground">Control and schedule system-wide maintenance windows</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border",
          isActive
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {isActive ? <PowerOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isActive ? 'Maintenance Active' : 'System Online'}
        </div>
      </div>

      {/* ── Status Banner ── */}
      {isActive && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-semibold text-red-400">Maintenance mode is live</p>
            <p className="opacity-80 mt-0.5">
              {formData.allowedRoles.length > 0
                ? `Users with access: ${formData.allowedRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1) + 's').join(', ')}`
                : 'All regular users are blocked. Only SuperAdmins can access the system.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Power Toggle ── */}
      <Card className={cn(
        "border-l-4",
        isActive ? "border-l-red-500" : "border-l-emerald-500"
      )}>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-base">
              {isActive ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isActive
                ? 'Restore full access. All blocked users will be able to log in again.'
                : 'Block user access. Configure details below before enabling.'}
            </p>
          </div>
          <Button
            onClick={handleToggleMaintenance}
            disabled={updating}
            variant={isActive ? "destructive" : "default"}
            size="lg"
            className="shrink-0 min-w-[130px]"
          >
            {updating
              ? <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              : isActive
                ? <Power className="h-4 w-4 mr-2" />
                : <PowerOff className="h-4 w-4 mr-2" />}
            {isActive ? 'Disable' : 'Enable'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Configuration Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5" />
            Maintenance Configuration
          </CardTitle>
          <CardDescription>These settings apply immediately when maintenance is active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Maintenance Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'scheduled', icon: Calendar, label: 'Scheduled', desc: 'Planned upgrade or routine task' },
                { key: 'emergency', icon: Zap, label: 'Emergency', desc: 'Urgent fix or critical incident' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, maintenanceType: key }))}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                    formData.maintenanceType === key
                      ? key === 'emergency'
                        ? "border-red-500/50 bg-red-500/5 text-foreground"
                        : "border-blue-500/50 bg-blue-500/5 text-foreground"
                      : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 mt-0.5 flex-shrink-0",
                    formData.maintenanceType === key
                      ? key === 'emergency' ? 'text-red-400' : 'text-blue-400'
                      : ''
                  )} />
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Unified Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-semibold">
              Maintenance Message
              <span className="text-xs text-muted-foreground font-normal ml-2">— shown on the maintenance page &amp; logged as reason</span>
            </Label>
            <Textarea
              id="message"
              placeholder={
                formData.maintenanceType === 'emergency'
                  ? "e.g., Critical security patch being applied. Estimated fix time: 30 minutes."
                  : "e.g., Scheduled software update. We're upgrading to improve your experience."
              }
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Estimated Completion */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Estimated Completion</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If not set, the maintenance page will show <span className="italic">"Soon"</span>
                </p>
              </div>
              <Switch
                checked={formData.hasEstimatedCompletion}
                onCheckedChange={(val) => setFormData(prev => ({
                  ...prev,
                  hasEstimatedCompletion: val,
                  estimatedDate: val ? prev.estimatedDate : '',
                  estimatedTime: val ? prev.estimatedTime : '',
                }))}
              />
            </div>

            {formData.hasEstimatedCompletion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date
                  </Label>
                  <DatePicker
                    placeholder="Select date"
                    value={formData.estimatedDate}
                    onChange={(v) => setFormData(prev => ({ ...prev, estimatedDate: v || '' }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Time
                  </Label>
                  <TimePicker
                    placeholder="Select time"
                    value={formData.estimatedTime}
                    onChange={(v) => setFormData(prev => ({ ...prev, estimatedTime: v || '' }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Role Access */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Access During Maintenance</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select which roles can still use the system. SuperAdmins always have access.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(({ key, label, color }) => {
                const isOn = formData.allowedRoles.includes(key);
                const colors = roleColors[color];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleRoleToggle(key)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150",
                      isOn ? colors.active : colors.chip,
                      "hover:opacity-90 active:scale-95"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <span className="px-4 py-2 rounded-full text-sm font-medium border bg-zinc-500/10 text-zinc-400 border-zinc-500/20 cursor-not-allowed opacity-60">
                SuperAdmins ✓
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button onClick={handleUpdateSettings} disabled={updating} className="min-w-[140px]">
              {updating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
            <Button onClick={fetchMaintenanceData} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            {maintenanceData?.updatedAt && (
              <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
                Last saved: {formatTimestamp(maintenanceData.updatedAt)}
                {maintenanceData?.lastModifiedBy?.name && ` by ${maintenanceData.lastModifiedBy.name}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Maintenance History ── */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setHistoryExpanded(v => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Maintenance History
              {history.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">({history.length} entries)</span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {historyExpanded && history.length > 0 && (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleClearHistory(); }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear
                </Button>
              )}
              {historyExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>

        {historyExpanded && (
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No maintenance history yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Message / Reason</TableHead>
                      <TableHead>Previous State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>{getActionBadge(entry.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{entry.modifiedBy?.name || 'Unknown'}</p>
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate">{entry.reason || '—'}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-medium",
                            entry.previousState?.isMaintenanceMode ? "text-red-400" : "text-emerald-400"
                          )}>
                            {entry.previousState?.isMaintenanceMode ? 'Active' : 'Offline'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SystemMaintenance;
