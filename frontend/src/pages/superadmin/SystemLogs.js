import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { useSelector } from 'react-redux';
import { RefreshCw, Copy, Server, AlertCircle, Info, Loader2, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';

const SystemLogs = () => {
  const { user } = useSelector((state) => state.auth);
  const token = user?.token;

  // State management (optimized for memory)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all'
  });
  const [availableLevels, setAvailableLevels] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 100;
  const logsContainerRef = useRef(null);

  // Load logs
  const loadLogs = async (resetPage = false) => {
    if (!token || token === 'null' || token === 'undefined') return;

    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          ...filters
        }
      };

      const response = await axios.get(`${API_URL}/api/superadmin/logs`, config);

      if (response.data && response.data.success) {
        const newLogs = response.data.data.logs;
        setLogs(newLogs);
        if (resetPage) setCurrentPage(0);

        setAvailableLevels(response.data.data.availableLevels);
        setAvailableCategories(response.data.data.availableCategories);
        setStats({
          totalFiles: response.data.data.totalFiles,
          totalLines: response.data.data.totalLines,
          filteredLines: response.data.data.filteredLines
        });
      } else {
        setError('Failed to load logs');
      }

    } catch (error) {
      console.error('Error loading logs:', error);
      setError(error.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    // Show button when scrolled down more than 100px from the top
    setShowJumpToLatest(scrollTop > 100);
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs(false);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, token, filters]);

  // Load data when component mounts, token becomes available, or filters change
  useEffect(() => {
    if (!token || token === 'null' || token === 'undefined') return;

    loadLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token]);

  // Parse ANSI color codes and convert to React styles
  const parseAnsiColors = (text) => {
    if (!text) return text;
    // Simple ANSI color parsing (can be enhanced with a library like ansi-to-react)
    const ansiRegex = /\x1b\[(\d+(?:;\d+)*)?m/g;
    return text.replace(ansiRegex, '');
  };

  // Format timestamp for console display (Netlify style but with date)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const options = {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('en-US', options);
      }
    } catch (err) { }

    const timestampMatch = timestamp.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (timestampMatch) {
      try {
        const date = new Date(timestampMatch[1]);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', options);
        }
      } catch (err2) { }
    }

    const isoMatch = timestamp.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
    if (isoMatch) {
      try {
        const date = new Date(isoMatch[1]);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', options);
        }
      } catch (err2) { }
    }

    const dateMatch = timestamp.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    if (dateMatch) {
      try {
        const date = new Date(dateMatch[1].replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', options);
        }
      } catch (err2) { }
    }

    return new Date().toLocaleString('en-US', options);
  };

  // Copy log line to clipboard
  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getLevelStyles = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'INFO':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'DEBUG':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getLogTextColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'text-red-400';
      case 'WARN':
        return 'text-amber-400';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className="w-full p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
        <p className="text-muted-foreground mt-2">
          Monitor system performance and error logs
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Filters */}
        <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-6">
          <Card className="w-full sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <Select
                    value={filters.level}
                    onValueChange={(value) => setFilters({ ...filters, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Log Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {availableLevels.map((level) => (
                        <SelectItem key={level} value={level.toLowerCase()}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full">
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-border mt-2">
                  <Button
                    variant="outline"
                    onClick={() => loadLogs()}
                    disabled={loading}
                    className="gap-2 w-full"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>

                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="gap-2 w-full"
                  >
                    {autoRefresh ? 'Stop Auto' : 'Auto Refresh'}
                  </Button>
                </div>
              </div>

              {/* Stats */}
              {stats.totalFiles > 0 && (
                <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground border-t border-border pt-4">
                  <div className="flex justify-between items-center"><span>Files:</span> <span className="font-mono text-zinc-300">{stats.totalFiles}</span></div>
                  <div className="flex justify-between items-center"><span>Total Lines:</span> <span className="font-mono text-zinc-300">{stats.totalLines}</span></div>
                  <div className="flex justify-between items-center text-blue-500 font-medium"><span>Filtered:</span> <span className="font-mono">{stats.filteredLines}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Console Display */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Alerts */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-4 flex items-center gap-3 text-destructive border border-destructive/20">
              <AlertCircle className="w-5 h-5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {/* Console Display */}
          <Card className="w-full overflow-hidden border-zinc-800 bg-[#1e1e1e]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#252526] text-zinc-300">
              <div className="flex items-center gap-2 font-mono text-sm">
                <Server className="w-4 h-4" />
                System Logs (Last 24 hours)
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
            </div>

            {logs.length === 0 ? (
              <div className="h-[600px] w-full flex flex-col items-center justify-center text-zinc-500 text-sm p-4">
                <Info className="w-8 h-8 mb-3 opacity-50" />
                {loading ? 'Loading logs...' : (
                  <p className="max-w-[400px] text-center px-4">
                    {filters.level !== 'all' || filters.category !== 'all'
                      ? 'No logs match your current filters. Try adjusting your filters and refresh.'
                      : 'No logs found. Make sure log files exist in the backend logs directory.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={logsContainerRef}
                  onScroll={handleScroll}
                  className="h-[600px] overflow-auto font-mono text-[13px] leading-relaxed py-2 font-medium"
                >
                  {logs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((log, index) => {
                    const logText = parseAnsiColors(log.message || log.raw || '');
                    const timestamp = formatTimestamp(log.timestamp || logText);
                    const levelStyles = getLevelStyles(log.level);
                    const textColor = getLogTextColor(log.level);
                    const absoluteIndex = currentPage * itemsPerPage + index + 1;

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 px-4 py-0.5 hover:bg-white/5 group"
                      >
                        <span className="text-zinc-600 min-w-[35px] text-right select-none">
                          {absoluteIndex}
                        </span>
                        <span className="text-zinc-500 whitespace-nowrap select-none">
                          {timestamp}
                        </span>
                        {log.level && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border min-w-[60px] text-center select-none ${levelStyles}`}>
                            {log.level}
                          </span>
                        )}
                        <span className={`flex-1 break-words whitespace-pre-wrap ${textColor}`}>
                          {log.category ? `[${log.category}] ` : ''}{logText}
                        </span>
                        <button
                          onClick={() => copyToClipboard(`${timestamp}: ${logText}`, index)}
                          className={`p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${copiedIndex === index ? 'text-green-400 bg-green-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/10'
                            }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Jump to Latest Button */}
                {showJumpToLatest && currentPage === 0 && (
                  <Button
                    size="sm"
                    onClick={scrollToTop}
                    className="absolute bottom-16 right-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-full py-5 px-4"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Latest Logs
                  </Button>
                )}

                {/* Pagination Controls */}
                <div className="p-3 border-t border-zinc-800 flex items-center justify-between bg-[#252526]">
                  <div className="text-zinc-500 text-[11px] font-mono select-none flex items-center gap-4">
                    <span>Page {currentPage + 1} of {Math.max(1, Math.ceil(logs.length / itemsPerPage))}</span>
                    <span>(Showing {logs.length} matching logs total)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(p => Math.max(0, p - 1));
                        scrollToTop();
                      }}
                      disabled={loading || currentPage === 0}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-white/10 disabled:opacity-30 h-8 gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Newer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(p => p + 1);
                        scrollToTop();
                      }}
                      disabled={loading || (currentPage + 1) * itemsPerPage >= logs.length}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-white/10 disabled:opacity-30 h-8 gap-1"
                    >
                      Older <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs; 