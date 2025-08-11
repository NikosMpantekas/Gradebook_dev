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
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Skeleton,
  Alert,
  Button,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format, isValid, parseISO } from 'date-fns';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Recent Notifications Panel Component
 * Shows recent notifications with permission checking
 */
export const RecentNotificationsPanel = ({ notifications = [], loading = false, onViewAll, userType }) => {
  const { isFeatureEnabled } = useFeatureToggles();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Check if notifications feature is enabled
  if (!isFeatureEnabled('enableNotifications')) {
    return null; // Hide panel if notifications are disabled
  }

  const formatDate = (dateString) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return 'Date error';
    }
  };

  const handleNotificationClick = (notification) => {
    // Navigate to the notifications page with the specific notification
    const userRole = user?.role;
    const notificationId = notification?._id;
    
    if (notificationId) {
      if (userRole === 'student') {
        navigate(`/app/student/notifications/${notificationId}`);
      } else if (userRole === 'parent') {
        navigate(`/app/parent/notifications/${notificationId}`);
      } else if (userRole === 'teacher') {
        navigate(`/app/teacher/notifications/${notificationId}`);
      } else if (userRole === 'admin') {
        navigate(`/app/admin/notifications/${notificationId}`);
      } else {
        navigate(`/app/notifications/${notificationId}`);
      }
    } else {
      // Fallback to notifications list if no ID
      if (userRole === 'student') {
        navigate('/app/student/notifications');
      } else if (userRole === 'parent') {
        navigate('/app/parent/notifications');
      } else if (userRole === 'teacher') {
        navigate('/app/teacher/notifications');
      } else if (userRole === 'admin') {
        navigate('/app/admin/notifications');
      } else {
        navigate('/app/notifications');
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Recent Notifications" />
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
        title="Recent Notifications" 
        avatar={<NotificationsIcon color="primary" />}
        action={
          notifications.length > 0 && (
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
        {notifications.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No recent notifications available
          </Alert>
        ) : (
          <List sx={{ py: 0, position: 'relative' }} disablePadding>
            {notifications.slice(0, 5).map((notification, index) => {
              // Defensive rendering to prevent null access
              const safeNotification = notification || {};
              const uniqueKey = safeNotification._id || `notification-${index}`;
              
              return (
                <ListItemButton
                  key={uniqueKey} 
                  onClick={() => handleNotificationClick(safeNotification)}
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
                    bgcolor: notification.isImportant ? 'warning.main' : 'primary.main',
                    width: 36,
                    height: 36
                  }}>
                    {notification.isImportant ? (
                      <NotificationsActiveIcon fontSize="small" />
                    ) : (
                      <NotificationsIcon fontSize="small" />
                    )}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: safeNotification.isRead ? 'normal' : 'bold',
                        flex: 1
                      }}>
                        {safeNotification.title || 'No title'}
                      </Typography>
                      {safeNotification.isImportant && (
                        <Chip label="Important" size="small" color="warning" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(safeNotification.createdAt)}
                    </Typography>
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

export default RecentNotificationsPanel;
