import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

/**
 * Welcome Panel Component
 * Shows current time, date, and personalized greeting
 */
export const WelcomePanel = ({ user, userType, subtitle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      case 'parent': return 'Parent';
      case 'superadmin': return 'Super Administrator';
      default: return role;
    }
  };

  const handleProfileClick = () => {
    navigate('/app/profile');
  };

  return (
    <Card 
      sx={{ 
        background: theme => `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
        color: 'white',
        mb: 3
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: { xs: 2, md: 0 } 
        }}>
          {/* Mobile Layout: Time/Date only, no monogram */}
          {isMobile ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              width: '100%'
            }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontWeight: 'bold', 
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
                textAlign: 'left'
              }}>
                {getGreeting()}, {user?.name || 'User'}! 👋
              </Typography>
              <Typography variant="h6" sx={{ 
                opacity: 0.9, 
                mb: 1, 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                textAlign: 'left'
              }}>
                {subtitle || `Welcome to your ${getRoleDisplayName(user?.role)} Dashboard`}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {format(currentTime, 'EEEE, MMMM do, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {format(currentTime, 'h:mm:ss a')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            /* Desktop Layout: User info with monogram */
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar 
                  onClick={handleProfileClick}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      bgcolor: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon sx={{ fontSize: '2rem' }} />}
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                    {getGreeting()}, {user?.name || 'User'}! 👋
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {subtitle || `Welcome to your ${getRoleDisplayName(user?.role)} Dashboard`}
                  </Typography>
                </Box>
              </Box>
              
              {/* Time and Date on Desktop */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon />
                  <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                    {format(currentTime, 'EEEE, MMMM do, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {format(currentTime, 'h:mm:ss a')}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WelcomePanel;
