import React from 'react';
import { useSelector } from 'react-redux';
import { cn } from '../../lib/utils';
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
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { DatePicker } from '../ui/date-picker';
import { Calendar, User, GraduationCap, FileText, Hash } from 'lucide-react';

/**
 * Edit Grade Dialog Component
 */
export const EditGradeDialog = ({
  open,
  handleClose,
  editGradeData,
  handleEditChange,
  handleEditSave,
  subjects,
  user
}) => {
  const { darkMode } = useSelector((state) => state.ui);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-md transition-colors duration-100",
        darkMode 
          ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
          : "bg-background text-foreground border-border"
      )}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle>Edit Grade</DialogTitle>
          </div>
          <DialogDescription>
            Update the grade information below. Student and subject cannot be changed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Grade Value */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <Label htmlFor="value">Grade Value</Label>
            </div>
            <Input
              id="value"
              name="value"
              type="number"
              value={editGradeData.value || ''}
              onChange={handleEditChange}
              min={0}
              max={100}
              placeholder="Enter grade (0-100)"
              className="w-full"
            />
          </div>
          
          {/* Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Label htmlFor="date">Date</Label>
            </div>
            {/* Mobile: Native date input */}
            <div className="block sm:hidden">
              <Input
                id="date"
                name="date"
                type="date"
                value={editGradeData.date ? new Date(editGradeData.date).toISOString().split('T')[0] : ''}
                onChange={handleEditChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full min-w-0"
                style={{ WebkitAppearance: 'none' }}
                inputMode="none"
              />
            </div>
            {/* Desktop: Beautiful DatePicker */}
            <div className="hidden sm:block">
              <DatePicker
                placeholder="Select date"
                value={editGradeData.date ? new Date(editGradeData.date).toISOString().split('T')[0] : ''}
                onChange={(value) => handleEditChange({ target: { name: 'date', value } })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Description - only if teacher has permission */}
          {user?.canAddGradeDescriptions !== false && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <Label htmlFor="description">Description</Label>
              </div>
              <Textarea
                id="description"
                name="description"
                value={editGradeData.description || ''}
                onChange={handleEditChange}
                placeholder="Add any notes or feedback..."
                rows={3}
                className="w-full"
              />
            </div>
          )}
          
          <Separator />
          
          {/* Read-only Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Grade Information</h4>
            
            {/* Student - readonly */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Student</Label>
                <p className="text-sm font-medium">{editGradeData.studentName || 'Unknown Student'}</p>
              </div>
            </div>
            
            {/* Subject - readonly */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="text-sm font-medium">{editGradeData.subjectName || 'Unknown Subject'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSave}
            disabled={!editGradeData.value}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Delete Grade Dialog Component
 */
export const DeleteGradeDialog = ({
  open,
  handleClose,
  handleConfirm,
  gradeToDelete
}) => {
  const { darkMode } = useSelector((state) => state.ui);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-md transition-colors duration-100",
        darkMode 
          ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
          : "bg-background text-foreground border-border"
      )}>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this grade? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {gradeToDelete && (
          <div className="py-4">
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div><strong>Student:</strong> {gradeToDelete.student?.name || 'Unknown'}</div>
              <div><strong>Subject:</strong> {gradeToDelete.subject?.name || 'Unknown'}</div>
              <div><strong>Value:</strong> <Badge variant="secondary">{gradeToDelete.value || 'N/A'}</Badge></div>
              <div><strong>Date:</strong> {gradeToDelete.date ? new Date(gradeToDelete.date).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Reusable DateInput component
 */
export const DateInput = ({ value, onChange, label, disabled }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="date">{label || "Date"}</Label>
      <Input
        id="date"
        type="date"
        value={value ? new Date(value).toISOString().split('T')[0] : ''}
        onChange={onChange}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
};
