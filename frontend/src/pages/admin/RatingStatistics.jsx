import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RatingStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [statistics, setStatistics] = useState(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const userFromRedux = auth?.user;

  const getAuthToken = useCallback(() => {
    if (userFromRedux?.token) {
      return userFromRedux.token;
    }
    
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const parsedUser = JSON.parse(userString);
        if (parsedUser?.token) {
          return parsedUser.token;
        }
      }
    } catch (err) {
      console.error('Error accessing localStorage:', err);
    }
    
    return null;
  }, [userFromRedux]);

  const createAxiosInstance = useCallback(() => {
    const token = getAuthToken();
    if (!token) return null;
    
    const instance = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000,
    });
    
    instance.interceptors.response.use(
      response => response,
      error => {
        console.error('Axios request failed:', error.message);
        return Promise.reject(error);
      }
    );
    
    return instance;
  }, [getAuthToken]);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const api = createAxiosInstance();
    if (!api) {
      setError('Authentication required. Please log in to continue.');
      setLoading(false);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }
    
    try {
      const response = await api.get('/api/ratings/periods');
      if (response.data && Array.isArray(response.data)) {
        setPeriods(response.data);
      } else {
        setPeriods([]);
      }
    } catch (err) {
      console.error('Error fetching rating periods:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(`Error: ${err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, createAxiosInstance]);

  const fetchStatistics = useCallback(async (periodId) => {
    if (!periodId) return;
    
    setLoading(true);
    setError(null);
    
    const api = createAxiosInstance();
    if (!api) {
      setError('Authentication required. Please log in to continue.');
      setLoading(false);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }
    
    try {
      const response = await api.get(`/api/ratings/stats?periodId=${periodId}`);
      if (response.data) {
        setStatistics(response.data);
      } else {
        setStatistics(null);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(`Error: ${err.message || 'Failed to load statistics'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, createAxiosInstance]);

  const handleRatingPeriodUpdate = useCallback(async (periodId, updateData) => {
    if (!periodId || !updateData) return false;
    
    setLoading(true);
    setError(null);
    
    const api = createAxiosInstance();
    if (!api) {
      setError('Authentication required. Please log in to continue.');
      setLoading(false);
      return false;
    }
    
    try {
      await api.put(`/api/ratings/periods/${periodId}`, updateData);
      return true;
    } catch (err) {
      console.error('Error updating rating period:', err);
      setError(`Failed to update rating period: ${err.response?.data?.message || err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [createAxiosInstance]);

  const handlePeriodChange = (value) => {
    const newPeriod = value === 'SELECT_PERIOD' ? '' : value;
    setSelectedPeriod(newPeriod);
    
    if (newPeriod) {
      fetchStatistics(newPeriod);
    } else {
      setStatistics(null);
    }
  };

  const handleOpenEditDialog = (periodId) => {
    const periodToEdit = periods.find(p => p._id === periodId);
    if (!periodToEdit) return;
    
    setEditingPeriod(periodToEdit);
    
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setEditFormData({
      title: periodToEdit.title || '',
      description: periodToEdit.description || '',
      startDate: periodToEdit.startDate ? formatDate(periodToEdit.startDate) : '',
      endDate: periodToEdit.endDate ? formatDate(periodToEdit.endDate) : ''
    });
    
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingPeriod(null);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitEdit = async () => {
    if (!editingPeriod) return;
    
    if (!editFormData.title) {
      toast.error('Title is required');
      return;
    }
    
    const success = await handleRatingPeriodUpdate(editingPeriod._id, editFormData);
    
    if (success) {
      toast.success('Rating period updated successfully!');
      handleCloseEditDialog();
      fetchPeriods();
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  if (loading && !error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Rating Statistics
        </h1>
        <p className="text-muted-foreground">
          View and analyze student feedback and ratings across teachers and subjects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Rating Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Spinner className="h-6 w-6" />
            </div>
          ) : periods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period._id}>
                    <TableCell className="font-medium">{period.title}</TableCell>
                    <TableCell className="text-muted-foreground">{period.description || 'N/A'}</TableCell>
                    <TableCell>
                      {period.startDate ? new Date(period.startDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {period.endDate ? new Date(period.endDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenEditDialog(period._id)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 rounded-md bg-muted text-muted-foreground text-sm">
              No rating periods found
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">View Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md">
            <Label htmlFor="period-select" className="mb-2 block">Rating Period</Label>
            <Select
              value={selectedPeriod || 'SELECT_PERIOD'}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger id="period-select">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELECT_PERIOD">
                  <span className="italic">Select a period</span>
                </SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period._id} value={period._id}>
                    {period.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedPeriod && (
            <div className="p-4 rounded-md bg-muted text-muted-foreground text-sm font-medium">
              Please select a rating period to view statistics
            </div>
          )}

          {selectedPeriod && !loading && (
            <div className="space-y-4">
              {statistics ? (
                <>
                  <h4 className="font-semibold text-base">Statistics for Selected Period</h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Average Rating</TableHead>
                          <TableHead>Responses</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(statistics.questions) ? (
                          statistics.questions.map((question, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{question.text}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {question.type || 'Rating'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {question.type === 'text' ? (
                                  'N/A'
                                ) : (
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span>{question.averageRating?.toFixed(1) || 'N/A'}</span>
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{question.responseCount || 0}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                              No questions data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-md bg-amber-500/15 text-amber-600 text-sm font-medium">
                  No statistics available for the selected period
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rating Period</DialogTitle>
            <DialogDescription>
              Update the details for this rating period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                name="title"
                value={editFormData.title}
                onChange={handleFormChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={editFormData.description}
                onChange={handleFormChange}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  name="startDate"
                  type="date"
                  value={editFormData.startDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  name="endDate"
                  type="date"
                  value={editFormData.endDate}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatingStatistics;
