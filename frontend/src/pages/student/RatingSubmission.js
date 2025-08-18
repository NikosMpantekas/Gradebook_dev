import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  User,
  Building,
  CheckCircle,
  Clock,
  Star,
  ChevronRight,
  ChevronLeft,
  Send
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isAfter, parseISO } from 'date-fns';

// Redux actions
import { 
  getActiveRatingPeriods,
  getRatingPeriod,
  getStudentRatingQuestions,
  getRatingTargets,
  submitRating,
  reset as resetRatings
} from '../../features/ratings/ratingSlice';

// Components
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

const RatingSubmission = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { 
    activePeriods, 
    currentPeriod,
    questions,
    targets,
    isLoading, 
    isSuccess,
    isError, 
    message 
  } = useSelector(state => state.ratings);

  // Local state
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch active rating periods when component mounts
  useEffect(() => {
    dispatch(getActiveRatingPeriods());

    return () => {
      dispatch(resetRatings());
    };
  }, [dispatch]);

  // Load period details when a period is selected
  useEffect(() => {
    if (selectedPeriod) {
      dispatch(getRatingPeriod(selectedPeriod._id));
      dispatch(getStudentRatingQuestions(selectedPeriod._id));
      dispatch(getRatingTargets(selectedPeriod._id));
    }
  }, [selectedPeriod, dispatch]);

  // Initialize answers when questions change
  useEffect(() => {
    if (questions.length > 0 && selectedTarget) {
      // Filter questions based on target type
      const applicableQuestions = questions.filter(q => 
        q.targetType === 'both' || q.targetType === selectedTarget.type
      );

      const initialAnswers = applicableQuestions.map(q => ({
        questionId: q._id,
        questionText: q.text,
        questionType: q.type,
        targetId: selectedTarget._id,
        targetType: selectedTarget.type,
        answer: q.type === 'rating' ? 0 : '',
        required: q.required
      }));

      setAnswers(initialAnswers);
    }
  }, [questions, selectedTarget]);

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => 
      prev.map(answer => 
        answer.questionId === questionId 
          ? { ...answer, answer: value }
          : answer
      )
    );
  };

  // Handle period selection
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    setSelectedTarget(null);
    setActiveStep(0);
    setAnswers([]);
  };

  // Handle target selection
  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
    setActiveStep(1);
  };

  // Handle step navigation
  const handleNext = () => {
    if (activeStep === 0 && selectedPeriod) {
      setActiveStep(1);
    } else if (activeStep === 1 && selectedTarget) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setActiveStep(0);
    } else if (activeStep === 2) {
      setActiveStep(1);
    }
  };

  // Handle rating submission
  const handleSubmit = async () => {
    // Validate required answers
    const requiredAnswers = answers.filter(a => a.required);
    const missingAnswers = requiredAnswers.filter(a => 
      a.questionType === 'rating' ? a.answer === 0 : !a.answer.trim()
    );

    if (missingAnswers.length > 0) {
      toast.error('Please answer all required questions');
      return;
    }

    setSubmitting(true);

    try {
      const ratingData = {
        periodId: selectedPeriod._id,
        targetId: selectedTarget._id,
        targetType: selectedTarget.type,
        answers: answers.filter(a => a.answer !== 0 && a.answer.trim() !== '')
      };

      await dispatch(submitRating(ratingData)).unwrap();
      
      setSubmitted(true);
      toast.success('Rating submitted successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if period is active
  const isPeriodActive = (period) => {
    const now = new Date();
    const startDate = parseISO(period.startDate);
    const endDate = parseISO(period.endDate);
    return isAfter(startDate, now) && isAfter(endDate, now);
  };

  // Render loading state
  if (isLoading) {
    return <LoadingScreen message="Loading rating periods..." />;
  }

  // Render error state
  if (isError) {
    return (
      <ErrorState 
        message={message || "Failed to load rating periods"}
        onRetry={() => dispatch(getActiveRatingPeriods())}
      />
    );
  }

  // Render empty state
  if (!activePeriods || activePeriods.length === 0) {
    return (
      <EmptyState 
        title="No Active Rating Periods"
        description="There are currently no active rating periods. Please check back later."
      />
    );
  }

  // Render success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Rating Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Thank you for your feedback. Your rating has been submitted successfully.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setSelectedPeriod(null);
                setSelectedTarget(null);
                setActiveStep(0);
                setAnswers([]);
              }}
              className="w-full"
            >
              Submit Another Rating
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Student Rating Submission
          </h1>
          <p className="text-muted-foreground">
            Rate your teachers and subjects for the current period
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center space-x-2 ${activeStep >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              activeStep >= 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              1
            </div>
            <span>Select Period</span>
          </div>
          
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          
          <div className={`flex items-center space-x-2 ${activeStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              activeStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
            <span>Select Target</span>
          </div>
          
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          
          <div className={`flex items-center space-x-2 ${activeStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              activeStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              3
            </div>
            <span>Submit Rating</span>
          </div>
        </div>

        {/* Step 1: Period Selection */}
        {activeStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Select Rating Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activePeriods.map((period) => (
                <Card 
                  key={period._id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedPeriod?._id === period._id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handlePeriodSelect(period)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{period.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(parseISO(period.startDate), 'MMM dd, yyyy')} - {format(parseISO(period.endDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <Badge variant={isPeriodActive(period) ? "default" : "secondary"}>
                      {isPeriodActive(period) ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedPeriod && (
              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Target Selection */}
        {activeStep === 1 && selectedPeriod && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Select Target to Rate</h2>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targets?.map((target) => (
                <Card 
                  key={target._id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTarget?._id === target._id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleTargetSelect(target)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {target.type === 'teacher' ? <User className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{target.name}</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">{target.type}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
            
            {selectedTarget && (
              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Rating Questions */}
        {activeStep === 2 && selectedPeriod && selectedTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Rate {selectedTarget.name}
              </h2>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <Card key={answer.questionId}>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        {answer.questionText}
                        {answer.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                    </div>
                    
                    {answer.questionType === 'rating' ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              variant={answer.answer === rating ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAnswerChange(answer.questionId, rating)}
                              className="w-12 h-12 p-0"
                            >
                              <Star className={`h-5 w-5 ${answer.answer === rating ? 'text-yellow-400' : ''}`} />
                            </Button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Poor</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Enter your answer..."
                        value={answer.answer}
                        onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                        rows={3}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="min-w-[120px]"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Rating
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingSubmission;
