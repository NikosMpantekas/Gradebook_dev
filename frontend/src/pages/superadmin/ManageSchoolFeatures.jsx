import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { GraduationCap, Calendar, Star, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const ManageSchoolFeatures = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      navigate('/app/dashboard');
      return;
    }

    fetchSchools();
  }, [user, navigate]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError('');

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const schoolsResponse = await axios.get(`${API_URL}/api/schools`, config);
      
      const schoolsWithFeatures = await Promise.all(
        schoolsResponse.data.map(async (school) => {
          try {
            const permissionsResponse = await axios.get(
              `${API_URL}/api/schools/${school._id}/permissions`,
              config
            );
            
            return {
              ...school,
              features: permissionsResponse.data?.features || {
                enableCalendar: false,
                enableRatingSystem: false,
                enablePayments: false
              }
            };
          } catch (err) {
            console.error(`Error fetching features for school ${school._id}:`, err);
            return {
              ...school,
              features: {
                enableCalendar: false,
                enableRatingSystem: false,
                enablePayments: false
              }
            };
          }
        })
      );

      setSchools(schoolsWithFeatures);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setError('Failed to load schools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = (schoolId, feature, checked) => {
    setSchools(schools.map(school => {
      if (school._id === schoolId) {
        return {
          ...school,
          features: {
            ...school.features,
            [feature]: checked
          }
        };
      }
      return school;
    }));
  };

  const saveFeatures = async (schoolId) => {
    try {
      setSaving(true);
      const school = schools.find(s => s._id === schoolId);
      
      if (!school) {
        throw new Error('School not found');
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      };

      await axios.put(
        `${API_URL}/api/schools/${schoolId}/permissions`,
        { features: school.features },
        config
      );

      toast.success(`Features updated for ${school.name}`);
    } catch (err) {
      console.error('Error saving features:', err);
      toast.error('Failed to save feature settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
          {error}
        </div>
        <Button variant="outline" onClick={fetchSchools}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manage School Features</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle features on or off for each school. Changes apply immediately for all users of that school.
        </p>
      </div>

      {schools.length === 0 ? (
        <div className="p-6 rounded-md bg-muted text-muted-foreground text-sm font-medium">
          No schools found. Create a school first to manage its features.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Card key={school._id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="truncate">{school.name}</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Feature Toggles
                  </h4>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor={`cal-${school._id}`} className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Calendar
                    </Label>
                    <Switch
                      id={`cal-${school._id}`}
                      checked={school.features?.enableCalendar === true}
                      onCheckedChange={(checked) => handleToggleFeature(school._id, 'enableCalendar', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor={`rating-${school._id}`} className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      Rating System
                    </Label>
                    <Switch
                      id={`rating-${school._id}`}
                      checked={school.features?.enableRatingSystem === true}
                      onCheckedChange={(checked) => handleToggleFeature(school._id, 'enableRatingSystem', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor={`pay-${school._id}`} className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Payment Management
                    </Label>
                    <Switch
                      id={`pay-${school._id}`}
                      checked={school.features?.enablePayments === true}
                      onCheckedChange={(checked) => handleToggleFeature(school._id, 'enablePayments', checked)}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="justify-end pt-0">
                <Button
                  size="sm"
                  onClick={() => saveFeatures(school._id)}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageSchoolFeatures;
