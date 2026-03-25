import React from 'react';
import { Spinner } from '../ui/spinner';

/**
 * A full-screen loading component
 * @param {Object} props
 * @param {string} [props.message='Loading...'] - Optional message to display
 */
const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] w-full">
      <Spinner className="text-primary" />
      <h3 className="text-lg font-semibold mt-4 text-foreground">
        {message}
      </h3>
    </div>
  );
};

export default LoadingScreen;
