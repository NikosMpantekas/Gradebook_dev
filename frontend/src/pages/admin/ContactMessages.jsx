import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  MailOpen as MarkReadIcon,
  Mail as EmailIcon,
  CheckCircle as DoneIcon,
  RefreshCw as RefreshIcon,
  Reply as ReplyIcon,
  Trash2 as DeleteIcon,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const { user } = useSelector((state) => state.auth);
  // Remove MUI theme and media query dependencies

  // Check if user has proper permission (admin or superadmin)
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      setError('You do not have permission to access this page.');
      setLoading(false);
    } else {
      // Load messages on component mount
      fetchMessages();
    }
  }, [user]);

  // Fetch contact messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      console.log('[AdminContactMessages] Using API_URL for secure contact API call:', API_URL);
      const response = await axios.get(`${API_URL}/api/contact`, config);
      setMessages(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching contact messages:', err);
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  // Mark message as read/unread
  const handleToggleRead = async (id, currentReadStatus) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.put(`${API_URL}/api/contact/${id}`, { read: !currentReadStatus }, config);
      
      // Update local state
      setMessages(
        messages.map((msg) =>
          msg._id === id ? { ...msg, read: !currentReadStatus } : msg
        )
      );
    } catch (err) {
      console.error('Error updating message status:', err);
    }
  };

  // Update message status (new, read, replied)
  const updateMessageStatus = async (id, status, adminReply = null) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
      };

      // Create request body - include adminReply if provided
      const requestData = { status };
      if (adminReply !== null) {
        requestData.adminReply = adminReply;
      }

      console.log(`Updating message ${id} with:`, requestData);
      const response = await axios.put(`${API_URL}/api/contact/${id}`, requestData, config);
      
      // Update local state with ALL returned data, not just status
      setMessages(
        messages.map((msg) =>
          msg._id === id ? response.data : msg
        )
      );

      return response.data;
    } catch (err) {
      console.error('Error updating message status:', err);
      throw err; // Rethrow to allow caller to handle the error
    }
  };

  // Delete message function
  const handleDeleteMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.delete(`${API_URL}/api/contact/${messageId}`, config);
      
      // Remove message from local state
      setMessages(messages.filter(msg => msg._id !== messageId));
      
      // Close confirmation dialog
      setDeleteConfirmOpen(false);
      setMessageToDelete(null);
      
      alert('Message deleted successfully');
    } catch (err) {
      console.error('Error deleting message:', err);
      alert(`Error deleting message: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleOpenDeleteConfirm = (message) => {
    setMessageToDelete(message);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setMessageToDelete(null);
  };

  // Handle reply dialog
  const handleOpenReply = (message) => {
    setSelectedMessage(message);
    setReplyOpen(true);
    
    // Auto-populate with a template
    setReplyText(`Dear ${message.userName},\n\nThank you for your message regarding "${message.subject}".\n\n[Your response here]\n\nBest regards,\nGradeBook Administration Team`);
  };

  const handleCloseReply = () => {
    setReplyOpen(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText) return;

    try {
      // FIXED: Now sending the reply text to be saved in the database
      console.log('Sending reply:', replyText);
      await updateMessageStatus(selectedMessage._id, 'replied', replyText);
      
      // Show success message
      alert('Reply sent successfully');
      
      // Refresh messages to get the latest data
      await fetchMessages();
      
      // Close dialog
      handleCloseReply();
    } catch (err) {
      console.error('Error sending reply:', err);
      alert(`Error sending reply: ${err.message || 'Unknown error'}`);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMessages();
    }
  }, [user]);

  // Status badge variant mapping
  const getStatusVariant = (status) => {
    switch (status) {
      case 'new':
        return 'destructive';
      case 'read':
        return 'default';
      case 'replied':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading contact messages..." />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="w-full max-w-full p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contact Messages</h1>
          <p className="text-muted-foreground mt-1">
            View and respond to user feedback and support requests
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchMessages}
          className="w-full sm:w-auto"
        >
          <RefreshIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No contact messages yet
            </h3>
            <p className="text-muted-foreground">
              When users send messages, they will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card 
              key={message._id}
              className={`${!message.read ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <h3 className="text-lg font-semibold">{message.subject}</h3>
                    <Badge variant={getStatusVariant(message.status)} className="w-fit">
                      {message.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {message.createdAt ? format(new Date(message.createdAt), 'PPpp') : 'Date unknown'}
                  </p>
                </div>
                
                <p className="text-muted-foreground">
                  From: <strong>{message.userName}</strong> ({message.userRole}) - {message.userEmail}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <p className="whitespace-pre-wrap text-sm">
                    {message.message}
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleRead(message._id, message.read)}
                  className="w-full sm:w-auto"
                >
                  <MarkReadIcon className="mr-2 h-4 w-4" />
                  Mark as {message.read ? 'Unread' : 'Read'}
                </Button>
                
                {/* Show Approve/Deny for password reset requests */}
                {message.subject?.startsWith('[Password Reset]') ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => { /* no-op for now */ }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => { /* no-op for now */ }}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Deny
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleOpenReply(message)}
                      disabled={message.status === 'replied'}
                      className="w-full sm:w-auto"
                    >
                      <ReplyIcon className="mr-2 h-4 w-4" />
                      Reply
                    </Button>
                    
                    {/* Delete button - only for superadmin */}
                    {user?.role === 'superadmin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenDeleteConfirm(message)}
                        className="w-full sm:w-auto"
                      >
                        <DeleteIcon className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={(open) => !open && handleCloseReply()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to: {selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              You are replying to <strong>{selectedMessage?.userName}</strong> ({selectedMessage?.userEmail})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reply-text">Your Reply</Label>
              <Textarea
                id="reply-text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseReply}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendReply} 
              disabled={!replyText}
              className="w-full sm:w-auto"
            >
              Mark as Replied
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => !open && handleCloseDeleteConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message from <strong>{messageToDelete?.userName}</strong>?
              <br />
              Subject: <strong>{messageToDelete?.subject}</strong>
              <br /><br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseDeleteConfirm}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleDeleteMessage(messageToDelete?._id)}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactMessages;
