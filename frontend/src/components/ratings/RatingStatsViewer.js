import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Star, TrendingUp, Users, BarChart3, Loader2 } from 'lucide-react';
import { getRatingStats, getRatingPeriods } from '../../features/ratings/ratingSlice';
import { getSubjects } from '../../features/subjects/subjectSlice';
import { getUsers } from '../../features/users/userSlice';
import ErrorState from '../common/ErrorState';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#8DD1E1', '#A4DE6C'];

const RatingStatsViewer = ({ targetType, targetId, periodId }) => {
  const dispatch = useDispatch();
  const { stats, periods, isLoading } = useSelector((state) => state.ratings);
  const { subjects } = useSelector((state) => state.subjects);
  const { users } = useSelector((state) => state.users);
  
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodId || 'all');
  const [currentTab, setCurrentTab] = useState('overview');

  // Fetch data
  useEffect(() => {
    dispatch(getRatingPeriods());
    
    if (targetType === 'subject') {
      dispatch(getSubjects());
    } else if (targetType === 'teacher') {
      dispatch(getUsers({ role: 'teacher' }));
    }
  }, [dispatch, targetType]);

  // Get stats when target or period changes
  useEffect(() => {
    if (targetType && targetId) {
      dispatch(getRatingStats({
        targetType,
        targetId,
        periodId: selectedPeriodId === 'all' ? null : selectedPeriodId
      }));
    }
  }, [dispatch, targetType, targetId, selectedPeriodId]);

  // Handle period change
  const handlePeriodChange = (value) => {
    setSelectedPeriodId(value);
  };

  // Get target name
  const getTargetName = () => {
    if (targetType === 'teacher') {
      const teacher = users?.find(user => user._id === targetId);
      return teacher ? teacher.name : 'Teacher';
    } else if (targetType === 'subject') {
      const subject = subjects?.find(subject => subject._id === targetId);
      return subject ? subject.name : 'Subject';
    }
    return 'Unknown';
  };

  // Format distribution data for charts
  const formatDistributionData = (distribution) => {
    if (!distribution) return [];
    
    return Object.keys(distribution).map(value => ({
      value: parseInt(value),
      count: distribution[value]
    }));
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading rating statistics...</p>
      </div>
    );
  }

  // Render error state
  if (!stats || !stats.data) {
    return (
      <ErrorState 
        message="Failed to load rating statistics"
        onRetry={() => dispatch(getRatingStats({ targetType, targetId, periodId: selectedPeriodId }))}
      />
    );
  }

  const ratingData = stats.data;
  const distribution = formatDistributionData(ratingData.distribution);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Rating Statistics for {getTargetName()}
          </h2>
          <p className="text-muted-foreground">
            {targetType === 'teacher' ? 'Teacher' : 'Subject'} performance ratings
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriodId} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {periods?.map((period) => (
                <SelectItem key={period._id} value={period._id}>
                  {period.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-foreground">
                {ratingData.averageRating?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-foreground">
                {ratingData.totalRatings || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-foreground">
                {ratingData.highestRating || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lowest Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-foreground">
                {ratingData.lowestRating || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rating Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Rating Breakdown</h4>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingData.distribution?.[rating] || 0;
                      const percentage = ratingData.totalRatings ? (count / ratingData.totalRatings * 100) : 0;
                      
                      return (
                        <div key={rating} className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 w-16">
                            <span className="text-sm">{rating}</span>
                            <Star className="h-3 w-3 text-yellow-500" />
                          </div>
                          <Progress value={percentage} className="flex-1" />
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Quick Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Standard Deviation:</span>
                      <span className="font-medium">
                        {ratingData.standardDeviation?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Median Rating:</span>
                      <span className="font-medium">
                        {ratingData.medianRating || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode Rating:</span>
                      <span className="font-medium">
                        {ratingData.modeRating || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {distribution.map((item, index) => {
                  const percentage = ratingData.totalRatings ? (item.count / ratingData.totalRatings * 100) : 0;
                  
                  return (
                    <div key={item.value} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.value}</span>
                          <Star className="h-4 w-4 text-yellow-500" />
                          <Badge variant="secondary">{item.count} ratings</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rating Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Trend analysis and time-based statistics will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RatingStatsViewer;
