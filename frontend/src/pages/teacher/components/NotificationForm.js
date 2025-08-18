import React from 'react';
import { 
  Type,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

/**
 * NotificationForm component handles the basic notification form fields
 * Simplified to include only title, message, and importance toggle
 * Recipients are handled by the separate NotificationRecipients component
 */
const NotificationForm = ({
  formData,
  errors,
  onChange,
  disabled
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <CardTitle>Notification Details</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Title Field */}
        <div className="space-y-2">
          <Label htmlFor="title" className="flex items-center space-x-2">
            <Type className="h-4 w-4" />
            <span>Notification Title *</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={onChange}
            disabled={disabled}
            placeholder="e.g., Important Class Update, Assignment Reminder..."
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter a clear, descriptive title for your notification
          </p>
        </div>

        {/* Message Field */}
        <div className="space-y-2">
          <Label htmlFor="message" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Notification Message *</span>
          </Label>
          <Textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={onChange}
            disabled={disabled}
            placeholder="Enter your notification message here..."
            rows={4}
            className={errors.message ? 'border-destructive' : ''}
          />
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Write your notification message. Be clear and concise.
          </p>
        </div>

        {/* Importance Toggle */}
        <div className="flex items-center space-x-3">
          <Switch
            id="isImportant"
            name="isImportant"
            checked={formData.isImportant}
            onCheckedChange={(checked) => onChange({
              target: { name: 'isImportant', checked }
            })}
            disabled={disabled}
          />
          <Label htmlFor="isImportant" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>Mark as Important</span>
          </Label>
        </div>
        
        {formData.isImportant && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning-foreground">
              Important notifications will be highlighted and may be prioritized in delivery.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationForm;
