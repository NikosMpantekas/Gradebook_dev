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
import { Spinner } from '../ui/spinner';
import { API_URL } from '../../config/appConfig';

const SchoolPermissionsManager = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState(new Set());
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState('');

  const { user } = useSelector((state) => state.auth);
  const token = user?.token;

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/school-permissions/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 [SchoolPermissions] API Response:', data);
        
        // Handle the nested structure from backend
        const schoolsArray = data?.data?.schools || data?.schools || [];
        console.log('✅ [SchoolPermissions] Extracted schools array:', schoolsArray);
        
        // Ensure we have an array
        if (!Array.isArray(schoolsArray)) {
          console.error('❌ [SchoolPermissions] Schools data is not an array:', schoolsArray);
          setSchools([]);
          return;
        }
        
        setSchools(schoolsArray);
        
        // Initialize permissions state
        const initialPermissions = {};
        schoolsArray.forEach(schoolData => {
          const school = schoolData.school || schoolData;
          initialPermissions[school._id] = {
            features: schoolData.permissions?.features || school.features || {},
            permissions: schoolData.permissions?.permissions || school.permissions || {}
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
      
      const response = await fetch(`${API_URL}/api/school-permissions/${schoolId}`, {
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
        <Spinner className="text-primary" />
        <p className="text-muted-foreground">Loading school permissions...</p>
      </div>
    );
  }

  const featureCategories = {
    'Core Management': ['enableUserManagement', 'enableClasses'],
    'Grade Management': ['enableGrades', 'enableAnalytics', 'enableRatings'],
    'Notification Management': ['enableNotifications'],
    'School Administration': ['enableSchedule', 'enableSchoolSettings'],
    'Communication': ['enableContact']
  };

  const getFeatureName = (featureKey) => {
    const names = {
      enableUserManagement: 'User Management',
      enableClasses: 'Class Management',
      enableGrades: 'Grade Management',
      enableAnalytics: 'Analytics & Reports',
      enableRatings: 'Rating System (/app/ratings)',
      enableNotifications: 'Notifications',
      enableSchedule: 'Schedule Management',
      enableSchoolSettings: 'School Settings',
      enableContact: 'Contact System'
    };
    return names[featureKey] || featureKey;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Feature Usage Statistics</h1>
      </div>

      {Array.isArray(schools) && schools.map((schoolData) => {
        const school = schoolData.school || schoolData;
        const schoolPermissions = permissions[school._id]?.features || {};
        
        return (
          <Card key={school._id} className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">{school.name}</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {school.emailDomain} • 
                    <Badge variant={school.active ? "default" : "secondary"} className="ml-2">
                      {school.active ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                <Button
                  onClick={() => saveSchoolPermissions(school._id)}
                  disabled={saving}
                  className="ml-4"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {Object.entries(featureCategories).map(([categoryName, features]) => (
                <div key={categoryName} className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary border-b pb-2">
                    {categoryName}
                  </h3>
                  <div className="grid gap-3">
                    {features.map((featureKey) => (
                      <div key={featureKey} className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <Label className="font-medium cursor-pointer" htmlFor={`${school._id}-${featureKey}`}>
                            {getFeatureName(featureKey)}
                          </Label>
                        </div>
                        <Switch
                          id={`${school._id}-${featureKey}`}
                          checked={schoolPermissions[featureKey] || false}
                          onCheckedChange={(checked) => handleFeatureToggle(school._id, featureKey, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
        </div>
      )}

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
