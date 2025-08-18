import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { 
  Bell, 
  BellOff, 
  Megaphone, 
  User, 
  Trash2, 
  Edit, 
  MailOpen,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { Separator } from '../ui/separator';

const NotificationsList = ({ 
  notifications, 
  tabValue, 
  user,
  onMarkAsRead,
  onEdit,
  onDelete,
  onNavigate 
}) => {
  // Safely validate notification data
  const validateNotification = (notification) => {
    if (!notification || typeof notification !== 'object') {
      console.warn('Invalid notification object:', notification);
      return false;
    }
    
    // Ensure required fields exist
    if (!notification._id || !notification.title || !notification.message) {
      console.warn('Notification missing required fields:', notification);
      return false;
    }
    
    return true;
  };

  // Safe date formatting
  const formatNotificationDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown date';
      
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      
      if (!isValid(date)) {
        console.warn('Invalid date for notification:', dateString);
        return 'Invalid date';
      }
      
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting notification date:', error);
      return 'Date error';
    }
  };

  // Safe navigation handler
  const handleNotificationClick = (notificationId) => {
    try {
      if (!notificationId || typeof notificationId !== 'string') {
        console.error('Invalid notification ID for navigation:', notificationId);
        return;
      }
      
      // Ensure onNavigate is a function before calling
      if (typeof onNavigate === 'function') {
        onNavigate(`/app/notifications/${notificationId}`);
      } else {
        console.error('onNavigate is not a function:', typeof onNavigate);
      }
    } catch (error) {
      console.error('Error navigating to notification:', error);
    }
  };
  
  const canEdit = (notification) => {
    if (!notification || !notification.sender || !user) return false;
    
    return (tabValue === 1 && notification.sender && notification.sender._id === user._id) ||
           user.role === 'admin';
  };

  // Validate notifications array
  if (!Array.isArray(notifications)) {
    console.error('Notifications is not an array:', typeof notifications, notifications);
    return (
      <div className="flex flex-col items-center py-16 text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Error loading notifications
        </h3>
        <p className="text-sm text-muted-foreground">
          Invalid notification data received. Please refresh the page.
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-4">
        <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {tabValue === 0 ? 'No notifications received' : 'No notifications sent'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tabValue === 0 
            ? 'You will see new notifications here when they arrive.' 
            : 'Notifications you send will appear here.'
          }
        </p>
      </div>
    );
  }

  // Filter out invalid notifications
  const validNotifications = notifications.filter(validateNotification);

  if (validNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-4">
        <AlertCircle className="h-16 w-16 text-warning mb-4" />
        <h3 className="text-lg font-semibold text-warning mb-2">
          Invalid notification data
        </h3>
        <p className="text-sm text-muted-foreground">
          All notifications contain invalid data. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {validNotifications.map((notification) => {
          const safeNotification = {
            _id: notification._id || 'unknown',
            title: notification.title || 'Untitled',
            message: notification.message || 'No message',
            isRead: Boolean(notification.isRead),
            isImportant: Boolean(notification.isImportant || notification.urgent),
            sender: notification.sender || { name: 'Unknown sender' },
            createdAt: notification.createdAt || new Date().toISOString()
          };

          return (
            <Card 
              key={safeNotification._id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                safeNotification.isRead ? 'opacity-75' : 'border-primary/20'
              }`}
              onClick={() => handleNotificationClick(safeNotification._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">
                        {safeNotification.sender.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {safeNotification.title}
                        </h4>
                        {safeNotification.isImportant && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                        {!safeNotification.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {safeNotification.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!safeNotification.isRead && onMarkAsRead && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(safeNotification._id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <MailOpen className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mark as read</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {canEdit(safeNotification) && onEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(safeNotification);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit notification</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {canEdit(safeNotification) && onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(safeNotification._id);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete notification</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3" />
                    <span>{safeNotification.sender.name || 'Unknown sender'}</span>
                  </div>
                  <span>{formatNotificationDate(safeNotification.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default NotificationsList;
