import React from 'react';
import { AlertTriangle, ChevronDown, Bug, Search, RotateCcw, Home, Copy, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

/**
 * ENHANCED ERROR BOUNDARY
 * Comprehensive error catching and detailed logging for easier debugging
 * Provides detailed error reports in both development and production
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      errorLocation: null,
      errorTime: null,
      stackParsed: false,
      errorType: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  // Parse the minified stack trace to find useful information
  parseMinifiedStack(error, errorInfo) {
    try {
      const errorStack = error.stack || '';
      const componentStack = errorInfo.componentStack || '';
      
      // Try to identify the error type
      let errorType = 'Unknown Error';
      if (error.name) {
        errorType = error.name;
      }
      
      // Check for common error patterns
      if (errorStack.includes('TypeError') && errorStack.includes('undefined')) {
        if (errorStack.includes('is not a function')) {
          errorType = 'Function Not Found Error';
        } else {
          errorType = 'Undefined Value Error';
        }
      }
      
      // Try to find the function name where the error occurred
      let errorLocation = 'Unknown';
      const functionMatch = errorStack.match(/at ([\w.<>]+)/);
      if (functionMatch && functionMatch[1]) {
        errorLocation = functionMatch[1];
      }
      
      // Extract React component information
      let componentInfo = [];
      const componentLines = componentStack.split('\n').filter(line => line.trim() !== '');
      componentInfo = componentLines.map(line => {
        const match = line.match(/in ([\w]+)/); 
        return match ? match[1] : line.trim();
      }).filter(Boolean);
      
      // Look for a possible undefined function call
      let possibleUndefinedCall = '';
      if (error.message && error.message.includes('undefined')) {
        const matches = error.message.match(/([\w.]+)\(\.\.\.[\s\S]*is undefined/i);
        if (matches && matches[1]) {
          possibleUndefinedCall = matches[1];
        } else if (error.message.includes('x(...) is undefined') || error.message.includes('y(...) is undefined')) {
          possibleUndefinedCall = 'Minified function call (likely a Redux action or selector)';
        }
      }
      
      return {
        errorType,
        errorLocation,
        componentPath: componentInfo.join(' → '),
        possibleUndefinedCall,
        isReduxError: errorStack.includes('dispatch') || componentStack.includes('Provider') || possibleUndefinedCall.includes('Redux')
      };
    } catch (parsingError) {
      console.error('Error while parsing error stack:', parsingError);
      return { 
        errorType: 'Error Parsing Failed',
        errorLocation: 'Unknown',
        componentPath: 'Unknown',
        possibleUndefinedCall: 'Unknown',
        isReduxError: false
      };
    }
  }

  componentDidCatch(error, errorInfo) {
    // Get current time for the error
    const errorTime = new Date().toISOString();
    
    // Parse the error stack for better debugging
    const errorDetails = this.parseMinifiedStack(error, errorInfo);
    
    // Log the error with detailed information
    console.error('🚨 ERROR BOUNDARY CAUGHT AN ERROR:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      errorDetails,
      errorTime,
      componentName: this.props.componentName || 'Unknown Component',
      location: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // Update state with error information
    this.setState({
      error,
      errorInfo,
      errorDetails,
      errorTime,
      stackParsed: true
    });
    
    // Log to external service if available (e.g., Sentry, LogRocket)
    if (window.logErrorToService) {
      try {
        window.logErrorToService(error, errorInfo, errorDetails);
      } catch (loggingError) {
        console.error('Failed to log error to external service:', loggingError);
      }
    }
  }

  copyErrorDetailsToClipboard = () => {
    const errorDetails = {
      error: this.state.error?.toString(),
      errorInfo: this.state.errorInfo?.componentStack,
      errorDetails: this.state.errorDetails,
      errorTime: this.state.errorTime,
      componentName: this.props.componentName,
      location: window.location.href,
      userAgent: navigator.userAgent
    };
    
    const errorText = JSON.stringify(errorDetails, null, 2);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText).then(() => {
        // You could add a toast notification here
        console.log('Error details copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy error details:', err);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('Error details copied to clipboard (fallback method)');
    }
  };
  
  render() {
    if (this.state.hasError) {
      const { errorDetails, isReduxError } = this.state;
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600 mb-2">
                Something went wrong
              </CardTitle>
              <p className="text-gray-600">
                {this.props.componentName ? 
                  `An error occurred in the ${this.props.componentName} component.` : 
                  'An unexpected error occurred.'
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
            {/* Error Summary */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Summary</h3>
                {errorDetails?.errorType && (
                  <p className="text-sm text-red-700 mb-2">
                    <strong>Error Type:</strong> {errorDetails.errorType}
                  </p>
                )}
                
                {errorDetails?.errorLocation && (
                  <p className="text-sm text-red-700 mb-2">
                    <strong>Error Location:</strong> {errorDetails.errorLocation}
                  </p>
              )}
              
              {errorDetails?.componentPath && (
                  <p className="text-sm text-red-700 mb-2">
                  <strong>Component Path:</strong> {errorDetails.componentPath}
                  </p>
              )}
              
              {isReduxError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                    <p className="text-sm text-yellow-800">
                    <strong>Redux Error Detected:</strong> This appears to be an issue with Redux state management.
                    Likely causes include missing action exports or selectors.
                    </p>
                  </div>
              )}
              </div>
            
            {/* Technical Details (collapsible) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center">
                      <Bug className="mr-2 w-4 h-4" />
                      Technical Details
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                {this.state.error && (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <p className="text-sm font-medium text-red-600 mb-2">
                      Error: {this.state.error.toString()}
                      </p>
                    {this.state.errorInfo && (
                        <pre className="text-xs text-gray-700 mt-2 overflow-auto max-h-48 bg-white p-2 rounded border">
                        {this.state.errorInfo.componentStack}
                        </pre>
                    )}
                    </div>
                )}
                </CollapsibleContent>
              </Collapsible>
            
            {/* Suggestions for fixing */}
            {isReduxError && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Search className="mr-2 w-4 h-4" />
                        Suggested Fixes
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Check if all reducers in Redux slices are properly exported</li>
                      <li>Verify that <code>ensureValidData</code> action is exported from directionSlice.js</li>
                      <li>Ensure no dynamic imports or requires are used in component code</li>
                      <li>Look for typos in imported action names</li>
                    </ol>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
            )}
            
            {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
              <Button 
                onClick={() => window.location.href = '/'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                  <Home className="mr-2 w-4 h-4" />
                Go to Home
              </Button>
              <Button 
                  variant="outline"
                onClick={() => window.location.reload()}
              >
                  <RefreshCw className="mr-2 w-4 h-4" />
                Reload Page
              </Button>
              <Button 
                  variant="outline"
                onClick={this.copyErrorDetailsToClipboard}
              >
                  <Copy className="mr-2 w-4 h-4" />
                Copy Error Details
              </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
