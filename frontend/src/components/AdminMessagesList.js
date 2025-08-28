import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ExpandMore,
  Bug,
  Mail,
  Send,
  MailOpen,
  User,
  Building,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../config/appConfig';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const AdminMessagesList = ({ messages, user, onMessagesChanged }) => {
  const { t } = useTranslation();
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState({});
  const [expandedPanel, setExpandedPanel] = useState(null);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('contactMessages.noAdminMessages')}</p>
      </div>
    );
  }

  const handleReplyChange = (id, text) => {
    setReplyText({
      ...replyText,
      [id]: text
    });
  };

  const handleAccordionChange = (panel) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleStatusChange = async (messageId, newStatus) => {
    if (!user || !user.token) return;

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      await axios.patch(`${API_URL}/api/contact/${messageId}/status`, {
        status: newStatus
      }, config);

      toast.success(t('contactMessages.statusUpdated'));
      if (onMessagesChanged) {
        onMessagesChanged();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('contactMessages.statusUpdateFailed'));
    }
  };

  const handleReply = async (messageId) => {
    if (!user || !user.token) return;
    if (!replyText[messageId] || replyText[messageId].trim() === '') return;

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      await axios.post(`${API_URL}/api/contact/${messageId}/reply`, {
        adminReply: replyText[messageId].trim()
      }, config);

      toast.success(t('contactMessages.replySent'));
      setReplyText({
        ...replyText,
        [messageId]: ''
      });
      setReplying({
        ...replying,
        [messageId]: false
      });
      
      if (onMessagesChanged) {
        onMessagesChanged();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(t('contactMessages.replyFailed'));
    }
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

      await axios.patch(`${API_URL}/api/contact/${messageId}/read`, {}, config);

      toast.success(t('contactMessages.markedAsRead'));
      if (onMessagesChanged) {
        onMessagesChanged();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error(t('contactMessages.markAsReadFailed'));
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message._id} className="overflow-hidden border-2 border-gray-600 dark:border-gray-400">
            <Collapsible open={expandedPanel === message._id}>
              <CollapsibleTrigger asChild>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAccordionChange(message._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {message.type === 'bug' ? (
                          <Bug className="h-5 w-5 text-destructive" />
                        ) : (
                          <Mail className="h-5 w-5 text-primary" />
                        )}
                        <span className="font-semibold text-foreground">
                          {message.subject || 'No Subject'}
                        </span>
                      </div>
                      <Badge className={getStatusColor(message.status)}>
                        {getStatusLabel(message.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        expandedPanel === message._id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">{t('contactMessages.from')}:</Label>
                        <p className="font-medium">{message.userName || 'Unknown User'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('contactMessages.school')}:</Label>
                        <p className="font-medium">{message.schoolName || 'Unknown School'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('contactMessages.email')}:</Label>
                        <p className="font-medium">{message.userEmail || 'No email'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('contactMessages.date')}:</Label>
                        <p className="font-medium">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-muted-foreground">{t('contactMessages.message')}:</Label>
                      <p className="mt-1 text-foreground">{message.message}</p>
                    </div>
                    
                    {message.adminReply && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-muted-foreground">{t('contactMessages.adminReply')}:</Label>
                          <p className="mt-1 text-foreground">{message.adminReply}</p>
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        value={message.status}
                        onValueChange={(value) => handleStatusChange(message._id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">{t('contactMessages.status.new')}</SelectItem>
                          <SelectItem value="in-progress">{t('contactMessages.status.in_progress')}</SelectItem>
                          <SelectItem value="replied">{t('contactMessages.status.replied')}</SelectItem>
                          <SelectItem value="closed">{t('contactMessages.status.closed')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {!message.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(message._id)}
                        >
                          <MailOpen className="mr-2 h-4 w-4" />
                          {t('contactMessages.markAsRead')}
                        </Button>
                      )}
                    </div>
                    
                    {!message.adminReply && (
                      <div className="space-y-2">
                        <Label htmlFor={`reply-${message._id}`}>{t('contactMessages.reply')}:</Label>
                        <div className="flex space-x-2">
                          <Input
                            id={`reply-${message._id}`}
                            value={replyText[message._id] || ''}
                            onChange={(e) => handleReplyChange(message._id, e.target.value)}
                            placeholder={t('contactMessages.replyPlaceholder')}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handleReply(message._id)}
                            disabled={!replyText[message._id] || replyText[message._id].trim() === ''}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {t('contactMessages.send')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default AdminMessagesList;
