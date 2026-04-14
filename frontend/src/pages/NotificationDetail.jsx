import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  Delete,
  Bell,
  User,
  Users,
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
import { Spinner } from '../components/ui/spinner';
import { refreshAppCounts } from '../lib/utils';

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

  useEffect(() => {
    if (isError) {
      toast.error(message || 'Failed to load notification');
      goBack();
    }

    // If notification is not read, mark it as read
    if (notification && !notification.isRead) {
      dispatch(markNotificationAsRead(id))
        .then(() => {
          // Dispatch custom event to refresh header counts
          refreshAppCounts();
        });
    }
  }, [notification, isError, message, id, dispatch, navigate, user?.role]);

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    dispatch(deleteNotification(id)).then(() => {
      toast.success('Notification deleted');
      goBack();
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

  // Show spinner during loading OR if we don't have a notification yet but also don't have an error
  // This prevents the "Not Found" flicker during initial mount
  if (isLoading || (!notification && !isError)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Spinner className="text-primary mb-2" />
            <p className="text-muted-foreground text-sm">Loading notification...</p>
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
              Notification Not Found
            </h3>
            <p className="text-muted-foreground mb-4">
              {message || 'The notification you are looking for does not exist or has been removed.'}
            </p>
            <Button onClick={goBack} variant="outline">
              Return to list
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
          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'teacher') && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Delete className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Notification Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg">
                  <Bell className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{notification.title}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
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
          {/* Message - primary content, large and prominent */}
          <div className="space-y-2">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          <Separator />

          {/* Compact metadata row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>From:</span>
              <span className="font-medium text-foreground">
                {notification.senderName || notification.sender?.name || 'Unknown Sender'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Sent:</span>
              <span className="font-medium text-foreground">{formatDate(notification.createdAt)}</span>
            </div>

            {notification.recipients && notification.recipients.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {notification.recipients.length} {notification.recipients.length === 1 ? 'Recipient' : 'Recipients'}
                </span>
              </div>
            )}

            {notification.targetRole && notification.targetRole !== 'all' && (
              <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
                {notification.targetRole}
              </Badge>
            )}

            {notification.classes && notification.classes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {notification.classes.map((cls, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                    {cls.name || `Class ${index + 1}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetail;
