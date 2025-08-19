import React, { useState } from 'react';
import { 
  ChevronDown,
  Bug,
  Mail,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const UserMessagesList = ({ messages }) => {
  const [expandedMessage, setExpandedMessage] = useState(null);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          You haven't sent any messages yet.
        </p>
      </div>
    );
  }

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

  const toggleMessage = (messageId) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  return (
    <div className="space-y-4 mt-4">
      {messages.map((message) => (
        <Card key={message._id} className="overflow-hidden border-2 border-gray-600 dark:border-gray-400">
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
                    ) : (
                      <Mail className="h-5 w-5 text-primary" />
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
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      expandedMessage === message._id ? 'rotate-180' : ''
                    }`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Message</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>
                  
                  {message.adminReply && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Admin Reply</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-foreground">
                          {message.adminReply}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Sent: {new Date(message.createdAt).toLocaleDateString()}
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
