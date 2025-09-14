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
      html {
        height: 100%;
        overflow-x: hidden;
        /* Fix iOS overscroll background color */
        background-color: #181b20 !important;
      }
      
      body {
        min-height: 100%;
        height: auto;
        overflow-y: auto !important;
        overflow-x: hidden;
        /* Fix iOS overscroll background color */
        background-color: #181b20 !important;
      }
      
      #root {
        min-height: 100%;
        height: auto;
        overflow-x: hidden;
        /* Fix iOS overscroll background color */
        background-color: #181b20 !important;
      }
      
      /* Dynamic background color for light/dark mode support */
      @media (prefers-color-scheme: light) {
        html, body, #root {
          background-color: #f5f6fa !important;
        }
      }
      
      @media (prefers-color-scheme: dark) {
        html, body, #root {
          background-color: #181b20 !important;
        }
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
      
      /* iOS PWA specific fixes for overscroll */
      @supports (-webkit-touch-callout: none) {
        /* iOS Safari specific - preserve fixed positioning */
        html {
          position: relative;
          height: 100%;
          background-color: inherit;
          overscroll-behavior: none;
        }
        
        body {
          position: relative;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
          /* Remove background-attachment: fixed as it can interfere with positioning */
        }
        
        #root {
          position: relative;
          overscroll-behavior: none;
          background-color: inherit;
        }
        
        /* Ensure fixed headers work properly on iOS */
        header[class*="fixed"] {
          position: -webkit-sticky !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 50 !important;
        }
      }
      
      /* PWA specific fixes */
      @media (display-mode: standalone) {
        html {
          position: relative;
          height: 100%;
          overscroll-behavior: none !important;
        }
        
        body {
          position: relative;
          overscroll-behavior: none !important;
          -webkit-overflow-scrolling: touch;
        }
        
        #root {
          position: relative;
          overscroll-behavior: none !important;
        }
        
        /* Preserve sticky/fixed headers in PWA mode */
        header[class*="fixed"] {
          position: -webkit-sticky !important;
          position: sticky !important;
          top: 0 !important;
        }
      }
      
      /* Fix for any remaining Material-UI classes that might exist */
      .MuiBox-root, .MuiContainer-root, .MuiPaper-root {
        max-height: none !important;
        overflow: visible !important;
      }
      
      .MuiFormControl-root {
        margin-bottom: 12px !important;
      }
      
      .MuiMenuItem-root {
        padding: 12px 16px !important;
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
