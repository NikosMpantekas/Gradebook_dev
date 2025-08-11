import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Skeleton,
  Button,
  useTheme
} from '@mui/material';
import {
  ShowChart as ShowChartIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { subDays } from 'date-fns';
import { useFeatureToggles } from '../../context/FeatureToggleContext';

/**
 * Grades Over Time Panel Component
 * Shows a line graph of grades over the last 7 days
 */
export const GradesOverTimePanel = ({ grades = [], loading = false, onViewAll, animationDelayMs = 0 }) => {
  const { isFeatureEnabled } = useFeatureToggles();
  const theme = useTheme();
  const pathRef = useRef(null);
  const [dashLength, setDashLength] = useState(0);
  const [dashOffset, setDashOffset] = useState(0);

  // Check if grades feature is enabled
  const featureEnabled = isFeatureEnabled('enableGrades');

  // Process grades data for the graph
  const processGradesForGraph = () => {
    if (!grades || grades.length === 0) return [];
    
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      return {
        date: date.toDateString(),
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        grades: []
      };
    });

    // Group grades by date
    grades.forEach(grade => {
      const gradeDate = new Date(grade.createdAt).toDateString();
      const dayData = last7Days.find(day => day.date === gradeDate);
      if (dayData) {
        dayData.grades.push(grade.value || 0);
      }
    });

    // Calculate average grade for each day
    return last7Days.map(day => ({
      ...day,
      averageGrade: day.grades.length > 0 ? 
        day.grades.reduce((sum, grade) => sum + grade, 0) / day.grades.length : 
        null
    }));
  };

  useEffect(() => {
    if (!pathRef.current || loading) return;

    // Delay the animation start slightly to ensure DOM is ready
    const start = () => {
      const path = pathRef.current;
      if (path) {
        const length = path.getTotalLength();
        setDashLength(length);
        setDashOffset(length);
        
        // Trigger animation after a short delay
        setTimeout(() => {
          setDashOffset(0);
        }, 100);
      }
    };

    setTimeout(start, animationDelayMs);
  }, [grades, loading, animationDelayMs]);

  // Helper functions to create a smooth curve through points using cubic Bezier segments
  const lineProps = (pointA, pointB) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX)
    };
  };

  const controlPoint = (current, previous, next, reverse = false, smoothing = 0.2) => {
    const p = previous || current;
    const n = next || current;
    const o = lineProps(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
  };

  const generateSmoothPath = (pts) => {
    if (pts.length < 2) return '';
    
    let path = `M ${pts[0][0]},${pts[0][1]}`;
    
    for (let i = 1; i < pts.length; i++) {
      const cp1 = controlPoint(pts[i - 1], pts[i - 2], pts[i]);
      const cp2 = controlPoint(pts[i], pts[i - 1], pts[i + 1], true);
      path += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${pts[i][0]},${pts[i][1]}`;
    }
    
    return path;
  };

  // Create smooth SVG line graph
  const renderLineGraph = () => {
    const data = processGradesForGraph();
    const width = 400;
    const height = 200;
    const padding = 40;
    const graphWidth = width - (2 * padding);
    const graphHeight = height - (2 * padding);

    // Filter out days with no grades for the line
    const dataWithGrades = data.filter(d => d.averageGrade !== null);
    
    if (dataWithGrades.length === 0) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: 200, 
          color: 'text.secondary' 
        }}>
          <Typography variant="body2">
            📊 No grade data available for the chart
          </Typography>
        </Box>
      );
    }

    const yMin = 0;
    const yMax = 20;
    
    // Create points for the line
    const points = dataWithGrades.map((d, i) => {
      const x = padding + (i / Math.max(dataWithGrades.length - 1, 1)) * graphWidth;
      const y = padding + ((yMax - d.averageGrade) / (yMax - yMin)) * graphHeight;
      return [x, y];
    });

    const smoothPath = generateSmoothPath(points);
    
    // Create area path (same as line path but closed to bottom)
    const areaPathData = smoothPath + ` L ${points[points.length - 1][0]},${height - padding} L ${points[0][0]},${height - padding} Z`;
    
    // Create unique IDs for clip paths to avoid conflicts
    const lineClipPathId = `lineClip-${Math.random().toString(36).substr(2, 9)}`;
    const areaClipPathId = `areaClip-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate step for x-axis labels
    const step = Math.max(1, Math.floor(data.length / 4));

    return (
      <Box sx={{ width: '100%', overflow: 'hidden' }}>
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          <defs>
            <clipPath id={lineClipPathId}>
              <rect 
                x={0} 
                y={0} 
                width={dashLength > 0 ? (width * (dashLength - dashOffset)) / dashLength : 0}
                height={height}
                style={{
                  transition: 'width 1.5s ease-out'
                }}
              />
            </clipPath>
            <clipPath id={areaClipPathId}>
              <rect 
                x={0} 
                y={0} 
                width={dashLength > 0 ? (width * (dashLength - dashOffset)) / dashLength : 0}
                height={graphHeight}
                style={{
                  transition: 'width 1.5s ease-out'
                }}
              />
            </clipPath>
          </defs>
          
          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = padding + (i / 4) * graphHeight;
            return (
              <line
                key={`grid-${i}`}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={theme.palette.divider}
                strokeWidth="1"
                opacity={0.3}
              />
            );
          })}
          
          {/* Y-axis labels */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = padding + (i / 4) * graphHeight;
            const value = yMax - (i / 4) * (yMax - yMin);
            return (
              <text
                key={`y-label-${i}`}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill={theme.palette.text.secondary}
              >
                {Math.round(value)}
              </text>
            );
          })}

          {/* X-axis labels */}
          {data.map((point, index) => (
            (index % step === 0 || index === data.length - 1) && (
              <text
                key={`x-label-${index}`}
                x={padding + (index / Math.max(data.length - 1, 1)) * graphWidth}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="10"
                fill={theme.palette.text.secondary}
              >
                {point.displayDate}
              </text>
            )
          ))}

          {/* Filled area with clip path */}
          <path
            d={areaPathData}
            fill={theme.palette.primary.main}
            opacity={0.2}
            clipPath={`url(#${areaClipPathId})`}
          />

          {/* Line - clipped by the lineClipPath */}
          <path
            ref={pathRef}
            d={smoothPath}
            stroke={theme.palette.primary.main}
            strokeWidth="3"
            fill="none"
            style={{
              strokeDasharray: dashLength,
              strokeDashoffset: dashOffset,
              transition: 'stroke-dashoffset 1.5s ease-out',
              zIndex: 1
            }}
            clipPath={`url(#${lineClipPathId})`}
          />

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point[0]}
              cy={point[1]}
              r="4"
              fill={theme.palette.primary.main}
              stroke={theme.palette.background.paper}
              strokeWidth="2"
            />
          ))}
        </svg>
      </Box>
    );
  };

  // Render based on feature flag and loading, but after hooks have run
  if (!featureEnabled) return null;

  return (
    <Card>
      <CardHeader 
        title="Grades Overview" 
        avatar={<ShowChartIcon color="primary" />}
        action={
          <Button 
            size="small" 
            onClick={onViewAll}
            startIcon={<VisibilityIcon />}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme => `${theme.palette.primary.main}10`
              }
            }}
          >
            View All
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={200} />
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        ) : (
          renderLineGraph()
        )}
      </CardContent>
    </Card>
  );
};

export default GradesOverTimePanel;
