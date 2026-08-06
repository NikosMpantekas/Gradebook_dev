import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/appConfig';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Bug,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { getDateFnsLocale } from '../utils/dateLocale';
import { toast } from 'sonner';
import axios from 'axios';
import { refreshAppCounts } from '../lib/utils';

const UserContactMessages = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUserMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fixMessages = (msgs) => {
          return msgs.map(msg => {
            const fixedMsg = { ...msg };
            
            if (fixedMsg.status === 'replied') {
              if (!fixedMsg.adminReply || fixedMsg.adminReply.trim() === '') {
                fixedMsg.adminReply = 'Your message has been reviewed by admin. Thank you for your feedback.';
                fixedMsg.adminReplyDate = fixedMsg.adminReplyDate || new Date();
              } else if (
                fixedMsg.adminReply.includes('skata') || 
                fixedMsg.adminReply.toLowerCase().includes('test') ||
                fixedMsg.adminReply.length < 5
              ) {
                fixedMsg.adminReply = 'Your message has been reviewed. Thank you for your feedback.';
              }
            }
            
            if (fixedMsg.createdAt) {
              fixedMsg.createdAt = new Date(fixedMsg.createdAt);
            }
            if (fixedMsg.adminReplyDate) {
              fixedMsg.adminReplyDate = new Date(fixedMsg.adminReplyDate);
            }
            
            fixedMsg.isBugReport = fixedMsg.type === 'bug' || fixedMsg.isBugReport === true;
            
            return fixedMsg;
          });
        };
        
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        
        const timestamp = Date.now();
        const { data } = await axios.get(`${API_URL}/api/contact/user?_t=${timestamp}`, config);
        
        const fixedMessages = fixMessages(data);
        setMessages(fixedMessages);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try again.');
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserMessages();
  }, [user]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return format(new Date(dateString), 'PPP p', { locale: getDateFnsLocale() });
    } catch (err) {
      return 'Invalid date';
    }
  };
  
  useEffect(() => {
    const markRepliesAsRead = async () => {
      try {
        const unreadReplies = messages.filter(msg => 
          msg.status === 'replied' && 
          msg.adminReply && 
          !msg.replyRead
        );
        
        if (unreadReplies.length === 0) return;
        
        for (const msg of unreadReplies) {
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          };
          
          await axios.put(
            `${API_URL}/api/contact/${msg._id}`,
            { replyRead: true },
            config
          );
        }
        
        refreshAppCounts();
        
        setMessages(prev => prev.map(msg => 
          unreadReplies.some(ur => ur._id === msg._id)
            ? { ...msg, replyRead: true }
            : msg
        ));
      } catch (err) {
        console.error('Error marking replies as read:', err);
      }
    };
    
    if (!loading && messages.length > 0) {
      markRepliesAsRead();
    }
  }, [loading, messages, user.token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {status}
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge variant="outline" className="gap-1 border-warning text-warning">
            <AlertTriangle className="h-3 w-3" />
            {status}
          </Badge>
        );
      case 'replied':
        return (
          <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">My Messages & Bug Reports</h1>
          <p className="text-muted-foreground">View and track responses to your submitted messages and bug reports.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBack} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="p-6 rounded-md bg-muted text-muted-foreground text-sm font-medium">
          You haven't sent any messages or bug reports yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message._id} className="overflow-hidden">
              <CardHeader className={`p-4 text-white ${message.isBugReport ? 'bg-destructive' : 'bg-primary'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {message.isBugReport ? (
                      <Bug className="h-5 w-5 shrink-0" />
                    ) : (
                      <MessageSquare className="h-5 w-5 shrink-0" />
                    )}
                    <CardTitle className="text-base font-semibold text-white">
                      {message.subject || 'No Subject'}
                    </CardTitle>
                  </div>
                  <div>
                    {getStatusBadge(message.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Sent on {formatDate(message.createdAt)}
                </p>

                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.message}
                </p>

                {message.status === 'replied' && (
                  <>
                    <Separator className="my-4" />

                    <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-semibold">Administrator Reply</h4>
                          <p className="text-xs text-muted-foreground">
                            {message.adminReplyDate ? formatDate(message.adminReplyDate) : 'Unknown date'}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm whitespace-pre-wrap pl-11 text-foreground/90">
                        {message.adminReply || 'Your message has been reviewed. Thank you for your feedback.'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserContactMessages;
