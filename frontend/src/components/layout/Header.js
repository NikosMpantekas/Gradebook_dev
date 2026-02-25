import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Moon,
  Sun,
  Mail,
  Menu as MenuIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from '../../features/ui/uiSlice';
import LanguageSwitcher from '../common/LanguageSwitcher';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { getMyNotifications, markNotificationAsRead } from '../../features/notifications/notificationSlice';
import { useIsMobile } from '../hooks/use-mobile';
import { useTheme } from '../../contexts/ThemeContext';
import AccessibilityMenu from '../common/AccessibilityMenu';

// Custom hook to fetch latest version from patch notes
const useLatestVersion = () => {
  const [version, setVersion] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestVersion = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/patch-notes/public`, {
          timeout: 10000
        });

        if (response.data && response.data.length > 0) {
          // Sort patch notes by creation date (newest first) and get the latest version
          const sortedPatchNotes = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latestPatchNote = sortedPatchNotes[0];

          if (latestPatchNote.version) {
            setVersion(latestPatchNote.version);
          }
        }
      } catch (error) {
        console.error('Failed to fetch latest version:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestVersion();
  }, []);

  return { version, isLoading };
};

const Header = ({ drawerWidth, handleDrawerToggle }) => {
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [contactUnreadCount, setContactUnreadCount] = useState(0);
  const [contactUnreadPreview, setContactUnreadPreview] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const { notifications } = useSelector((state) => state.notifications);
  const { getCurrentThemeData } = useTheme();

  // Use the mobile detection hook instead of Tailwind breakpoints
  const isMobile = useIsMobile();

  // Get latest version from patch notes
  const { version: latestVersion } = useLatestVersion();

  // Check if version contains "beta"
  const isBetaVersion = latestVersion && latestVersion.toLowerCase().includes('beta');

  // Count unread notifications
  const notifUnreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const combinedUnreadCount = (notifUnreadCount || 0) + (contactUnreadCount || 0);

  // Function to fetch contact unread count - using useCallback to prevent recreation
  const fetchContactUnread = useCallback(async () => {
    if (!user) return;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      if (user.role === 'admin' || user.role === 'superadmin') {
        // Admins: unread are messages with read === false in school scope
        const res = await axios.get(`${API_URL}/api/contact`, config);
        const unread = (res.data || []).filter(m => m && m.read === false);
        setContactUnreadCount(unread.length);
        setContactUnreadPreview(unread.slice(0, 5));
      } else {
        // Regular users: unread are admin replies they haven't read
        const res = await axios.get(`${API_URL}/api/contact/user`, config);
        const unread = (res.data || []).filter(m => m && m.status === 'replied' && m.adminReply && !m.replyRead);
        setContactUnreadCount(unread.length);
        setContactUnreadPreview(unread.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch contact unread:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchContactUnread();
  }, [fetchContactUnread]);

  // Fetch notifications on page load
  useEffect(() => {
    if (user?.token) {
      dispatch(getMyNotifications());
    }
  }, [dispatch, user?.token]);

  const handleDarkModeToggle = () => dispatch(toggleDarkMode());

  const handleNotificationsClose = () => setNotifAnchorEl(null);

  const handleViewNotification = async (id) => {
    handleNotificationsClose();

    // Mark notification as read when clicked
    try {
      await dispatch(markNotificationAsRead(id)).unwrap();
      // Refresh notifications to update the count
      dispatch(getMyNotifications());
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    // Navigate to the appropriate notification detail page
    if (user?.role === 'superadmin') {
      navigate(`/superadmin/notifications/${id}`);
    } else if (user?.role === 'admin') {
      navigate(`/app/admin/notifications/${id}`);
    } else if (user?.role === 'teacher') {
      navigate(`/app/teacher/notifications/${id}`);
    } else {
      navigate(`/app/notifications/${id}`);
    }
  };

  const handleViewContactMessages = () => {
    handleNotificationsClose();
    if (user?.role === 'superadmin') {
      navigate('/superadmin/contact');
    } else if (user?.role === 'admin') {
      navigate('/app/admin/contact');
    } else if (user?.role === 'teacher') {
      navigate('/app/teacher/contact');
    } else if (user?.role === 'student') {
      navigate('/app/student/contact');
    } else if (user?.role === 'parent') {
      navigate('/app/parent/contact');
    } else {
      navigate('/app/contact-messages');
    }
  };

  const handleViewContactMessage = (id) => {
    // There may not be a dedicated detail route; open the contact list filtered.
    handleViewContactMessages();
  };

  const handleViewAllNotifications = () => {
    handleNotificationsClose();
    if (user?.role === 'student') {
      navigate('/app/student/notifications');
    } else if (user?.role === 'teacher') {
      navigate('/app/teacher/notifications');
    } else if (user?.role === 'admin') {
      navigate('/app/admin/notifications/manage');
    } else if (user?.role === 'superadmin') {
      navigate('/app/admin/notifications/manage');
    } else if (user?.role === 'parent') {
      navigate('/app/parent/notifications');
    } else {
      navigate('/app/notifications');
    }
  };

  // Prepare notification preview
  const notifPreview = (notifications || []).filter(n => !n.isRead).slice(0, 5);

  // Get themed background color for header
  const getThemedHeaderBg = () => {
    const themeData = getCurrentThemeData();
    if (!themeData) return darkMode ? "bg-[#181b20]/90" : "bg-background/90";

    try {
      const colors = darkMode ? themeData.darkColors || themeData.colors : themeData.colors;
      const bgHex = colors.background.replace('#', '');
      const bgR = parseInt(bgHex.substr(0, 2), 16);
      const bgG = parseInt(bgHex.substr(2, 2), 16);
      const bgB = parseInt(bgHex.substr(4, 2), 16);

      const primaryHex = colors.primary.replace('#', '');
      const pR = parseInt(primaryHex.substr(0, 2), 16);
      const pG = parseInt(primaryHex.substr(2, 2), 16);
      const pB = parseInt(primaryHex.substr(4, 2), 16);

      // Blend a subtle primary tint onto the actual background
      const blend = darkMode ? 0.04 : 0.02;
      const r = Math.round(bgR + (pR - bgR) * blend);
      const g = Math.round(bgG + (pG - bgG) * blend);
      const b = Math.round(bgB + (pB - bgB) * blend);
      const opacity = darkMode ? 0.6 : 0.7;

      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } catch {
      return darkMode ? "bg-[#181b20]/90" : "bg-background/90";
    }
  };

  const themedHeaderBg = getThemedHeaderBg();

  return (
    <TooltipProvider>
      <header
        className={cn(
          "fixed top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-100", // Enhanced frosted glass
          "lg:ml-64 lg:w-[calc(100%-256px)]", // Fixed: 256px = 64 * 4 (lg:w-64 from sidebar)
          "shadow-sm", // Subtle shadow
          darkMode
            ? "border-[#2a3441]/30"
            : "border-border/30"
        )}
        style={{
          backgroundColor: typeof themedHeaderBg === 'string' && themedHeaderBg.startsWith('rgba') ? themedHeaderBg : undefined
        }}
      >
        <div className="flex h-14 max-w-screen-2xl items-center px-4 mx-auto w-full">
          {/* Sidebar toggle button - shown on mobile, tablet, and small desktop screens */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-3"
              onClick={handleDrawerToggle}
              aria-label="open drawer"
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
          )}

          {/* Logo */}
          <div className="flex flex-1 items-center">
            <RouterLink
              to="/"
              className={cn(
                "text-xl sm:text-2xl md:text-3xl font-light tracking-wide",
                "no-underline text-foreground hover:text-primary transition-colors",
                "relative inline-block"
              )}
            >
              GradeBook
              {isBetaVersion && (
                <span className="relative -bottom-1 -right-0.5 text-primary text-xs font-light italic leading-none">
                  β
                </span>
              )}
            </RouterLink>
          </div>

          {/* User actions */}
          {user && (
            <div className="flex items-center space-x-3">
              <LanguageSwitcher variant="icon" />

              <AccessibilityMenu />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDarkModeToggle}
                  >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle dark mode</p>
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {combinedUnreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {combinedUnreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 dropdown-slide-in"
                  sideOffset={8}
                >
                  {/* Only show notifications section for non-superadmin users */}
                  {user?.role !== 'superadmin' && (
                    <>
                      <DropdownMenuLabel className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        Unread Notifications ({notifUnreadCount})
                      </DropdownMenuLabel>

                      {notifPreview.length === 0 ? (
                        <DropdownMenuItem disabled>
                          No unread notifications
                        </DropdownMenuItem>
                      ) : (
                        notifPreview.map(n => (
                          <DropdownMenuItem key={n._id} onClick={() => handleViewNotification(n._id)}>
                            <div className="flex flex-col space-y-1">
                              <p className="text-sm font-medium truncate">{n.title || 'Notification'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}

                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuLabel className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Unread Contact Messages ({contactUnreadCount})
                  </DropdownMenuLabel>

                  {contactUnreadPreview.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No unread contact messages
                    </DropdownMenuItem>
                  ) : (
                    contactUnreadPreview.map(m => (
                      <DropdownMenuItem key={m._id} onClick={() => handleViewContactMessage(m._id)}>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium truncate">{m.subject || 'Contact Message'}</p>
                          {m.userName && (
                            <p className="text-xs text-muted-foreground">From: {m.userName}</p>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}

                  <DropdownMenuSeparator />

                  {/* Only show "View all notifications" for non-superadmin users */}
                  {user?.role !== 'superadmin' && (
                    <DropdownMenuItem onClick={handleViewAllNotifications}>
                      View all notifications
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleViewContactMessages}>
                    Open contact messages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
};

export default Header;
