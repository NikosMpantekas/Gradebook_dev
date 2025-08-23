import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Calendar,
  Clock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import axios from 'axios';
import { API_URL } from '../config/appConfig';

const MaintenanceNotifications = () => {
  const { user } = useSelector((state) => state.auth);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(new Set());
  const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json'
    }
  });

  const fetchActiveAnnouncements = async () => {
    try {
      if (!user?.token) return;
      
      const response = await axios.get(`${API_URL}/api/maintenance-announcements/active`, getAuthConfig());
      console.log('🔧 MAINTENANCE ANNOUNCEMENTS: Fetched', response.data?.length || 0, 'announcements');
      setAnnouncements(response.data || []);
    } catch (error) {
      console.error('Error fetching maintenance announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchActiveAnnouncements();
      
      // Refresh announcements every 5 minutes
      const interval = setInterval(fetchActiveAnnouncements, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.token]);

  // Load dismissed announcements from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedMaintenanceAnnouncements');
    if (dismissed) {
      try {
        setDismissedAnnouncements(new Set(JSON.parse(dismissed)));
      } catch (error) {
        console.error('Error loading dismissed announcements:', error);
      }
    }
  }, []);

  const handleDismiss = (announcementId) => {
    const newDismissed = new Set(dismissedAnnouncements);
    newDismissed.add(announcementId);
    setDismissedAnnouncements(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedMaintenanceAnnouncements', JSON.stringify([...newDismissed]));
  };

  const toggleExpanded = (announcementId) => {
    const newExpanded = new Set(expandedAnnouncements);
    if (newExpanded.has(announcementId)) {
      newExpanded.delete(announcementId);
    } else {
      newExpanded.add(announcementId);
    }
    setExpandedAnnouncements(newExpanded);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'warning': 
        return {
          border: 'border-yellow-200 dark:border-yellow-800',
          bg: 'bg-yellow-50 dark:bg-yellow-950/20',
          text: 'text-yellow-800 dark:text-yellow-200',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'critical': 
        return {
          border: 'border-red-200 dark:border-red-800',
          bg: 'bg-red-50 dark:bg-red-950/20',
          text: 'text-red-800 dark:text-red-200',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400'
        };
      case 'scheduled': 
        return {
          border: 'border-blue-200 dark:border-blue-800',
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          text: 'text-blue-800 dark:text-blue-200',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      default: 
        return {
          border: 'border-gray-200 dark:border-gray-700',
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          text: 'text-gray-800 dark:text-gray-200',
          iconBg: 'bg-gray-100 dark:bg-gray-900/30',
          iconColor: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      // Past date - show how long ago
      const pastHours = Math.abs(diffHours);
      const pastMinutes = Math.abs(diffMinutes);
      if (pastHours > 0) {
        return `${pastHours}h ${pastMinutes}m ago`;
      } else {
        return `${pastMinutes}m ago`;
      }
    } else {
      // Future date - show countdown
      if (diffHours > 0) {
        return `in ${diffHours}h ${diffMinutes}m`;
      } else {
        return `in ${diffMinutes}m`;
      }
    }
  };

  // Enhanced debug logging for component rendering decisions
  console.log('🔧 MAINTENANCE ANNOUNCEMENTS: Component render check:', {
    loading,
    announcementsLength: announcements.length,
    announcements: announcements.map(a => ({ 
      id: a._id, 
      title: a.title, 
      type: a.type,
      scheduledStart: a.scheduledStart,
      scheduledEnd: a.scheduledEnd,
      showOnDashboard: a.showOnDashboard
    })),
    willRender: !loading && announcements.length > 0
  });

  // Show loading state briefly, then show announcements if available
  if (loading) {
    console.log('🔧 MAINTENANCE ANNOUNCEMENTS: Still loading, showing nothing');
    return null;
  }
  
  if (announcements.length === 0) {
    console.log('🔧 MAINTENANCE ANNOUNCEMENTS: No announcements to display');
    return null;
  }

  console.log('🔧 MAINTENANCE ANNOUNCEMENTS: Rendering', announcements.length, 'announcements');

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-foreground">System Maintenance</h3>
      </div>
      {announcements.map((announcement) => {
        const styles = getTypeStyles(announcement.type);
        const isExpanded = expandedAnnouncements.has(announcement._id);
        const now = new Date();
        const start = new Date(announcement.scheduledStart);
        const end = new Date(announcement.scheduledEnd);
        
        // Determine status
        const isActive = start <= now && end >= now;
        const isUpcoming = start > now;
        const statusText = isActive ? 'Active Now' : isUpcoming ? 'Upcoming' : 'Scheduled';
        const statusColor = isActive ? 'bg-red-100 text-red-800 border-red-200' : 
                           isUpcoming ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                           'bg-blue-100 text-blue-800 border-blue-200';
        
        return (
          <div 
            key={announcement._id} 
            className={`relative overflow-hidden rounded-lg border-l-4 ${styles.border} bg-gradient-to-r ${styles.bg} to-background/50 shadow-sm hover:shadow-md transition-all duration-200`}
          >
            {/* Status indicator stripe */}
            <div className={`absolute top-0 right-0 px-2 py-1 text-xs font-medium ${statusColor} rounded-bl-lg`}>
              {statusText}
            </div>
            
            <div className="p-4 pr-20">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-full ${styles.iconBg} flex-shrink-0 shadow-sm`}>
                  <div className={`${styles.iconColor} [&>svg]:h-5 [&>svg]:w-5`}>
                    {getTypeIcon(announcement.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className={`text-lg font-semibold ${styles.text}`}>
                      {announcement.title}
                    </h4>
                    <Badge variant="outline" className={`text-xs capitalize font-medium ${styles.text} border-current`}>
                      {announcement.type}
                    </Badge>
                  </div>
                  
                  <p className={`text-sm leading-relaxed ${styles.text} mb-3 opacity-90`}>
                    {announcement.message}
                  </p>
                  
                  {/* Quick timing info */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Starts: {formatDateTime(announcement.scheduledStart)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Duration: {Math.round((end - start) / (1000 * 60 * 60))}h</span>
                    </div>
                  </div>
                  
                  {/* Collapsible details */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(announcement._id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className={`${styles.text} p-0 h-auto hover:bg-transparent`}>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium">
                            {isExpanded ? 'Hide details' : 'Show more details'}
                          </span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-3">
                      <div className="bg-background/30 rounded-lg p-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className={`h-4 w-4 ${styles.iconColor}`} />
                            <div>
                              <span className="font-medium text-foreground">Starts:</span>
                              <div className={`${styles.text} text-sm`}>
                                {formatDateTime(announcement.scheduledStart)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className={`h-4 w-4 ${styles.iconColor}`} />
                            <div>
                              <span className="font-medium text-foreground">Ends:</span>
                              <div className={`${styles.text} text-sm`}>
                                {formatDateTime(announcement.scheduledEnd)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {announcement.affectedServices && announcement.affectedServices.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-foreground">Affected Services:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {announcement.affectedServices.map((service, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MaintenanceNotifications;
