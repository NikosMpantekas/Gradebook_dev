/**
 * Global scroll fix component
 * This component injects CSS fixes to ensure proper scrolling works throughout the application
 */
import React, { useEffect } from 'react';

const ScrollFix = () => {
  useEffect(() => {
    // Apply global scroll fixes when component mounts
    const style = document.createElement('style');
    style.textContent = `
      /* Critical scroll fixes */
      body, html, #root {
        min-height: 100%;
        height: auto !important;
        overflow-y: auto !important;
        overflow-x: hidden;
      }
      
      /* Fix for shadcn/ui containers that might block scrolling */
      .scroll-fix, .container, .card {
        max-height: none !important;
        overflow: visible !important;
      }
      
      /* Fix for main content area */
      main {
        overflow-y: auto !important;
        min-height: calc(100vh - 64px);
      }
      
      /* Ensure inputs and select boxes are properly accessible */
      .form-control {
        margin-bottom: 12px !important;
      }
      
      /* Improve dropdown visibility */
      .dropdown-item {
        padding: 12px 16px !important;
      }
      
      /* Better form layout */
      form {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
      }
      

    `;

    document.head.appendChild(style);

    return () => {
      // Clean up when component unmounts
      document.head.removeChild(style);
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ScrollFix;
