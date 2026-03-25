import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import {
  Settings,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { useSelector } from 'react-redux';

/**
 * System Maintenance Panel
 * UPDATED: Removed all previous content as requested
 * Now only contains the "Fix School Permissions" button functionality
 */
const SystemMaintenance = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { toast } = useToast();
  
  // State management - moved to top before any conditional returns
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Additional security check - ensure only superadmins can access
  if (!user || user.role !== 'superadmin') {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. Superadmin privileges required to access system maintenance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Fix school permissions - the only function in this panel
  const fixSchoolPermissions = async () => {
    try {
      setLoading(true);
      setResults(null);

      console.log('Starting school permissions fix...');

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Call the fix school permissions endpoint
      const response = await axios.post(`${API_URL}/api/school-permissions/fix`, {}, config);

      if (response.data && response.data.success) {
        const { processed, created, errors, totalSchools } = response.data.data;
        
        setResults({
          processed,
          created,
          errors,
          totalSchools,
          message: response.data.message
        });
        
        toast({
          title: 'Success',
          description: response.data.message,
          variant: 'default'
        });
        console.log('School permissions fix completed successfully:', response.data.data);
        
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fix school permissions',
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Error fixing school permissions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fix school permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          System Maintenance
        </h1>
        <p className="text-muted-foreground">
          System maintenance tools for managing school permissions
        </p>
      </div>

      {/* Main Content - Only Fix School Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Fix School Permissions
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Scan all schools and create missing permission entries
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm mb-4">
              This tool will scan all schools in the database and create missing entries 
              in the school permissions system. All features will be set to enabled by default 
              for new entries.
            </p>
            
            <p className="text-sm font-medium text-muted-foreground mb-3">
              What this does:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Scans all schools in the database</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Creates missing permission entries</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Sets all features to enabled by default</span>
              </div>
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm">Provides detailed feedback on the process</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            {/* Fix Button */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={fixSchoolPermissions}
                disabled={loading}
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing Permissions...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Fix School Permissions
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <Card className="mt-6 border">
              <CardHeader>
                <CardTitle>Fix Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">Summary:</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {results.totalSchools} Total Schools
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {results.processed} Processed
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {results.created} Created
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={results.errors?.length > 0 ? 
                        "bg-red-50 text-red-700 border-red-200" : 
                        "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {results.errors?.length || 0} Errors
                    </Badge>
                  </div>
                </div>

                {results.errors && results.errors.length > 0 && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-red-600 mb-2">
                      Errors encountered:
                    </h5>
                    <div className="space-y-2">
                      {results.errors.map((error, index) => (
                        <div key={index} className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                          <div>
                            <div className="font-medium">{error.schoolName || error.schoolId}</div>
                            <div className="text-sm text-muted-foreground">{error.error}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.created > 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <span className="font-semibold">Next Steps:</span> You can now manage individual school permissions 
                      through the SuperAdmin → School Permissions panel.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Footer Information */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold">Note:</span> This system maintenance panel now only contains the school permissions 
            fix functionality. All other maintenance tools have been removed as part of the new 
            comprehensive permission control system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMaintenance;
