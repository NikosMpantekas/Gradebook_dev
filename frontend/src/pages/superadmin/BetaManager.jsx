import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FlaskConical, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useBeta } from '../../contexts/BetaContext';
import { API_URL } from '../../config/appConfig';

const MANAGED_PAGES = [
  { path: '/superadmin/dashboard', label: 'Dashboard', group: 'Superadmin' },
  { path: '/superadmin/school-permissions', label: 'School Management', group: 'Superadmin' },
  { path: '/superadmin/notifications', label: 'Notifications', group: 'Superadmin' },
  { path: '/superadmin/contact', label: 'Contact Messages', group: 'Superadmin' },
  { path: '/superadmin/system-logs', label: 'System Logs', group: 'Superadmin' },
  { path: '/superadmin/maintenance-announcements', label: 'Maintenance Announcements', group: 'Superadmin' },
  { path: '/superadmin/system-maintenance', label: 'System Maintenance', group: 'Superadmin' },
  { path: '/superadmin/patch-notes', label: 'Patch Notes', group: 'Superadmin' },
  { path: '/app/admin', label: 'Admin Dashboard', group: 'Admin' },
  { path: '/app/admin/users', label: 'User Management', group: 'Admin' },
  { path: '/app/admin/classes', label: 'Classes', group: 'Admin' },
  { path: '/app/admin/grades/manage', label: 'Grade Management', group: 'Admin' },
  { path: '/app/admin/attendance', label: 'Attendance', group: 'Admin' },
  { path: '/app/admin/notifications', label: 'Notifications', group: 'Admin' },
  { path: '/app/admin/ratings', label: 'Rating Manager', group: 'Admin' },
  { path: '/app/admin/payments', label: 'Payments', group: 'Admin' },
  { path: '/app/teacher', label: 'Teacher Dashboard', group: 'Teacher' },
  { path: '/app/teacher/grades/manage', label: 'Grade Management', group: 'Teacher' },
  { path: '/app/teacher/notifications', label: 'Notifications', group: 'Teacher' },
  { path: '/app/teacher/student-stats', label: 'Student Stats', group: 'Teacher' },
  { path: '/app/teacher/schedule', label: 'Schedule', group: 'Teacher' },
  { path: '/app/teacher/attendance', label: 'Attendance', group: 'Teacher' },
  { path: '/app/student', label: 'Student Dashboard', group: 'Student' },
  { path: '/app/student/grades', label: 'My Grades', group: 'Student' },
  { path: '/app/student/notifications', label: 'Notifications', group: 'Student' },
  { path: '/app/student/schedule', label: 'Schedule', group: 'Student' },
  { path: '/app/student/ratings', label: 'Ratings', group: 'Student' },
  { path: '/app/student/attendance', label: 'Attendance', group: 'Student' },
  { path: '/app/parent', label: 'Parent Dashboard', group: 'Parent' },
  { path: '/app/parent/grades', label: 'Student Grades', group: 'Parent' },
  { path: '/app/parent/payments', label: 'Payments', group: 'Parent' },
];

const GROUPS = ['Superadmin', 'Admin', 'Teacher', 'Student', 'Parent'];

const GROUP_COLORS = {
  Superadmin: 'border-purple-200 dark:border-purple-800',
  Admin: 'border-blue-200 dark:border-blue-800',
  Teacher: 'border-green-200 dark:border-green-800',
  Student: 'border-yellow-200 dark:border-yellow-800',
  Parent: 'border-orange-200 dark:border-orange-800',
};

const BetaManager = () => {
  const { user } = useSelector((state) => state.auth);
  const { betaRoutes, reload } = useBeta();
  const [localFlags, setLocalFlags] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const initial = {};
    MANAGED_PAGES.forEach((p) => {
      initial[p.path] = betaRoutes[p.path] === true;
    });
    setLocalFlags(initial);
    setDirty(false);
  }, [betaRoutes]);

  const toggle = (path) => {
    setLocalFlags((prev) => ({ ...prev, [path]: !prev[path] }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/beta-features`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routes: localFlags }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Beta flags saved successfully!');
        setDirty(false);
        reload();
      } else {
        toast.error(data.message || 'Failed to save beta flags');
      }
    } catch (err) {
      console.error('[BetaManager] Save error:', err);
      toast.error('Error saving beta flags');
    } finally {
      setSaving(false);
    }
  };

  const betaCount = Object.values(localFlags).filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold">Beta Feature Manager</h1>
            <p className="text-sm text-muted-foreground">
              {betaCount} page{betaCount !== 1 ? 's' : ''} currently marked as beta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { reload(); setDirty(false); }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Discard
          </Button>
          <Button onClick={save} disabled={saving || !dirty} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
        </div>
      )}

      <div className="space-y-5">
        {GROUPS.map((group) => {
          const pages = MANAGED_PAGES.filter((p) => p.group === group);
          const activeBeta = pages.filter((p) => localFlags[p.path]).length;
          return (
            <Card key={group} className={`border-2 ${GROUP_COLORS[group]}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {group}
                  <Badge variant="outline" className="text-xs font-normal">
                    {activeBeta} / {pages.length} beta
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pages.map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 mr-3">
                        <span className="text-sm font-medium truncate">{page.label}</span>
                        <span className="text-xs text-muted-foreground truncate">{page.path}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {localFlags[page.path] && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                            BETA
                          </Badge>
                        )}
                        <Switch
                          checked={!!localFlags[page.path]}
                          onCheckedChange={() => toggle(page.path)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BetaManager;
