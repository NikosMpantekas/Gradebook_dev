import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * A reusable error state component
 * @param {Object} props - Component props
 * @param {string} [props.message="Something went wrong"] - Error message to display
 * @param {boolean} [props.fullPage=false] - Whether to display as a full page overlay
 * @param {Function} [props.onRetry=null] - Retry function to call when retry button is clicked
 * @param {string} [props.retryText="Try Again"] - Text for the retry button
 */
const ErrorState = ({ 
  message = "Something went wrong", 
  fullPage = false, 
  onRetry = null,
  retryText = "Try Again"
}) => {
  const content = (
    <div className={`flex flex-col justify-center items-center p-8 w-full ${
      fullPage ? 'min-h-[60vh]' : 'min-h-[200px]'
    }`}>
      <AlertCircle className="h-16 w-16 text-destructive" />
      <h3 className="text-lg font-semibold mt-4 text-center text-foreground">
        {message}
      </h3>
      {onRetry && (
        <Button 
          variant="default" 
          onClick={onRetry}
          className="mt-6"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryText}
        </Button>
      )}
    </div>
  );

  // If it's a full page error state, show it directly
  if (fullPage) {
    return content;
  }

  // Otherwise wrap it in a Card component
  return (
    <Card className="rounded-lg overflow-hidden">
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
};

export default ErrorState;
