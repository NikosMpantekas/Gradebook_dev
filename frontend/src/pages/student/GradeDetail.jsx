import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  Calendar,
  User,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { getGrade, reset } from '../../features/grades/gradeSlice';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import LoadingState from '../../components/common/LoadingState';
import { Skeleton } from '../../components/ui/skeleton';

const GradeDetailSkeleton = () => (
  <div className="flex-1 space-y-6">
    <Skeleton className="h-10 w-32 mb-6" />

    <div className="grid gap-6 md:grid-cols-3">
      {/* Grade Summary Card Skeleton - Fixed stable placeholders */}
      <div className="md:col-span-1">
        <Card className="h-full">
          <CardContent className="flex flex-col items-center p-8">
            <div className="h-8 w-40 bg-muted rounded-md mb-6 mx-auto" />
            <div className="relative mb-6">
              <div className="h-40 w-40 rounded-full bg-muted/30 border-8 border-muted/50" />
            </div>
            <div className="h-10 w-32 bg-muted/40 rounded-md mb-3" />
            <div className="h-4 w-48 bg-muted/20 rounded-md mx-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Grade Details Card Skeleton */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle><div className="h-7 w-32 bg-muted rounded-md" /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-muted/40 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-muted/30 rounded-md" />
                    <div className="h-5 w-full max-w-[150px] bg-muted/20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="h-6 w-24 bg-muted rounded-md" />
              <div className="bg-muted/10 p-4 rounded-lg">
                <div className="h-20 w-full bg-muted/20 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const GradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { grade: singleGrade, grades, isLoading, isError, message } = useSelector((state) => state.grades);
  const { user } = useSelector((state) => state.auth);

  // Instant load: check if the grade is already in the grades list
  const grade = singleGrade || (grades && id ? grades.find(g => g._id === id) : null);

  useEffect(() => {
    if (id) {
      dispatch(getGrade(id));
    }

    return () => {
      dispatch(reset());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message);
      navigate('/app/grades');
    }
  }, [isError, message, navigate]);

  const handleBack = () => {
    navigate('/app/grades');
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'PPP');
  };

  // Get grade status and color
  const getGradeStatus = () => {
    if (!grade) return { status: 'Unknown', color: 'grey' };

    if (grade.value >= 90) return { status: 'Excellent', color: '#388e3c' };
    if (grade.value >= 80) return { status: 'Very Good', color: '#2e7d32' };
    if (grade.value >= 70) return { status: 'Good', color: '#43a047' };
    if (grade.value >= 60) return { status: 'Satisfactory', color: '#ffb74d' };
    if (grade.value >= 50) return { status: 'Pass', color: '#ff9800' };
    return { status: 'Fail', color: '#e53935' };
  };

  // Only show skeleton if we don't have the grade yet (neither cached nor just loaded)
  if (!grade && isLoading) {
    return <GradeDetailSkeleton />;
  }

  // If we still don't have the grade and it's not loading, something might be wrong
  // but we'll show the skeleton briefly while the effect dispatches
  if (!grade) {
    return <GradeDetailSkeleton />;
  }

  const gradeStatus = getGradeStatus();

  return (
    <div className="flex-1 space-y-6">
      <Button
        variant="outline"
        onClick={handleBack}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Grades
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Grade Summary Card */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="flex flex-col items-center p-8">
              <CardTitle className="mb-6 text-center">
                {grade.subject?.name || 'Subject'}
              </CardTitle>
              
              {/* Circular Progress */}
              <div className="relative mb-6">
                <div 
                  className="w-40 h-40 rounded-full flex items-center justify-center relative"
                  style={{
                    background: `conic-gradient(${gradeStatus.color} ${grade.value * 3.6}deg, hsl(var(--muted)) 0deg)`
                  }}
                >
                  <div className="absolute inset-2 flex flex-col items-center justify-center bg-background rounded-full border">
                    <span className="text-4xl font-bold">{grade.value}</span>
                    <span className="text-xs text-muted-foreground">out of 100</span>
                  </div>
                </div>
              </div>
              
              <Badge 
                variant="secondary"
                className="mb-3 text-lg px-4 py-2"
                style={{ backgroundColor: `${gradeStatus.color}15`, color: gradeStatus.color }}
              >
                {gradeStatus.status}
              </Badge>
              
              <p className="text-sm text-muted-foreground text-center">
                Submitted on {formatDate(grade.date)}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Grade Details Card */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Grade Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subject</p>
                    <p className="text-base">{grade.subject?.name || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teacher</p>
                    <p className="text-base">{grade.teacher?.name || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date Assigned</p>
                    <p className="text-base">{formatDate(grade.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 md:col-span-2">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-base">{grade.description || 'No description provided'}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Feedback</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-base leading-relaxed">
                    {grade.description ? (
                      grade.description
                    ) : (
                      'No feedback provided for this grade.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GradeDetail;
