import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Spinner } from '../ui/spinner';

/**
 * A reusable loading state component
 * @param {Object} props - Component props
 * @param {string} [props.message="Loading..."] - Message to display while loading
 * @param {boolean} [props.fullPage=false] - Whether to display as a full page overlay
 * @param {string} [props.size="medium"] - Size of the loading spinner (small, medium, large)
 */
const LoadingState = ({ message = "Loading...", fullPage = false, size = "medium" }) => {
  // Determine spinner size based on the size prop
  const spinnerSize = {
    small: "h-6 w-6",
    medium: "h-10 w-10",
    large: "h-16 w-16"
  }[size] || "h-10 w-10";

  const content = (
    <div className={`flex flex-col justify-center items-center p-8 w-full ${
      fullPage ? 'min-h-[60vh]' : 'min-h-[200px]'
    }`}>
      <Spinner className={`${spinnerSize} text-primary`} />
      <h3 className="text-lg font-semibold mt-4 text-foreground">
        {message}
      </h3>
    </div>
  );

  // If it's a full page loading state, show it directly
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

export default LoadingState;
