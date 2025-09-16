import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useSelector } from 'react-redux';
import { cn } from '../../lib/utils';

const NotificationEditDialog = ({
  open,
  onClose,
  notification,
  editForm,
  onFormChange,
  onSave,
  isLoading
}) => {
  const { darkMode } = useSelector((state) => state.ui);
  
  const handleInputChange = (field) => (event) => {
    const value = field === 'isImportant' ? event.target.checked : event.target.value;
    onFormChange(field, value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-md transition-colors duration-100",
        darkMode 
          ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
          : "bg-background text-foreground border-border"
      )}>
        <DialogHeader>
          <DialogTitle>Edit Notification</DialogTitle>
          <DialogDescription>
            Make changes to your notification here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editForm.title}
              onChange={handleInputChange('title')}
              placeholder="Notification title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={editForm.message}
              onChange={handleInputChange('message')}
              placeholder="Notification message"
              rows={4}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="important"
              checked={editForm.isImportant}
              onCheckedChange={(checked) => onFormChange('isImportant', checked)}
            />
            <Label htmlFor="important">Mark as Important</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={!editForm.title || !editForm.message || isLoading}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationEditDialog;
