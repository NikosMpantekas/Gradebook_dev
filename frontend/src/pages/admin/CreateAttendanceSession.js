import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  ArrowLeft as BackIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Save as SaveIcon
} from 'lucide-react';

const CreateAttendanceSession = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    description: '',
    duration: 60 // minutes
  });
  const [error, setError] = useState(null);

  // Logging function
  const logAction = (action, data = {}) => {
    console.log(`[CreateAttendanceSession] ${action}:`, {
      userId: user?._id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      logAction('Fetching classes for session creation');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Classes API response for CreateSession:', response.data);
      
      // Check if response is HTML (API connectivity issue)
      if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
        throw new Error('Backend API not accessible - receiving HTML instead of JSON');
      }
      
      const classesData = Array.isArray(response.data) ? response.data : [];
      setClasses(classesData);
      logAction('Classes fetched successfully', { count: classesData.length });
      
      if (classesData.length === 0) {
        console.warn('No classes found for session creation');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      logAction('Error fetching classes', { error: error.message });
      setError(error.message);
      setClasses([]);
      toast.error(t('attendance.failedToLoadClasses'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    logAction('Form field updated', { field, value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validation
      if (!formData.title || !formData.classId || !formData.date || !formData.time) {
        toast.error(t('attendance.fillRequiredFields'));
        return;
      }

      const sessionData = {
        title: formData.title,
        classId: formData.classId,
        date: formData.date,
        time: formData.time,
        description: formData.description,
        duration: parseInt(formData.duration),
        status: 'scheduled'
      };

      logAction('Creating attendance session', sessionData);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/sessions/classes/${formData.classId}/sessions/generate`, sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(t('attendance.sessionCreated'));
      logAction('Session created successfully', { sessionId: response.data._id });
      
      // Navigate back to attendance management
      navigate('/app/admin/attendance');
    } catch (error) {
      console.error('Error creating session:', error);
      logAction('Error creating session', { error: error.message });
      toast.error(t('attendance.failedToCreateSession'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/app/admin/attendance');
  };

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Create Session</h2>
            <p className="text-red-600">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => {
                  setError(null);
                  fetchClasses();
                }} 
              >
                Retry
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Back to Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <BackIcon className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('attendance.createSession')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('attendance.createSessionDescription')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {t('attendance.sessionDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">{t('attendance.sessionTitle')} *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={t('attendance.sessionTitlePlaceholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="class">{t('common.class')} *</Label>
                <Select value={formData.classId} onValueChange={(value) => handleInputChange('classId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('attendance.selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">{t('common.date')} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="time">{t('common.time')} *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">{t('attendance.duration')} ({t('common.minutes')})</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="300"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('attendance.sessionDescriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    {t('common.creating')}
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {t('attendance.createSession')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAttendanceSession;
