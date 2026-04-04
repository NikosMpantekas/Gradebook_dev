import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  Bug,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  MailOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { toast } from 'react-toastify';
import { refreshAppCounts } from '../lib/utils';

const UserMessagesList = ({ messages, user, onMessagesChanged }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedMessage, setExpandedMessage] = useState(null);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t('contactMessages.noUserMessages')}
        </p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-primary text-primary-foreground';
      case 'in-progress':
        return 'bg-warning text-warning-foreground';
      case 'replied':
        return 'bg-success text-success-foreground';
      case 'closed':
        return 'bg-info text-info-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in-progress':
        return 'In Progress';
      case 'replied':
        return 'Replied';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const toggleMessage = (messageId) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  const handleMarkAsRead = async (messageId) => {
    if (!user || !user.token) return;

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      await axios.put(`${API_URL}/api/contact/${messageId}`, { read: true, status: 'read' }, config);

      toast.success(t('contactMessages.markedAsRead'));
      refreshAppCounts();
      if (onMessagesChanged) onMessagesChanged();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error(t('contactMessages.markAsReadFailed'));
    }
  };

  const handleAcceptReset = (message) => {
    navigate(message.user ? `/app/admin/users/${message.user}` : '/app/admin/users');
  };

  const handleDenyReset = (message) => {
    navigate(message.user ? `/app/admin/users/${message.user}` : '/app/admin/users');
  };

  const isPasswordReset = (message) =>
    message.isBugReport !== true && (message.subject?.startsWith('[Password Reset]') || message.subject?.startsWith('[Επαναφορά Κωδικού]'));

  return (
    <div className="w-full space-y-4 mt-4">
      {messages.map((message) => (
        <Card key={message._id} className="w-full overflow-hidden border-2 border-gray-600 dark:border-gray-400">
          <Collapsible open={expandedMessage === message._id}>
            <CollapsibleTrigger asChild>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleMessage(message._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {message.isBugReport ? (
                      <Bug className="h-5 w-5 text-destructive" />
                    ) : !isPasswordReset(message) ? (
                      <Mail className="h-5 w-5 text-primary" />
                    ) : (
                      <MailOpen className="h-5 w-5 text-yellow-500" />
                    )}
                    <div className="flex flex-col items-start">
                      <h3 className="font-semibold text-foreground">
                        {message.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(message.status)}>
                      {getStatusLabel(message.status)}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedMessage === message._id ? 'rotate-180' : ''
                      }`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">{t('contactMessages.message')}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>

                  {/* Password reset action buttons */}
                  {isPasswordReset(message) && user?.role === 'admin' && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {!message.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(message._id); }}
                        >
                          <MailOpen className="mr-2 h-4 w-4" />
                          {t('contactMessages.markAsRead')}
                        </Button>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => { e.stopPropagation(); handleAcceptReset(message); }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('contactMessages.approveReset')}
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={(e) => { e.stopPropagation(); handleDenyReset(message); }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('contactMessages.deny')}
                      </Button>
                    </div>
                  )}

                  {message.adminReply && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">{t('contactMessages.adminReply')}</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-foreground">
                          {message.adminReply}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {t('contactMessages.sent')}: {new Date(message.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};

export default UserMessagesList;
