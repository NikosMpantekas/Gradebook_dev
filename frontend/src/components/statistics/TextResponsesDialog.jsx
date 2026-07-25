import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const TextResponsesDialog = ({ open, handleClose, responses, question }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Text Responses for: {question}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72 rounded-md border p-4 my-2">
          {responses && responses.length > 0 ? (
            responses.map((resp, index) => (
              <React.Fragment key={index}>
                <div className="py-2 text-sm text-foreground">{resp}</div>
                {index < responses.length - 1 && <Separator />}
              </React.Fragment>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No text responses available.</p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TextResponsesDialog;
