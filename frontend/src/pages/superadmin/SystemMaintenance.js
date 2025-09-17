import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { DatePicker } from '../../components/ui/date-picker';
import { TimePicker } from '../../components/ui/time-picker';
import { 
  Settings, 
  Power, 
  PowerOff, 
  Clock, 
  History, 
  AlertTriangle, 
  CheckCircle,
  Trash2,
  RefreshCw,
  Users,
  Calendar
} from 'lucide-react';
import api from '../../app/axios';

const SystemMaintenance = () => {
  const { toast } = useToast();
  
  // State management
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    isMaintenanceMode: false,
    maintenanceMessage: '',
    estimatedCompletion: '',
    reason: '',
    allowedRoles: []
  });

  useEffect(() => {
    fetchMaintenanceData();
    fetchMaintenanceHistory();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      console.log('[SYSTEM MAINTENANCE] Fetching maintenance data');
      const response = await api.get('/api/system/maintenance');
      const data = response.data;
      
      setMaintenanceData(data);
      setFormData({
        isMaintenanceMode: data.isMaintenanceMode,
        maintenanceMessage: data.maintenanceMessage || '',
        estimatedCompletion: data.estimatedCompletion ? 
          new Date(data.estimatedCompletion).toISOString().slice(0, 16) : '',
        reason: '',
        allowedRoles: data.allowedRoles || []
      });
      
      console.log('[SYSTEM MAINTENANCE] Maintenance data loaded:', {
        isMaintenanceMode: data.isMaintenanceMode,
        hasMessage: !!data.maintenanceMessage,
        allowedRoles: data.allowedRoles
      });
    } catch (error) {
      console.error('[SYSTEM MAINTENANCE] Error fetching maintenance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch maintenance data',
        variant: 'destructive'
      });
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

  const handleToggleMaintenance = async () => {
    // Only require reason when ENABLING maintenance, not when disabling (emergency action)
    if (!formData.isMaintenanceMode && !formData.reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for enabling maintenance mode',
        variant: 'destructive'
      });
      return;
    }

    setUpdating(true);
    try {
      const updateData = {
        isMaintenanceMode: !formData.isMaintenanceMode,
        maintenanceMessage: formData.maintenanceMessage,
        estimatedCompletion: formData.estimatedCompletion || null,
        reason: formData.reason || (formData.isMaintenanceMode ? 'Emergency disable' : 'Maintenance enabled'),
        allowedRoles: formData.allowedRoles
      };

      console.log('[SYSTEM MAINTENANCE] Toggling maintenance mode:', updateData);
      
      const response = await api.put('/api/system/maintenance', updateData);
      
      toast({
        title: 'Success',
        description: response.data.message,
        variant: 'default'
      });

      // Refresh data
      await fetchMaintenanceData();
      await fetchMaintenanceHistory();
      
      // Clear reason after successful update
      setFormData(prev => ({ ...prev, reason: '' }));
    } catch (error) {
      console.error('[SYSTEM MAINTENANCE] Error toggling maintenance:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update maintenance mode',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!formData.reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for updating maintenance settings',
        variant: 'destructive'
      });
      return;
    }

    setUpdating(true);
    try {
      const updateData = {
        isMaintenanceMode: formData.isMaintenanceMode,
        maintenanceMessage: formData.maintenanceMessage,
        estimatedCompletion: formData.estimatedCompletion || null,
        reason: formData.reason,
        allowedRoles: formData.allowedRoles
      };

      console.log('[SYSTEM MAINTENANCE] Updating settings:', updateData);
      
      const response = await api.put('/api/system/maintenance', updateData);
      
      toast({
        title: 'Success',
        description: 'Maintenance settings updated successfully',
        variant: 'default'
      });

      await fetchMaintenanceData();
      await fetchMaintenanceHistory();
      setFormData(prev => ({ ...prev, reason: '' }));
    } catch (error) {
      console.error('[SYSTEM MAINTENANCE] Error updating settings:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update settings',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear the maintenance history?')) {
      return;
    }

    try {
      await api.delete('/api/system/maintenance/history');
      toast({
        title: 'Success',
        description: 'Maintenance history cleared successfully',
        variant: 'default'
      });
      setHistory([]);
    } catch (error) {
      console.error('[SYSTEM MAINTENANCE] Error clearing history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear maintenance history',
        variant: 'destructive'
      });
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role) 
        ? prev.allowedRoles.filter(r => r !== role)
        : [...prev.allowedRoles, role]
    }));
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionBadge = (action) => {
    const variants = {
      enabled: { color: 'bg-red-100 text-red-800', label: 'Enabled' },
      disabled: { color: 'bg-green-100 text-green-800', label: 'Disabled' },
      updated: { color: 'bg-blue-100 text-blue-800', label: 'Updated' }
    };
    
    const variant = variants[action] || variants.updated;
    
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
        <span className="ml-2">Loading maintenance settings...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Maintenance</h1>
          <p className="text-muted-foreground">Manage system-wide maintenance mode</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {formData.isMaintenanceMode ? (
            <div className="flex items-center text-red-600 font-medium">
              <PowerOff className="h-5 w-5 mr-2" />
              Maintenance Active
            </div>
          ) : (
            <div className="flex items-center text-green-600 font-medium">
              <CheckCircle className="h-5 w-5 mr-2" />
              System Online
            </div>
          )}
        </div>
      </div>

      {/* Current Status Card */}
      <Card className={`border-l-4 ${formData.isMaintenanceMode ? 'border-l-red-500 bg-red-50/50' : 'border-l-green-500 bg-green-50/30'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Maintenance Mode</Label>
              <p className={`text-lg font-semibold ${formData.isMaintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                {formData.isMaintenanceMode ? 'ACTIVE' : 'DISABLED'}
              </p>
            </div>
            
            {maintenanceData?.estimatedCompletion && (
              <div>
                <Label className="text-sm font-medium text-foreground">Estimated Completion</Label>
                <p className="text-lg font-semibold text-foreground">
                  {formatTimestamp(maintenanceData.estimatedCompletion)}
                </p>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium text-foreground">Last Modified</Label>
              <p className="text-sm text-foreground">
                {maintenanceData?.lastModifiedBy?.name || 'Unknown'} - {formatTimestamp(maintenanceData?.updatedAt)}
              </p>
            </div>
          </div>
          
          {formData.isMaintenanceMode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 inline mr-2" />
              <span className="text-yellow-800 font-medium">
                Maintenance mode is currently active. Users cannot access the system.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Maintenance Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">
                {formData.isMaintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {formData.isMaintenanceMode ? 
                  'Turn off maintenance mode to allow users back into the system' :
                  'Turn on maintenance mode to prevent users from accessing the system'
                }
              </p>
            </div>
            <Button
              onClick={handleToggleMaintenance}
              disabled={updating}
              variant={formData.isMaintenanceMode ? "destructive" : "default"}
              className="min-w-[120px]"
            >
              {updating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : formData.isMaintenanceMode ? (
                <Power className="h-4 w-4 mr-2" />
              ) : (
                <PowerOff className="h-4 w-4 mr-2" />
              )}
              {formData.isMaintenanceMode ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {/* Maintenance Message */}
          <div className="space-y-2">
            <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
            <Textarea
              id="maintenanceMessage"
              placeholder="Enter the message users will see during maintenance..."
              value={formData.maintenanceMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Estimated Completion */}
          <div className="space-y-2">
            <Label htmlFor="estimatedCompletion">Estimated Completion Date (Optional)</Label>
            <DatePicker
              placeholder="Select completion date"
              value={formData.estimatedCompletion ? formData.estimatedCompletion.split('T')[0] : ''}
              onChange={(dateValue) => {
                if (dateValue) {
                  // Keep existing time or set to current time if none exists
                  const existingTime = formData.estimatedCompletion?.split('T')[1] || new Date().toTimeString().slice(0, 5);
                  setFormData(prev => ({ 
                    ...prev, 
                    estimatedCompletion: `${dateValue}T${existingTime}` 
                  }));
                } else {
                  setFormData(prev => ({ ...prev, estimatedCompletion: '' }));
                }
              }}
            />
            {formData.estimatedCompletion && (
              <div className="mt-2">
                <Label htmlFor="estimatedCompletionTime" className="text-sm">Time</Label>
                <TimePicker
                  placeholder="Select time"
                  value={formData.estimatedCompletion?.split('T')[1]?.slice(0, 5) || ''}
                  onChange={(timeValue) => {
                    if (timeValue) {
                      const date = formData.estimatedCompletion?.split('T')[0] || new Date().toISOString().split('T')[0];
                      setFormData(prev => ({ 
                        ...prev, 
                        estimatedCompletion: `${date}T${timeValue}` 
                      }));
                    }
                  }}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Allowed Roles */}
          <div className="space-y-2">
            <Label>Roles Allowed During Maintenance</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['admin', 'teacher', 'student', 'parent'].map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Switch
                    checked={formData.allowedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label className="capitalize">{role}s</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              SuperAdmins always have access during maintenance
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *(live messages)</Label>
            <Input
              id="reason"
              placeholder="e.g., Server updates, Database maintenance, Security patches..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpdateSettings}
              disabled={updating}
              variant="outline"
            >
              {updating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
              Update Settings
            </Button>
            
            <Button
              onClick={fetchMaintenanceData}
              variant="ghost"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Maintenance History
            </CardTitle>
            {history.length > 0 && (
              <Button
                onClick={handleClearHistory}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No maintenance history available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Previous State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {getActionBadge(entry.action)}
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.modifiedBy?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{entry.modifiedBy?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.reason || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${entry.previousState?.isMaintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                          {entry.previousState?.isMaintenanceMode ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMaintenance;
