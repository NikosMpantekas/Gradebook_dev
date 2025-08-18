import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { 
  ChevronDown,
  ChevronUp,
  Bug,
  Reply,
  Mail,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const BugReportsPanel = ({ openContactForm }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchUserMessages = async () => {
      if (!user || !user.token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        };
        
        console.log('[BugReportsPanel] Using API_URL for secure contact API call:', API_URL);
        const response = await axios.get(`${API_URL}/api/contact/user`, config);
        console.log('User messages retrieved:', response.data.length);
        
        // Sort by creation date, newest first
        const sortedMessages = response.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        setMessages(sortedMessages);
      } catch (err) {
        console.error('Error fetching user messages:', err);
        setError('Failed to load your messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserMessages();
  }, [user]);
  
  const markReplyAsRead = async (messageId) => {
    if (!user || !user.token) return;
    
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        }
      };
      
      await axios.put(`/api/contact/user/${messageId}/read`, {}, config);
      
      // Update local state to reflect the change
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === messageId 
            ? { ...msg, replyRead: true } 
            : msg
        )
      );
    } catch (err) {
      console.error('Error marking reply as read:', err);
    }
  };
  
  const toggleExpanded = (messageId) => {
    if (expandedId === messageId) {
      setExpandedId(null);
    } else {
      setExpandedId(messageId);
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Bug Reports & Messages</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            You haven't sent any messages yet.
          </p>
          <Button onClick={openContactForm}>
            <Mail className="mr-2 h-4 w-4" />
            Send First Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-5 w-5" />
          <span>Bug Reports & Messages</span>
          <Badge variant="secondary">{messages.length}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message._id} className="border rounded-lg overflow-hidden">
              <Collapsible open={expandedId === message._id}>
                <CollapsibleTrigger asChild>
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpanded(message._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {message.isBugReport ? (
                          <Bug className="h-5 w-5 text-destructive" />
                        ) : (
                          <Mail className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex flex-col items-start">
                          <h4 className="font-semibold text-foreground">
                            {message.subject}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusLabel(message.status)}
                        </Badge>
                        {message.adminReply && !message.replyRead && (
                          <Badge variant="destructive">New Reply</Badge>
                        )}
                        {expandedId === message._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4">
                    <div>
                      <h5 className="font-medium text-foreground mb-2">Your Message</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>
                    
                    {message.adminReply && (
                      <div>
                        <h5 className="font-medium text-foreground mb-2 flex items-center space-x-2">
                          <Reply className="h-4 w-4" />
                          <span>Admin Reply</span>
                          {!message.replyRead && (
                            <Badge variant="outline" className="text-xs">
                              Unread
                            </Badge>
                          )}
                        </h5>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {message.adminReply}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Replied {formatDistanceToNow(new Date(message.adminReplyDate || message.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {!message.replyRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReplyAsRead(message._id)}
                            className="mt-2"
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <Button onClick={openContactForm}>
            <Mail className="mr-2 h-4 w-4" />
            Send New Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BugReportsPanel;
