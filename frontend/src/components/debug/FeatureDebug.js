import React from 'react';
import { useFeatureToggles } from '../../context/FeatureToggleContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const FeatureDebug = () => {
  // Get the features from the context
  const { features, loading, error } = useFeatureToggles();

  return (
    <Card className="m-4 max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Feature Toggle Debug</span>
          <Badge variant="outline">Debug</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading features...</p>
        ) : error ? (
          <p className="text-destructive">Error loading features: {error}</p>
        ) : (
          <div className="space-y-3">
            <p className="font-medium">Available Features:</p>
            <pre className="p-3 bg-muted rounded-lg overflow-auto max-h-80 text-xs font-mono">
              {JSON.stringify(features, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureDebug;
