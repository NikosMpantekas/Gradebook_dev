import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Skeleton,
  Alert,
  Button,
  useTheme,
  ListItemButton
} from '@mui/material';
import {
  Grade as GradeIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format, isValid, parseISO } from 'date-fns';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Recent Grades Panel Component
 * Shows recent grades with permission checking
 * INCLUDES PARENT FIXES: Non-clickable grades for parents and enhanced subject name resolution
 */
export const RecentGradesPanel = ({ grades = [], loading = false, onViewAll, userRole }) => {
  const { isFeatureEnabled } = useFeatureToggles();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Check if grades feature is enabled
  if (!isFeatureEnabled('enableGrades')) {
    return null; // Hide panel if grades are disabled
  }

  const getGradeColor = (value) => {
    if (value >= 18) return 'success';
    if (value >= 15) return 'warning';
    if (value >= 10) return 'info';
    return 'error';
  };

  const formatDate = (dateString) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return 'Date error';
    }
  };

  const handleGradeClick = (grade) => {
    // Navigate to the specific grade detail page
    const userRole = user?.role;
    const gradeId = grade?._id;
    
    if (gradeId) {
      if (userRole === 'student') {
        navigate(`/app/student/grades/${gradeId}`);
      } else if (userRole === 'parent') {
        navigate(`/app/parent/grades/${gradeId}`);
      } else {
        navigate(`/app/grades/${gradeId}`);
      }
    } else {
      // Fallback to grades list if no ID
      if (userRole === 'student') {
        navigate('/app/student/grades');
      } else if (userRole === 'parent') {
        navigate('/app/parent/grades');
      } else {
        navigate('/app/grades');
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Recent Grades" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="text" width="50%" height={16} />
                </Box>
                <Skeleton variant="rectangular" width={60} height={30} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="Recent Grades" 
        avatar={<GradeIcon color="primary" />}
        action={
          grades.length > 0 && (
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
          )
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {grades.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No recent grades available
          </Alert>
        ) : (
          <List sx={{ py: 0, position: 'relative' }} disablePadding>
            {grades.slice(0, 5).map((grade, index) => {
              // Defensive rendering to prevent null access
              const safeGrade = grade || {};
              const uniqueKey = safeGrade._id || `grade-${index}`;
              
              // PARENT FIX: Make grades non-clickable for parents as requested
              const GradeItemComponent = userRole === 'parent' ? ListItem : ListItemButton;
              const gradeItemProps = userRole === 'parent' 
                ? {
                    key: uniqueKey,
                    sx: { 
                      px: 0,
                      borderRadius: 1,
                      mb: 0.5,
                      // Non-clickable styling for parents
                      backgroundColor: 'transparent'
                    }
                  }
                : {
                    key: uniqueKey,
                    onClick: () => handleGradeClick(safeGrade),
                    sx: { 
                      px: 0,
                      borderRadius: 1,
                      mb: 0.5,
                      transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: theme => `${theme.palette.primary.main}10`,
                        transform: 'translateX(4px)'
                      }
                    }
                  };

              return (
                <GradeItemComponent {...gradeItemProps}>
                <ListItemAvatar>
                  <Avatar sx={{ 
                      bgcolor: `${getGradeColor(safeGrade.value || 0)}.main`,
                    width: 36,
                    height: 36
                  }}>
                    <GradeIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {/* PARENT FIX: Enhanced subject name resolution for class-based system */}
                        {safeGrade.subject?.name || 
                          safeGrade.subjectName || 
                          safeGrade.classInfo?.subject?.name ||
                          safeGrade.className ||
                          'Subject Not Available'}
                        {userRole !== 'student' && safeGrade.student && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            - {safeGrade.student.name}
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(safeGrade.createdAt)} • {safeGrade.description || 'No description'}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip 
                      label={safeGrade.value || 0} 
                      color={getGradeColor(safeGrade.value || 0)}
                    size="small"
                    variant="filled"
                  />
                </ListItemSecondaryAction>
                </GradeItemComponent>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentGradesPanel;
