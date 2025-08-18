import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Database,
  Server,
  Globe,
  Shield,
  User,
  Settings,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { API_URL } from '../config/appConfig';

const DiagnosticPage = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['system', 'database', 'api', 'auth']));
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const { user, token } = useSelector((state) => state.auth);
  
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setError('');

      const results = {
        timestamp: new Date().toISOString(),
        system: await checkSystemInfo(),
        database: await checkDatabaseConnection(),
        api: await checkAPIEndpoints(),
        auth: await checkAuthStatus(),
        network: await checkNetworkConnectivity(),
        performance: await checkPerformanceMetrics()
      };

      setDiagnostics(results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setError('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/system/info`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'success',
          data: data,
          message: 'System information retrieved successfully'
        };
      } else {
        return {
          status: 'error',
          data: null,
          message: `Failed to get system info: ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Network error: ${error.message}`
      };
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/system/db-status`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'success',
          data: data,
          message: 'Database connection successful'
        };
      } else {
        return {
          status: 'error',
          data: null,
          message: `Database connection failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Database check failed: ${error.message}`
      };
    }
  };

  const checkAPIEndpoints = async () => {
    const endpoints = [
      '/api/users',
      '/api/grades',
      '/api/notifications',
      '/api/schools'
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`);
        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          message: response.ok ? 'OK' : `HTTP ${response.status}`
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'error', 
          ok: false,
          message: error.message
        });
      }
    }

    const allOk = results.every(r => r.ok);
    return {
      status: allOk ? 'success' : 'warning',
      data: results,
      message: allOk ? 'All API endpoints responding' : 'Some API endpoints have issues'
    };
  };

  const checkAuthStatus = async () => {
    if (!token) {
      return {
        status: 'error',
        data: null,
        message: 'No authentication token found'
      };
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
      const data = await response.json();
        return {
        status: 'success',
          data: data,
          message: 'Authentication token valid'
        };
      } else {
        return {
          status: 'error',
          data: null,
          message: 'Authentication token invalid or expired'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Auth check failed: ${error.message}`
      };
    }
  };

  const checkNetworkConnectivity = async () => {
    try {
      const startTime = performance.now();
      const response = await fetch(`${API_URL}/api/system/ping`);
      const endTime = performance.now();
      const latency = endTime - startTime;

      if (response.ok) {
        return {
          status: 'success',
          data: { latency: Math.round(latency) },
          message: `Network connectivity OK (${Math.round(latency)}ms)`
        };
      } else {
        return {
          status: 'error',
          data: null,
          message: `Network error: ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Network check failed: ${error.message}`
      };
    }
  };

  const checkPerformanceMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/system/performance`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'success',
          data: data,
          message: 'Performance metrics retrieved'
        };
      } else {
        return {
          status: 'warning',
          data: null,
          message: 'Performance metrics unavailable'
        };
      }
    } catch (error) {
      return {
        status: 'warning',
        data: null,
        message: 'Performance check failed'
      };
    }
  };

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const exportDiagnostics = () => {
    const dataStr = JSON.stringify(diagnostics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostics_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Running system diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">System Diagnostics</h1>
            <p className="text-muted-foreground">
              Comprehensive system health check and troubleshooting information
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportDiagnostics}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
            <Button onClick={runDiagnostics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Diagnostics
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Object.entries(diagnostics).map(([key, data]) => {
          if (key === 'timestamp') return null;
          
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{key}</CardTitle>
                  {getStatusIcon(data.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {data.status === 'success' ? '✓' : data.status === 'warning' ? '⚠' : '✗'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.message}
                </p>
          </CardContent>
        </Card>
          );
        })}
      </div>

      {/* Detailed Results */}
      <div className="space-y-4">
        {Object.entries(diagnostics).map(([key, data]) => {
          if (key === 'timestamp') return null;
          
          return (
            <Collapsible key={key} open={expandedSections.has(key)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(data.status)}
                        <CardTitle className="capitalize">{key} Status</CardTitle>
                        <Badge variant="outline" className={getStatusColor(data.status)}>
                          {data.status}
                        </Badge>
                      </div>
                      {expandedSections.has(key) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Status Message</h4>
                        <p className="text-sm text-muted-foreground">{data.message}</p>
                      </div>
                      
                      {data.data && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Data</h4>
          <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSensitiveData(!showSensitiveData)}
                            >
                              {showSensitiveData ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
          </Button>
                          </div>
                          
                          {showSensitiveData ? (
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(data.data, null, 2)}
                            </pre>
                          ) : (
                            <div className="bg-muted p-3 rounded text-xs">
                              <p className="text-muted-foreground">
                                Data available - click eye icon to view
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Timestamp */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>Diagnostics run at: {diagnostics.timestamp}</p>
      </div>
    </div>
  );
};

export default DiagnosticPage;
