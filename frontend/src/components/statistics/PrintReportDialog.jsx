import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';

const PrintReportDialog = ({ open, handleClose, onPrint, onFilterChange, filters }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Report Settings</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <Label>Target Type Filter</Label>
          <Select
            value={filters?.targetType || 'all'}
            onValueChange={(val) => onFilterChange('targetType', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="teacher">Teachers Only</SelectItem>
              <SelectItem value="subject">Subjects Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintReportDialog;
