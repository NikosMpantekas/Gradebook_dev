import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Menu, 
  Badge,
  MenuItem, 
  Tooltip,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from '../../features/ui/uiSlice';
import LanguageSwitcher from '../common/LanguageSwitcher';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';
import { getMyNotifications } from '../../features/notifications/notificationSlice';

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
  const theme = useTheme();
  
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const { notifications } = useSelector((state) => state.notifications);
  
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
        // Others: unread are replies not yet read by the user
        const res = await axios.get(`${API_URL}/api/contact/user`, config);
        const unread = (res.data || []).filter(m => m && m.status === 'replied' && m.adminReply && m.replyRead === false);
        setContactUnreadCount(unread.length);
        setContactUnreadPreview(unread.slice(0, 5));
      }
    } catch (err) {
      console.error('[Header] Failed to fetch contact unread:', err?.response?.data || err.message);
      setContactUnreadCount(0);
      setContactUnreadPreview([]);
    }
  }, [user]);

  // Fetch both notifications and contact unread on mount and when user changes
  useEffect(() => {
    if (!user) return;
    // Ensure notifications are fetched
    dispatch(getMyNotifications());
    fetchContactUnread();
  }, [user, dispatch, fetchContactUnread]);

  // Refresh counts when route changes (e.g., after marking notifications as read)
  useEffect(() => {
    if (user) {
      fetchContactUnread();
    }
  }, [location.pathname, fetchContactUnread, user]);

  // Listen for custom events to refresh counts
  useEffect(() => {
    const handleRefreshCounts = () => {
      if (user) {
        fetchContactUnread();
        dispatch(getMyNotifications());
      }
    };

    // Listen for custom event to refresh counts
    window.addEventListener('refreshHeaderCounts', handleRefreshCounts);
    
    return () => {
      window.removeEventListener('refreshHeaderCounts', handleRefreshCounts);
    };
  }, [user, dispatch, fetchContactUnread]);
  
/*   const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate('/login');
  }; */

  const handleDarkModeToggle = () => {
    dispatch(toggleDarkMode());
  };

  const handleNotificationsClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotifAnchorEl(null);
  };

  const handleViewAllNotifications = () => {
    handleNotificationsClose();
    if (user?.role === 'student') {
      navigate('/app/student/notifications');
    } else if (user?.role === 'teacher') {
      navigate('/app/admin/notifications/manage');
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

  const handleViewNotification = (id) => {
    handleNotificationsClose();
    if (!id) return handleViewAllNotifications();
    if (user?.role === 'student') {
      navigate(`/app/student/notifications/${id}`);
    } else if (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'superadmin') {
      navigate(`/app/notifications/${id}`);
    } else if (user?.role === 'parent') {
      navigate(`/app/parent/notifications/${id}`);
    } else {
      navigate(`/app/notifications/${id}`);
    }
  };

  const handleViewContactMessages = () => {
    handleNotificationsClose();
    if (user?.role === 'admin' || user?.role === 'superadmin') {
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
  
  // Prepare notification preview
  const notifPreview = (notifications || []).filter(n => !n.isRead).slice(0, 5);

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
      }}
    >
      <Toolbar>
                            <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={handleDrawerToggle}
                      sx={{ mr: { xs: 1, sm: 2 }, display: { sm: 'none' } }}
                    >
          <MenuIcon />
        </IconButton>
                            <Box
                      sx={{
                        flexGrow: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                                <Typography
                        variant="h6"
                        noWrap
                        component={RouterLink}
                        to="/"
                                                  sx={{
                            textDecoration: 'none',
                            color: 'inherit',
                            fontWeight: 100,
                            fontSize: { xs: 24, sm: 28, md: 32, lg: 36 },
                            letterSpacing: 1,
                            fontFamily: 'Roboto, Arial, sans-serif',
                            position: 'relative',
                            display: 'inline-block',
                            '&:hover': {
                              color: theme.palette.primary.dark,
                            },
                          }}
                      >
                        GradeBook
                        {isBetaVersion && (
                          <Typography
                            component="span"
                            sx={{
                              position: 'relative',
                              bottom: '-0.2em',
                              right: '-0.05em',
                              color: theme.palette.primary.main,
                              fontSize: { xs: '0.7em', sm: '0.6em' },
                              fontWeight: 100,
                              fontStyle: 'italic',
                              lineHeight: 1,
                              verticalAlign: 'sub',
                            }}
                          >
                            β
                          </Typography>
                        )}
                      </Typography>
        </Box>

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSwitcher variant="icon" />
            
            <Tooltip title="Toggle dark mode">
              <IconButton 
                size="large" 
                color="inherit"
                onClick={handleDarkModeToggle}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title={`Notifications & Messages (${notifUnreadCount} unread, ${contactUnreadCount} contact)`}>
              <IconButton
                size="large"
                color="inherit"
                onClick={handleNotificationsClick}
              >
                <Badge badgeContent={combinedUnreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Dropdown with unread notifications and contact messages */}
            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={handleNotificationsClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: { xs: 280, sm: 360 }, maxWidth: '90vw' } }}
            >
              <MenuItem disabled>
                <ListItemIcon>
                  <NotificationsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={`Unread Notifications (${notifUnreadCount})`} />
              </MenuItem>
              {notifPreview.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText primary="No unread notifications" />
                </MenuItem>
              ) : (
                notifPreview.map(n => (
                  <MenuItem key={n._id} onClick={() => handleViewNotification(n._id)}>
                    <ListItemIcon>
                      <NotificationsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={n.title || 'Notification'} 
                      secondary={new Date(n.createdAt).toLocaleString()} 
                      primaryTypographyProps={{ 
                        noWrap: true, 
                        sx: { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: 180, sm: 260 } } 
                      }}
                      secondaryTypographyProps={{ 
                        noWrap: true, 
                        sx: { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: 180, sm: 260 } } 
                      }}
                    />
                  </MenuItem>
                ))
              )}

              <Divider sx={{ my: 0.5 }} />

              <MenuItem disabled>
                <ListItemIcon>
                  <EmailIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={`Unread Contact Messages (${contactUnreadCount})`} />
              </MenuItem>
              {contactUnreadPreview.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText primary="No unread contact messages" />
                </MenuItem>
              ) : (
                contactUnreadPreview.map(m => (
                  <MenuItem key={m._id} onClick={() => handleViewContactMessage(m._id)}>
                    <ListItemIcon>
                      <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={m.subject || 'Contact Message'} 
                      secondary={m.userName ? `From: ${m.userName}` : undefined}
                      primaryTypographyProps={{ 
                        noWrap: true, 
                        sx: { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: 180, sm: 260 } } 
                      }}
                      secondaryTypographyProps={{ 
                        noWrap: true, 
                        sx: { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: { xs: 180, sm: 260 } } 
                      }}
                    />
                  </MenuItem>
                ))
              )}

              <Divider sx={{ my: 0.5 }} />

              <MenuItem onClick={handleViewAllNotifications}>
                <ListItemText primary="View all notifications" />
              </MenuItem>
              <MenuItem onClick={handleViewContactMessages}>
                <ListItemText primary="Open contact messages" />
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
