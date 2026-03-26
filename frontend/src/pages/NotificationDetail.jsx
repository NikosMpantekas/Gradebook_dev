import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft,
  Trash2,
  Bell,
  User,
  Calendar,
  AlertCircle,
  Tag,
  Users
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
import { Spinner } from '../components/ui/spinner';

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const { notification, isLoading, isError, message } = useSelector(
    (state) => state.notifications
  );

  const goBack = useCallback(() => {
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
  }, [user?.role, navigate]);

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
      goBack();
    }
    
    if (notification && !notification.isRead) {
      dispatch(markNotificationAsRead(id))
        .then(() => {
          window.dispatchEvent(new CustomEvent('refreshHeaderCounts'));
        });
    }
  }, [notification, isError, message, id, dispatch, goBack]);

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
      return format(date, 'MMM d, yyyy · p');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // If loading OR if we don't have a notification yet but also don't have an error
  // (Handling the initial render phase before the fetch starts/completes)
  if (isLoading || (!notification && !isError)) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="text-primary h-8 w-8 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm animate-pulse">Loading notification...</p>
        </div>
      </div>
    );
  }

  // If we have an error or if we explicitly have no notification after loading finished
  if (isError || !notification) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4 opacity-80" />
          <h3 className="text-lg font-bold text-foreground mb-2">
            Notification Not Found
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {message || 'The notification you are looking for does not exist or has been removed.'}
          </p>
          <Button onClick={goBack} variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to list
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={goBack} variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notification</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">View details and message content</p>
          </div>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'superadmin' || notification.sender === user?._id) && (
          <Button 
            onClick={handleDelete} 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2 self-end sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Delete</span>
          </Button>
        )}
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md ring-1 ring-border/50">
        <CardHeader className="pb-4 sm:pb-6 border-b border-border/40">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 shadow-inner">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <CardTitle className="text-lg sm:text-2xl font-extrabold leading-tight mb-2 sm:mb-3">
                {notification.title}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {notification.urgent && (
                  <Badge variant="destructive" className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase">Urgent</Badge>
                )}
                {!notification.isRead && (
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase">New</Badge>
                )}
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] sm:text-[11px] font-medium bg-background/50">Details</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-border/30">
              <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">From</span>
                <span className="font-semibold text-sm truncate">{notification.senderName || notification.sender?.name || 'Unknown'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-border/30">
              <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Sent</span>
                <span className="font-semibold text-sm truncate">{formatDate(notification.createdAt)}</span>
              </div>
            </div>

            {notification.targetRole && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-border/30 sm:col-span-2">
                <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm">
                  <Tag className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Target Audience</span>
                  <span className="text-sm font-semibold capitalize bg-primary/10 text-primary px-2 py-0.5 rounded-lg w-fit mt-0.5">
                    {notification.targetRole === 'all' ? 'System-wide' : notification.targetRole}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Message Body</h3>
            </div>
            <div className="bg-background/40 border border-border/50 p-6 rounded-[2rem] text-foreground/90 leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
              <p className="whitespace-pre-wrap text-sm sm:text-[15px] font-medium opacity-90">
                {notification.message}
              </p>
            </div>
          </div>

          {(notification.classes?.length > 0 || notification.recipients?.length > 0) && (
            <div className="space-y-6 pt-2">
              {notification.classes?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Classes</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notification.classes.map((cls, index) => (
                      <Badge key={index} variant="secondary" className="bg-muted hover:bg-muted font-bold text-[10px] px-3 py-1 rounded-full border border-border/50">
                        {cls.name || `Class ${index + 1}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {notification.recipients?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Direct Recipients</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                    {notification.recipients.map((recipient, index) => (
                      <Badge key={index} variant="outline" className="bg-background/80 font-medium text-[10px] px-2.5 py-1 rounded-lg">
                        {recipient.name || recipient.email || `User ${index + 1}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetail;
