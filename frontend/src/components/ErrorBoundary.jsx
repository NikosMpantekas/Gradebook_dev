import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error boundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="m-4 p-6 text-center border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">
              Something went wrong
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-foreground">
              There was an error in the {this.props.componentName || 'component'}.
            </p>
            
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {this.state.error.toString()}
              </p>
            )}
            
            <Button 
              onClick={() => window.location.href = '/app/admin/dashboard'}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
