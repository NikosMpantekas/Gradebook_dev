import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Frown } from 'lucide-react';

/**
 * EmptyState component to display when there's no data available
 * @param {Object} props Component props
 * @param {string} props.title Title to display
 * @param {string} props.description Description text
 * @param {React.ReactNode} props.icon Icon to display (optional)
 * @param {string} props.actionText Text for action button (optional)
 * @param {Function} props.onAction Callback for action button (optional)
 */
const EmptyState = ({ 
  title = 'No Data Available', 
  description = 'There is no data to display at this time.', 
  icon, 
  actionText, 
  onAction 
}) => {
  return (
    <Card className="p-8 text-center border-dashed border-border bg-background">
      <div className="mb-4">
        {icon || <Frown className="h-16 w-16 text-muted-foreground mx-auto" />}
      </div>
      
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        {description}
      </p>
      
      {actionText && onAction && (
        <Button 
          variant="outline" 
          onClick={onAction}
          className="mt-2"
        >
          {actionText}
        </Button>
      )}
    </Card>
  );
};

export default EmptyState;
