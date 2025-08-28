import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  BellOff, 
  Megaphone, 
  User, 
  Trash2, 
  Edit, 
  MailOpen,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { useTheme } from '../../components/theme-provider';

const NotificationsList = ({ 
  notifications, 
  tabValue, 
  user,
  onMarkAsRead,
  onMarkAsSeen,
  onEdit,
  onDelete,
  onNavigate 
}) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
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
      if (!dateString) return t('notifications.unknownDate');
      
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      
      if (!isValid(date)) {
        console.warn('Invalid date for notification:', dateString);
        return t('notifications.dateError');
      }
      
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting notification date:', error);
              return t('notifications.dateError');
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
          {t('notifications.loadFailed')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.invalidNotificationData')}
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-4">
        <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {tabValue === 0 ? t('notifications.noNotificationsReceived') : t('notifications.noNotificationsSent')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tabValue === 0 
            ? t('notifications.noNotificationsReceivedDesc')
            : t('notifications.noNotificationsSentDesc')
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
          {t('notifications.invalidNotificationDataShort')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.allNotificationsInvalid')}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {validNotifications.map((notification) => {
          // Debug notification data
          console.log('NotificationsList - Raw notification data:', {
            id: notification._id,
            isSeen: notification.isSeen,
            seen: notification.seen,
            isRead: notification.isRead,
            read: notification.read
          });
          
          const safeNotification = {
            _id: notification._id || 'unknown',
            title: notification.title || t('notifications.untitled'),
            message: notification.message || t('notifications.noMessage'),
            isRead: Boolean(notification.isRead || notification.read),
            isSeen: Boolean(notification.isSeen || notification.seen),
            isImportant: Boolean(notification.isImportant || notification.urgent),
            sender: notification.sender || { name: t('notifications.unknownSender') },
            createdAt: notification.createdAt || new Date().toISOString()
          };

          // Check if current user is the sender of this notification
          const isSender = user && notification.sender && 
            (notification.sender._id === user._id || notification.sender === user._id);

          console.log('NotificationsList - Processed safeNotification:', {
            id: safeNotification._id,
            isRead: safeNotification.isRead,
            isSeen: safeNotification.isSeen,
            showSeenButton: !safeNotification.isSeen && onMarkAsSeen
          });

          return (
            <Card 
              key={safeNotification._id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                safeNotification.isRead ? 'opacity-75' : 'border-primary/20'
              } ${darkMode ? 'border-gray-600 hover:shadow-gray-600/50' : ''}`}
              onClick={() => handleNotificationClick(safeNotification._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="text-sm">
                        {safeNotification.sender.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base">
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
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {safeNotification.message}
                      </p>
                      <div className="hidden sm:flex items-center space-x-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{safeNotification.sender.name}</span>
                        <span>•</span>
                        <span>{formatNotificationDate(safeNotification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!isSender && !safeNotification.isRead && onMarkAsRead && (
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
                    
                    {!isSender && !safeNotification.isSeen && onMarkAsSeen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsSeen(safeNotification._id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mark as seen</p>
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
                <div className="sm:hidden flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3" />
                    <span>{safeNotification.sender.name || t('notifications.unknownSender')}</span>
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
