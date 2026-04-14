import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useSelector } from 'react-redux';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

const ContactDeveloper = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    isBugReport: false,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const { darkMode } = useSelector((state) => state.ui);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      setStatus({
        type: 'error',
        message: t('contactDeveloper.fillingRequired')
      });
      return;
    }

    try {
      setSending(true);
      setStatus(null);

      // Get token from storage for authentication
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

      if (!user || !user.token) {
        throw new Error(t('contactDeveloper.authRequired'));
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
        message: response.data.message || t('contactDeveloper.successMessage')
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
        message: error.response?.data?.message || t('contactDeveloper.errorMessage')
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
      <DialogContent className="max-w-md bg-card border-border shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">{t('contactDeveloper.title')}</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            {t('contactDeveloper.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{t('contactDeveloper.subject')}</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder={t('contactDeveloper.subjectPlaceholder')}
              disabled={sending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('contactDeveloper.message')}</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder={t('contactDeveloper.messagePlaceholder')}
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
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isBugReport: checked }))}
              disabled={sending}
            />
            <Label htmlFor="isBugReport" className="text-sm">
              {t('contactDeveloper.isBugReport')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2 ml-7">
            {t('contactDeveloper.bugReportHint')}
          </p>

          {status && (
            <div className={`p-3 rounded-lg ${status.type === 'success'
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
                  {t('contactDeveloper.sending')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('contactDeveloper.send')}
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
