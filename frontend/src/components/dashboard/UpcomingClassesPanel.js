import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Skeleton,
  Alert,
  Button,
  useTheme
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Class as ClassIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format, isValid, parseISO } from 'date-fns';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Upcoming Classes Panel Component
 * Shows upcoming classes with permission checking
 */
export const UpcomingClassesPanel = ({ classes = [], loading = false, onViewAll, userRole }) => {
  const { isFeatureEnabled } = useFeatureToggles();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Check if classes/schedule feature is enabled
  if (!isFeatureEnabled('enableClasses') && !isFeatureEnabled('enableSchedule')) {
    return null; // Hide panel if classes/schedule are disabled
  }

  const formatTime = (timeString) => {
    try {
      if (!timeString) return 'No time';
      // Handle different time formats
      const date = new Date(`2000-01-01T${timeString}`);
      if (!isValid(date)) return timeString;
      return format(date, 'HH:mm');
    } catch (error) {
      return timeString || 'Time error';
    }
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

  const handleClassClick = (classItem) => {
    // Navigate to the schedule page
    const userRole = user?.role;
    
    if (userRole === 'student') {
      navigate('/app/student/schedule');
    } else if (userRole === 'teacher') {
      navigate('/app/teacher/schedule');
    } else if (userRole === 'admin') {
      navigate('/app/admin/schedule');
    } else if (userRole === 'parent') {
      navigate('/app/parent/schedule');
    } else {
      navigate('/app/schedule');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Upcoming Classes" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Box>
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
        title="Upcoming Classes" 
        avatar={<ScheduleIcon color="primary" />}
        action={
          classes.length > 0 && (
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
        {classes.length === 0 ? (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 1,
              backgroundColor: theme => `${theme.palette.primary.main}20`,
              color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
              '& .MuiAlert-icon': {
                color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
              },
              border: theme => `1px solid ${theme.palette.primary.main}40`,
            }}
          >
            No upcoming classes scheduled
          </Alert>
        ) : (
          <List sx={{ py: 0, position: 'relative' }} disablePadding>
            {classes.slice(0, 5).map((classItem, index) => {
              // Defensive rendering to prevent null access
              const safeClassItem = classItem || {};
              const uniqueKey = safeClassItem._id || `class-${index}`;
              
              return (
                <ListItemButton
                  key={uniqueKey} 
                  onClick={() => handleClassClick(safeClassItem)}
                  sx={{ 
                    px: 0,
                    borderRadius: 1,
                    mb: 0.5,
                    transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: theme => `${theme.palette.primary.main}10`,
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: 'info.main',
                    width: 36,
                    height: 36
                  }}>
                    <ClassIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {safeClassItem.subject || safeClassItem.className || 'Unknown Subject'}
                        {userRole === 'admin' && safeClassItem.teacher && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            - {safeClassItem.teacher.name}
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    <>
                      {safeClassItem.startTime && safeClassItem.endTime ? (
                        `${formatTime(safeClassItem.startTime)} - ${formatTime(safeClassItem.endTime)}`
                      ) : (
                        'Time not specified'
                      )}
                      {safeClassItem.room && (
                        <span style={{ marginLeft: '8px' }}>
                          • Room {safeClassItem.room}
                        </span>
                      )}
                    </>
                  }
                />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingClassesPanel;
