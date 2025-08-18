import React, { useState } from 'react';
import { X, Send, Bug } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const ContactDeveloper = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    isBugReport: false,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      setStatus({ 
        type: 'error', 
        message: 'Please fill out all fields' 
      });
      return;
    }

    try {
      setSending(true);
      setStatus(null);
      
      // Get token from storage for authentication
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      
      if (!user || !user.token) {
        throw new Error('You must be logged in to send a message');
      }
      
      // Create the request configuration with the auth token
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      };
      
      // Send the message to the backend API with secure HTTPS in production
      console.log('[ContactDeveloper] Using API_URL for secure contact API call:', API_URL);
      const response = await axios.post(`${API_URL}/api/contact`, formData, config);
      
      console.log('Contact form submission response:', response.data);

      setStatus({
        type: 'success',
        message: response.data.message || 'Your message has been sent. We will review it as soon as possible.'
      });

      // Reset form after successful submission
      setFormData({ subject: '', message: '', isBugReport: false });
      
      // Close the dialog after 3 seconds on success
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send message. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  return (
    <Dialog open={open} onOpenChange={!sending ? onClose : undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Contact Developer</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={sending}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Send us a message, report a bug, or request a feature
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief description of your message"
              disabled={sending}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Please provide detailed information..."
              rows={4}
              disabled={sending}
              required
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBugReport"
              name="isBugReport"
              checked={formData.isBugReport}
              onChange={handleChange}
              disabled={sending}
            />
            <Label htmlFor="isBugReport" className="text-sm">
              This is a bug report
            </Label>
          </div>
          
          {status && (
            <div className={`p-3 rounded-lg ${
              status.type === 'success' 
                ? 'bg-green-100 border border-green-200 text-green-800' 
                : 'bg-red-100 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{status.message}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDeveloper;
