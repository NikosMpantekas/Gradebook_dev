import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Settings, 
  Check, 
  X, 
  Save, 
  RefreshCw, 
  School, 
  Shield, 
  Users, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { API_URL } from '../../config/appConfig';

const SchoolPermissionsManager = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState(new Set());
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');

  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/schools`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
        
        // Initialize permissions state
        const initialPermissions = {};
        data.schools.forEach(school => {
          initialPermissions[school._id] = {
            features: school.features || {},
            permissions: school.permissions || {}
          };
        });
        setPermissions(initialPermissions);
      } else {
        throw new Error('Failed to fetch schools');
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      setError('Failed to fetch schools');
      toast.error('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  const toggleSchoolExpansion = (schoolId) => {
    const newExpanded = new Set(expandedSchools);
    if (newExpanded.has(schoolId)) {
      newExpanded.delete(schoolId);
    } else {
      newExpanded.add(schoolId);
    }
    setExpandedSchools(newExpanded);
  };

  const handleFeatureToggle = (schoolId, featureKey, enabled) => {
    setPermissions(prev => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        features: {
          ...prev[schoolId]?.features,
          [featureKey]: enabled
        }
      }
    }));
  };

  const handlePermissionToggle = (schoolId, permissionKey, enabled) => {
    setPermissions(prev => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        permissions: {
          ...prev[schoolId]?.permissions,
          [permissionKey]: enabled
        }
      }
    }));
  };

  const saveSchoolPermissions = async (schoolId) => {
    try {
      setSaving(true);
      const schoolPermissions = permissions[schoolId];
      
      const response = await fetch(`${API_URL}/api/schools/${schoolId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          features: schoolPermissions.features,
          permissions: schoolPermissions.permissions
        })
      });

      if (response.ok) {
        toast.success('School permissions updated successfully');
        
        // Update the schools state with new permissions
        setSchools(prev => prev.map(school => 
          school._id === schoolId 
            ? { 
                ...school, 
                features: schoolPermissions.features,
                permissions: schoolPermissions.permissions
              }
            : school
        ));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const saveAllPermissions = async () => {
    try {
      setSaving(true);
      const promises = Object.keys(permissions).map(schoolId => 
        saveSchoolPermissions(schoolId)
      );
      
      await Promise.all(promises);
      toast.success('All school permissions updated successfully');
    } catch (error) {
      console.error('Error saving all permissions:', error);
      toast.error('Failed to save all permissions');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all permissions to defaults? This action cannot be undone.')) {
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/schools/reset-permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('All permissions reset to defaults');
        fetchSchools(); // Refresh the data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset permissions');
      }
    } catch (error) {
      console.error('Error resetting permissions:', error);
      toast.error(error.message || 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const getFeatureIcon = (featureKey) => {
    const icons = {
      grades: '📊',
      notifications: '🔔',
      calendar: '📅',
      reports: '📈',
      analytics: '📊',
      messaging: '💬',
      attendance: '✅',
      assignments: '📝',
      exams: '📋',
      parentPortal: '👨‍👩‍👧‍👦'
    };
    return icons[featureKey] || '⚙️';
  };

  const getPermissionIcon = (permissionKey) => {
    const icons = {
      create: '➕',
      read: '👁️',
      update: '✏️',
      delete: '🗑️',
      manage: '⚙️',
      approve: '✅',
      export: '📤',
      import: '📥'
    };
    return icons[permissionKey] || '🔐';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading school permissions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">School Permissions Manager</h1>
        </div>
        <p className="text-muted-foreground">
          Manage feature access and permissions for all schools in the system
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Button onClick={saveAllPermissions} disabled={saving} className="sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
        <Button onClick={resetToDefaults} variant="outline" disabled={saving} className="sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
              </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {schools.map((school) => (
          <Card key={school._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <School className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{school.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {school.location} • {school.students?.length || 0} students
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={school.active ? "default" : "secondary"}>
                    {school.active ? "Active" : "Inactive"}
                  </Badge>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSchoolExpansion(school._id)}
                    >
                      {expandedSchools.has(school._id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>

            <Collapsible open={expandedSchools.has(school._id)}>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Features Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Settings className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Features</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(permissions[school._id]?.features || {}).map(([featureKey, enabled]) => (
                          <div key={featureKey} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getFeatureIcon(featureKey)}</span>
                              <Label className="text-sm font-medium capitalize">
                                {featureKey.replace(/([A-Z])/g, ' $1').trim()}
                              </Label>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) => handleFeatureToggle(school._id, featureKey, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Permissions Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Permissions</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(permissions[school._id]?.permissions || {}).map(([permissionKey, enabled]) => (
                          <div key={permissionKey} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getPermissionIcon(permissionKey)}</span>
                              <Label className="text-sm font-medium capitalize">
                                {permissionKey.replace(/([A-Z])/g, ' $1').trim()}
                              </Label>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) => handlePermissionToggle(school._id, permissionKey, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={() => saveSchoolPermissions(school._id)}
                        disabled={saving}
                        size="sm"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
            </Card>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="text-center py-12">
          <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Schools Found</h3>
          <p className="text-muted-foreground">
            There are no schools in the system to manage permissions for.
          </p>
        </div>
      )}
    </div>
  );
};

export default SchoolPermissionsManager;
