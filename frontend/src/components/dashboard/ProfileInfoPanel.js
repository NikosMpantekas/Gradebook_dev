import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Chip,
  Divider,
  Skeleton
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * Profile Information Panel Component
 * Shows user profile details and school information
 */
export const ProfileInfoPanel = ({ user, userType, loading = false }) => {
  const navigate = useNavigate();

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return 'error';
      case 'admin': return 'warning'; 
      case 'teacher': return 'info';
      case 'student': return 'success';
      case 'parent': return 'secondary';
      default: return 'default';
    }
  };

  const handleProfileClick = () => {
    navigate('/app/profile');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Profile Information" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={50} height={50} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
            </Box>
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="Profile Information" 
        avatar={<PersonIcon color="primary" />}
      />
      <CardContent sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* User Avatar and Basic Info */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              cursor: 'pointer',
              p: 1,
              borderRadius: 1,
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: theme => `${theme.palette.primary.main}10`
              }
            }}
            onClick={handleProfileClick}
          >
            <Avatar sx={{ width: 50, height: 50, bgcolor: 'primary.main' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {user?.name || 'Unknown User'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={user?.role || 'No Role'} 
                  color={getRoleColor(user?.role)}
                  size="small"
                  variant="outlined"
                />
                {userType && (
                  <Typography variant="caption" color="text.secondary">
                    • {userType} account
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Contact Information */}
          {user?.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {user.email}
              </Typography>
            </Box>
          )}

          {user?.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {user.phone}
              </Typography>
            </Box>
          )}

          {/* School Information */}
          {user?.schoolName && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {user.schoolName}
                </Typography>
              </Box>
            </>
          )}

          {user?.schoolAddress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {user.schoolAddress}
              </Typography>
            </Box>
          )}

          {/* Additional school info for specific roles */}
          {(user?.role === 'teacher' || user?.role === 'admin') && user?.department && (
            <Typography variant="body2" color="text.secondary">
              <strong>Department:</strong> {user.department}
            </Typography>
          )}

          {user?.role === 'student' && user?.grade && (
            <Typography variant="body2" color="text.secondary">
              <strong>Grade:</strong> {user.grade}
            </Typography>
          )}

          {user?.role === 'parent' && user?.linkedStudentIds?.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              <strong>Children:</strong> {user.linkedStudentIds.length} student{user.linkedStudentIds.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileInfoPanel;
