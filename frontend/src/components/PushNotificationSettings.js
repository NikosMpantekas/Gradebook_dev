import React, { Component } from 'react';
import { AlertCircle, Bell, BellOff, Smartphone, Check, X, RefreshCw, Loader } from 'lucide-react';

/**
 * Modern Push Notification Settings Component
 * Cross-platform compatible UI for managing push notifications
 * Integrates with PushNotificationManager service
 */
class PushNotificationSettings extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      // Permission and subscription states
      isSupported: false,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      
      // Platform detection
      platform: null,
      isPWA: false,
      
      // UI states
      showDetails: false,
      lastTestResult: null,
      
      // Subscription data
      subscriptions: [],
      subscriptionCount: 0,
      
      // Error handling
      error: null,
      success: null
    };

    // Bind methods
    this.handleEnableNotifications = this.handleEnableNotifications.bind(this);
    this.handleDisableNotifications = this.handleDisableNotifications.bind(this);
    this.handleTestNotification = this.handleTestNotification.bind(this);
    this.handleRefreshStatus = this.handleRefreshStatus.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
    this.clearMessages = this.clearMessages.bind(this);
  }

  async componentDidMount() {
    console.log('[PushSettings] Component mounted, initializing...');
    await this.initializePushManager();
    await this.refreshStatus();
  }

  /**
   * Initialize push notification manager
   */
  async initializePushManager() {
    try {
      // Import PushNotificationManager dynamically
      const { default: PushNotificationManager } = await import('../services/PushNotificationManager');
      
      this.pushManager = new PushNotificationManager();
      
      // Check support and platform
      const isSupported = this.pushManager.isSupported();
      const platform = this.pushManager.detectPlatform();
      const isPWA = this.pushManager.isPWAMode();
      
      console.log('[PushSettings] Push manager initialized:', {
        isSupported,
        platform,
        isPWA
      });
      
      this.setState({
        isSupported,
        platform,
        isPWA
      });
      
    } catch (error) {
      console.error('[PushSettings] Failed to initialize push manager:', error);
      this.setState({
        error: 'Failed to initialize push notifications',
        isSupported: false
      });
    }
  }

  /**
   * Refresh notification status
   */
  async refreshStatus() {
    if (!this.pushManager) return;
    
    this.setState({ isLoading: true });
    
    try {
      // Get current permission and subscription status
      const permission = await this.pushManager.getPermissionStatus();
      const isSubscribed = await this.pushManager.isSubscribed();
      
      // Get subscription info from server
      const subscriptionData = await this.getSubscriptionData();
      
      console.log('[PushSettings] Status refreshed:', {
        permission,
        isSubscribed,
        subscriptionCount: subscriptionData.count
      });
      
      this.setState({
        permission,
        isSubscribed,
        subscriptions: subscriptionData.subscriptions || [],
        subscriptionCount: subscriptionData.count || 0,
        isLoading: false,
        error: null
      });
      
    } catch (error) {
      console.error('[PushSettings] Failed to refresh status:', error);
      this.setState({
        error: 'Failed to refresh notification status',
        isLoading: false
      });
    }
  }

  /**
   * Get subscription data from server
   */
  async getSubscriptionData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/notifications/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data : { subscriptions: [], count: 0 };
      
    } catch (error) {
      console.error('[PushSettings] Failed to get subscription data:', error);
      return { subscriptions: [], count: 0 };
    }
  }

  /**
   * Enable push notifications
   */
  async handleEnableNotifications() {
    if (!this.pushManager) return;
    
    this.setState({ isLoading: true, error: null, success: null });
    
    try {
      console.log('[PushSettings] Enabling push notifications...');
      
      const result = await this.pushManager.enablePushNotifications();
      
      if (result.success) {
        console.log('[PushSettings] Push notifications enabled successfully');
        this.setState({
          success: 'Push notifications enabled successfully!',
          isLoading: false
        });
        
        // Refresh status to get updated data
        await this.refreshStatus();
      } else {
        console.error('[PushSettings] Failed to enable push notifications:', result.error);
        this.setState({
          error: result.error || 'Failed to enable push notifications',
          isLoading: false
        });
      }
      
    } catch (error) {
      console.error('[PushSettings] Error enabling push notifications:', error);
      this.setState({
        error: error.message || 'Failed to enable push notifications',
        isLoading: false
      });
    }
  }

  /**
   * Disable push notifications
   */
  async handleDisableNotifications() {
    if (!this.pushManager) return;
    
    this.setState({ isLoading: true, error: null, success: null });
    
    try {
      console.log('[PushSettings] Disabling push notifications...');
      
      const result = await this.pushManager.disablePushNotifications();
      
      if (result.success) {
        console.log('[PushSettings] Push notifications disabled successfully');
        this.setState({
          success: 'Push notifications disabled successfully!',
          isLoading: false
        });
        
        // Refresh status to get updated data
        await this.refreshStatus();
      } else {
        console.error('[PushSettings] Failed to disable push notifications:', result.error);
        this.setState({
          error: result.error || 'Failed to disable push notifications',
          isLoading: false
        });
      }
      
    } catch (error) {
      console.error('[PushSettings] Error disabling push notifications:', error);
      this.setState({
        error: error.message || 'Failed to disable push notifications',
        isLoading: false
      });
    }
  }

  /**
   * Send test notification
   */
  async handleTestNotification() {
    if (!this.pushManager) return;
    
    this.setState({ isLoading: true, error: null, success: null });
    
    try {
      console.log('[PushSettings] Sending test notification...');
      
      const result = await this.pushManager.sendTestNotification({
        title: 'GradeBook Test',
        body: `Test notification sent at ${new Date().toLocaleTimeString()}`
      });
      
      if (result.success) {
        console.log('[PushSettings] Test notification sent successfully');
        this.setState({
          success: `Test notification sent successfully! (${result.results?.successful || 0} devices)`,
          lastTestResult: result.results,
          isLoading: false
        });
      } else {
        console.error('[PushSettings] Failed to send test notification:', result.error);
        this.setState({
          error: result.error || 'Failed to send test notification',
          isLoading: false
        });
      }
      
    } catch (error) {
      console.error('[PushSettings] Error sending test notification:', error);
      this.setState({
        error: error.message || 'Failed to send test notification',
        isLoading: false
      });
    }
  }

  /**
   * Handle refresh status
   */
  async handleRefreshStatus() {
    await this.refreshStatus();
  }

  /**
   * Toggle details view
   */
  toggleDetails() {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  }

  /**
   * Clear success/error messages
   */
  clearMessages() {
    this.setState({
      error: null,
      success: null
    });
  }

  /**
   * Get platform display info
   */
  getPlatformInfo() {
    const { platform, isPWA } = this.state;
    
    if (!platform) return { name: 'Unknown', icon: '❓' };
    
    let name = 'Desktop';
    let icon = '💻';
    
    if (platform.isIOS) {
      name = isPWA ? 'iOS (PWA)' : 'iOS (Safari)';
      icon = '📱';
    } else if (platform.isAndroid) {
      name = isPWA ? 'Android (PWA)' : 'Android (Browser)';
      icon = '📱';
    } else if (platform.isWindows) {
      name = 'Windows';
      icon = '💻';
    }
    
    return { name, icon };
  }

  /**
   * Get permission status display
   */
  getPermissionDisplay() {
    const { permission } = this.state;
    
    switch (permission) {
      case 'granted':
        return { text: 'Allowed', color: 'text-green-600', icon: Check };
      case 'denied':
        return { text: 'Blocked', color: 'text-red-600', icon: X };
      default:
        return { text: 'Not Set', color: 'text-yellow-600', icon: AlertCircle };
    }
  }

  render() {
    const {
      isSupported,
      permission,
      isSubscribed,
      isLoading,
      platform,
      isPWA,
      showDetails,
      subscriptionCount,
      error,
      success,
      lastTestResult
    } = this.state;

    // If not supported, show info message
    if (!isSupported) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Push Notifications Not Supported
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your browser or device doesn't support push notifications.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const platformInfo = this.getPlatformInfo();
    const permissionDisplay = this.getPermissionDisplay();
    const PermissionIcon = permissionDisplay.icon;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Push Notifications
            </h3>
          </div>
          <button
            onClick={this.handleRefreshStatus}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Permission Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Permission</p>
                <p className={`text-sm font-semibold ${permissionDisplay.color}`}>
                  {permissionDisplay.text}
                </p>
              </div>
              <PermissionIcon className={`h-5 w-5 ${permissionDisplay.color}`} />
            </div>
          </div>

          {/* Subscription Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={`text-sm font-semibold ${isSubscribed ? 'text-green-600' : 'text-gray-500'}`}>
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Device Count */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Devices</p>
                <p className="text-sm font-semibold text-gray-900">
                  {subscriptionCount}
                </p>
              </div>
              <Smartphone className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* iOS PWA Warning */}
        {platform?.isIOS && !isPWA && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">
                  Add to Home Screen for Best Experience
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  For reliable notifications on iOS, add GradeBook to your home screen using Safari's share menu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <X className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={this.clearMessages}
                className="text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
              <button
                onClick={this.clearMessages}
                className="text-green-400 hover:text-green-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isSubscribed ? (
            <button
              onClick={this.handleEnableNotifications}
              disabled={isLoading || permission === 'denied'}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Enable Notifications
            </button>
          ) : (
            <button
              onClick={this.handleDisableNotifications}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              Disable Notifications
            </button>
          )}

          {isSubscribed && (
            <button
              onClick={this.handleTestNotification}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4 mr-2" />
              )}
              Send Test
            </button>
          )}

          <button
            onClick={this.toggleDetails}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Technical Details</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Platform:</span>
                <span className="text-gray-900">
                  {platformInfo.icon} {platformInfo.name}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Browser:</span>
                <span className="text-gray-900">
                  {platform?.browserName || 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">PWA Mode:</span>
                <span className="text-gray-900">
                  {isPWA ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Service Worker:</span>
                <span className="text-gray-900">
                  {'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}
                </span>
              </div>

              {lastTestResult && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-gray-500 mb-1">Last Test Results:</p>
                  <div className="text-xs space-y-1">
                    <div>Total: {lastTestResult.total}</div>
                    <div>Successful: {lastTestResult.successful}</div>
                    <div>Failed: {lastTestResult.failed}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default PushNotificationSettings;
