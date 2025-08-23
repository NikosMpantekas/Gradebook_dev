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
    <div className="space-y-2 mb-6">
      {announcements.map((announcement) => {
        const styles = getTypeStyles(announcement.type);
        const isExpanded = expandedAnnouncements.has(announcement._id);
        
        return (
          <Card key={announcement._id} className={`${styles.border} ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${styles.iconBg} flex-shrink-0`}>
                    <div className={styles.iconColor}>
                      {getTypeIcon(announcement.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium ${styles.text}`}>
                        {announcement.title}
                      </h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {announcement.type}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${styles.text} mb-2`}>
                      {announcement.message}
                    </p>
                    
                    {/* Collapsible details */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(announcement._id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className={`${styles.text} p-0 h-auto`}>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <Calendar className={`h-3 w-3 ${styles.iconColor}`} />
                            <div>
                              <span className="font-medium">Starts:</span>
                              <span className={`ml-1 ${styles.text}`}>
                                {formatDateTime(announcement.scheduledStart)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className={`h-3 w-3 ${styles.iconColor}`} />
                            <div>
                              <span className="font-medium">Ends:</span>
                              <span className={`ml-1 ${styles.text}`}>
                                {formatDateTime(announcement.scheduledEnd)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {announcement.affectedServices && announcement.affectedServices.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium">Affected Services:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {announcement.affectedServices.map((service, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
                
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MaintenanceNotifications;
