import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft,
  Delete,
  Bell,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { 
  getNotification, 
  markNotificationAsRead,
  deleteNotification,
  reset,
} from '../features/notifications/notificationSlice';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const { notification, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.notifications
  );

  useEffect(() => {
    if (id) {
      dispatch(getNotification(id));
    }
    
    return () => {
      dispatch(reset());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message || 'Failed to load notification');
      // Navigate to role-specific notifications page on error
      if (user?.role === 'admin') {
        navigate('/app/admin/notifications/manage');
      } else if (user?.role === 'teacher') {
        navigate('/app/teacher/notifications');
      } else if (user?.role === 'student') {
        navigate('/app/student/notifications');
      } else if (user?.role === 'superadmin') {
        navigate('/superadmin/notifications');
      } else {
        navigate('/app/notifications');
      }
    }
    
    // If notification is not read, mark it as read
    if (notification && !notification.isRead) {
      dispatch(markNotificationAsRead(id))
        .then(() => {
          // Dispatch custom event to refresh header counts
          window.dispatchEvent(new CustomEvent('refreshHeaderCounts'));
        });
    }
  }, [notification, isError, isSuccess, message, id, dispatch, navigate, user?.role]);

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    dispatch(deleteNotification(id)).then(() => {
      // Navigate to role-specific notifications page after delete
      if (user?.role === 'admin') {
        navigate('/app/admin/notifications/manage');
      } else if (user?.role === 'teacher') {
        navigate('/app/teacher/notifications');
      } else if (user?.role === 'student') {
        navigate('/app/student/notifications');
      } else if (user?.role === 'superadmin') {
        navigate('/superadmin/notifications');
      } else {
        navigate('/app/notifications');
      }
      toast.success('Notification deleted');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'PPpp'); // Example: 'Apr 29, 2021, 5:34 PM'
    } catch (error) {
      return 'Invalid date';
    }
  };

  const goBack = () => {
    // Navigate to role-specific notifications page
    if (user?.role === 'admin') {
      navigate('/app/admin/notifications/manage');
    } else if (user?.role === 'teacher') {
      navigate('/app/teacher/notifications');
    } else if (user?.role === 'student') {
      navigate('/app/student/notifications');
    } else if (user?.role === 'superadmin') {
      navigate('/superadmin/notifications');
    } else {
      navigate('/app/notifications');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notification...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !notification) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Failed to load notification
            </h3>
            <p className="text-muted-foreground mb-4">
              {message || 'The notification could not be loaded.'}
            </p>
            <Button onClick={goBack} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={goBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notification Details</h1>
            <p className="text-muted-foreground">
              View and manage notification information
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleDelete} 
            variant="destructive" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Delete className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Notification Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg">
                  <Bell className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{notification.title}</CardTitle>
                <div className="flex items-center space-x-2 mt-2">
                  {notification.urgent && (
                    <Badge variant="destructive">Important</Badge>
                  )}
                  {!notification.isRead && (
                    <Badge variant="secondary">New</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Message */}
          <div>
            <h3 className="font-semibold mb-2">Message</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          <Separator />

          {/* Sender Information */}
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">From:</span>
            <span className="font-medium">
              {notification.senderName || notification.sender?.name || 'Unknown Sender'}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sent:</span>
            <span className="font-medium">
              {formatDate(notification.createdAt)}
            </span>
          </div>

          {/* Additional Details */}
          {notification.targetRole && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground">Target Role:</span>
              <Badge variant="outline">{notification.targetRole}</Badge>
            </div>
          )}

          {notification.classes && notification.classes.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Target Classes</h4>
              <div className="flex flex-wrap gap-2">
                {notification.classes.map((cls, index) => (
                  <Badge key={index} variant="outline">
                    {cls.name || `Class ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {notification.recipients && notification.recipients.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Recipients</h4>
              <div className="flex flex-wrap gap-2">
                {notification.recipients.map((recipient, index) => (
                  <Badge key={index} variant="outline">
                    {recipient.name || recipient.email || `Recipient ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetail;
