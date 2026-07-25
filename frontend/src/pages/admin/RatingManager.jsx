import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Play, Square, BarChart3, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter } from 'date-fns';

// Redux actions
import { 
  getRatingPeriods, 
  createRatingPeriod, 
  updateRatingPeriod, 
  deleteRatingPeriod,
  getRatingQuestions,
  createRatingQuestion,
  deleteRatingQuestion,
  reset as resetRatings
} from '../../features/ratings/ratingSlice';
import { getSchools } from '../../features/schools/schoolSlice';
import { getDirections } from '../../features/directions/directionSlice';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';
import RatingStatsViewer from '../../components/ratings/RatingStatsViewer';

const RatingManager = () => {
  const dispatch = useDispatch();
  const { periods, questions, isLoading, isError, message } = useSelector(state => state.ratings);
  const { schools } = useSelector(state => state.schools);
  const { directions } = useSelector(state => state.directions);

  const [activeTab, setActiveTab] = useState('periods');
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsTarget, setStatsTarget] = useState(null);

  const [periodForm, setPeriodForm] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    targetType: 'both',
    isActive: false,
    schools: [],
    directions: []
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    questionType: 'rating',
    targetType: 'both',
    order: 0,
    ratingPeriod: ''
  });

  useEffect(() => {
    dispatch(getRatingPeriods());
    dispatch(getSchools());
    dispatch(getDirections());

    return () => {
      dispatch(resetRatings());
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedPeriod) {
      dispatch(getRatingQuestions(selectedPeriod._id));
    }
  }, [selectedPeriod, dispatch]);

  const resetPeriodForm = () => {
    const today = new Date();
    const nextWeek = new Date();
    try {
      nextWeek.setDate(today.getDate() + 7);
    } catch (error) {
      nextWeek.setDate(today.getDate() + 1);
    }

    setPeriodForm({
      title: '',
      description: '',
      startDate: today,
      endDate: nextWeek,
      targetType: 'both',
      isActive: false,
      schools: [],
      directions: []
    });
  };

  const handleOpenPeriodDialog = (period = null) => {
    if (period) {
      setPeriodForm({
        id: period._id,
        title: period.title,
        description: period.description || '',
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
        targetType: period.targetType || 'both',
        isActive: period.isActive || false,
        schools: period.schools?.map(s => typeof s === 'object' ? s._id : s) || [],
        directions: period.directions?.map(d => typeof d === 'object' ? d._id : d) || []
      });
    } else {
      resetPeriodForm();
    }
    setPeriodDialogOpen(true);
  };

  const handleOpenQuestionDialog = (question = null) => {
    if (!selectedPeriod) {
      toast.error('Please select a rating period first');
      return;
    }

    if (question) {
      setQuestionForm({
        text: question.text,
        questionType: question.questionType,
        targetType: question.targetType,
        order: question.order || 0,
        ratingPeriod: question.ratingPeriod
      });
    } else {
      setQuestionForm({
        text: '',
        questionType: 'rating',
        targetType: 'both',
        order: questions ? questions.length : 0,
        ratingPeriod: selectedPeriod._id
      });
    }
    setQuestionDialogOpen(true);
  };

  const handlePeriodFormChange = (e) => {
    const { name, value } = e.target;
    setPeriodForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionFormChange = (e) => {
    const { name, value } = e.target;
    setQuestionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePeriodSubmit = () => {
    if (!periodForm.title) {
      toast.error('Please enter a title');
      return;
    }

    if (isAfter(periodForm.startDate, periodForm.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    if (selectedPeriod && periodForm.id) {
      dispatch(updateRatingPeriod({
        id: selectedPeriod._id,
        periodData: periodForm
      }));
    } else {
      dispatch(createRatingPeriod(periodForm));
    }

    setPeriodDialogOpen(false);
  };

  const handleQuestionSubmit = () => {
    if (!questionForm.text) {
      toast.error('Please enter question text');
      return;
    }

    if (selectedPeriod) {
      dispatch(createRatingQuestion(questionForm))
        .then(() => {
          dispatch(getRatingQuestions(selectedPeriod._id));
        })
        .catch(err => {
          console.error('Error creating question:', err);
        });
    }

    setQuestionDialogOpen(false);
  };

  const handleSelectPeriod = (period) => {
    setSelectedPeriod(period);
  };

  const handleDeletePeriod = (id) => {
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePeriod = () => {
    dispatch(deleteRatingPeriod(deleteItemId));
    setDeleteDialogOpen(false);
    setDeleteItemId(null);
    if (selectedPeriod && selectedPeriod._id === deleteItemId) {
      setSelectedPeriod(null);
    }
  };

  const handleDeleteQuestion = (id) => {
    setDeleteItemId(id);
    setDeleteQuestionDialogOpen(true);
  };

  const confirmDeleteQuestion = () => {
    dispatch(deleteRatingQuestion(deleteItemId));
    setDeleteQuestionDialogOpen(false);
    setDeleteItemId(null);
  };

  const handleTogglePeriodActive = (period) => {
    dispatch(updateRatingPeriod({
      id: period._id,
      periodData: { isActive: !period.isActive }
    }));
  };

  const renderPeriodList = () => {
    if (!periods || periods.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <p>No rating periods found</p>
          <Button onClick={() => handleOpenPeriodDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Rating Period
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {periods.map(period => {
          const isSelected = selectedPeriod && selectedPeriod._id === period._id;

          return (
            <div
              key={period._id}
              onClick={() => handleSelectPeriod(period)}
              className={`p-4 rounded-lg border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-base">{period.title}</h4>
                  <Badge variant={period.isActive ? "default" : "secondary"}>
                    {period.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    {format(new Date(period.startDate), 'MMM d, yyyy')} - {format(new Date(period.endDate), 'MMM d, yyyy')}
                  </p>
                  <p>
                    Target: {period.targetType === 'both' 
                      ? 'Teachers & Subjects' 
                      : period.targetType === 'teacher' ? 'Teachers Only' : 'Subjects Only'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTogglePeriodActive(period)}
                  title={period.isActive ? 'Deactivate' : 'Activate'}
                  className={period.isActive ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-600"}
                >
                  {period.isActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenPeriodDialog(period)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePeriod(period._id)}
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderQuestionList = () => {
    if (!selectedPeriod) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Please select a rating period to manage questions
        </div>
      );
    }

    const periodQuestions = questions ? questions.filter(q => q.ratingPeriod === selectedPeriod._id) : [];

    if (!periodQuestions || periodQuestions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <p>No questions found for this rating period</p>
          <Button onClick={() => handleOpenQuestionDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Question
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {periodQuestions.map((question, index) => (
          <div
            key={question._id}
            className="p-4 rounded-lg border flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground font-semibold text-xs shrink-0">
                {index + 1}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{question.text}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={question.questionType === 'rating' ? "default" : "secondary"}>
                    {question.questionType === 'rating' ? 'Rating (1-10)' : 'Text Answer'}
                  </Badge>
                  {question.targetType !== 'both' && (
                    <Badge variant="outline">
                      {question.targetType === 'teacher' ? 'Teachers Only' : 'Subjects Only'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteQuestion(question._id)}
              className="text-destructive hover:text-destructive shrink-0"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={() => handleOpenQuestionDialog()}
          className="w-full border-dashed py-6"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return <ErrorState message={message} />;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">
          Teacher & Subject Rating System
        </h1>
        <p className="text-muted-foreground">
          Create and manage rating periods and questions for students to rate teachers and subjects.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
              <TabsTrigger value="periods">Rating Periods</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
            </TabsList>

            <TabsContent value="periods" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => handleOpenPeriodDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rating Period
                </Button>
              </div>
              {renderPeriodList()}
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {selectedPeriod ? `Questions for: ${selectedPeriod.title}` : 'Select a rating period'}
                </h3>
                {selectedPeriod && (
                  <Button onClick={() => handleOpenQuestionDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                )}
              </div>
              {renderQuestionList()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rating Period Dialog */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPeriod && periodForm.id ? 'Edit Rating Period' : 'Create Rating Period'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-title">Title *</Label>
              <Input
                id="period-title"
                name="title"
                value={periodForm.title}
                onChange={handlePeriodFormChange}
                placeholder="e.g. End of Semester Evaluation 2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-desc">Description</Label>
              <Textarea
                id="period-desc"
                name="description"
                value={periodForm.description}
                onChange={handlePeriodFormChange}
                rows={3}
                placeholder="Optional details..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={periodForm.startDate ? format(periodForm.startDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setPeriodForm(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={periodForm.endDate ? format(periodForm.endDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setPeriodForm(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target Type</Label>
              <Select
                value={periodForm.targetType}
                onValueChange={(val) => setPeriodForm(prev => ({ ...prev, targetType: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Teachers & Subjects</SelectItem>
                  <SelectItem value="teacher">Teachers Only</SelectItem>
                  <SelectItem value="subject">Subjects Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="is-active" className="cursor-pointer">
                Active (available for students to submit ratings)
              </Label>
              <Switch
                id="is-active"
                checked={periodForm.isActive}
                onCheckedChange={(checked) => setPeriodForm(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePeriodSubmit}>
              {selectedPeriod && periodForm.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Rating Question</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="question-text">Question Text *</Label>
              <Input
                id="question-text"
                name="text"
                value={questionForm.text}
                onChange={handleQuestionFormChange}
                placeholder="e.g. How effective is the teaching methodology?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Question Type</Label>
                <Select
                  value={questionForm.questionType}
                  onValueChange={(val) => setQuestionForm(prev => ({ ...prev, questionType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating (1-10)</SelectItem>
                    <SelectItem value="text">Text Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Type</Label>
                <Select
                  value={questionForm.targetType}
                  onValueChange={(val) => setQuestionForm(prev => ({ ...prev, targetType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Teachers & Subjects</SelectItem>
                    <SelectItem value="teacher">Teachers Only</SelectItem>
                    <SelectItem value="subject">Subjects Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="question-order">Display Order</Label>
              <Input
                id="question-order"
                name="order"
                type="number"
                value={questionForm.order}
                onChange={handleQuestionFormChange}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuestionSubmit}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Rating Period"
        content="Are you sure you want to delete this rating period? This will also delete all related questions and student ratings. This action cannot be undone."
        onConfirm={confirmDeletePeriod}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteQuestionDialogOpen}
        title="Delete Question"
        content="Are you sure you want to delete this question? This will also delete all student responses to this question. This action cannot be undone."
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setDeleteQuestionDialogOpen(false)}
      />
    </div>
  );
};

export default RatingManager;
