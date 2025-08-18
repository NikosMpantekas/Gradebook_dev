import React from 'react';
import { cn } from '../../lib/utils';

const Spinner = ({ size = 'default', className, ...props }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};

export { Spinner }; 