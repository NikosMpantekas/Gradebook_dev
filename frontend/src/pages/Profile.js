import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  CircularProgress,
  Divider,
} from '@mui/material';
import { 
  Save as SaveIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  SaveAlt as SaveAltIcon
} from '@mui/icons-material';
import { updateProfile, reset } from '../features/auth/authSlice';
import { setThemeColor } from '../features/ui/uiSlice';

const Profile = () => {
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );
  
  // Initialize with empty data, will be updated when user data is available
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    colorTheme: localStorage.getItem('themeColor') || 'blue', // Default theme color
  });
  
  // Set form data when user data becomes available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const { name, email, password, password2 } = formData;

  const dispatch = useDispatch();

  // Track if form has been submitted
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const handleEditSave = () => {
    onSubmit();
  };

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    // Only show success message if the form was actually submitted
    if (isSuccess && hasSubmitted) {
      toast.success('Profile updated successfully');
      setHasSubmitted(false); // Reset after showing message
    }

    dispatch(reset());
  }, [isError, isSuccess, message, dispatch, hasSubmitted]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  };

  const onSubmit = (e) => {
    if (e) e.preventDefault();

    if (password !== password2) {
      toast.error('Passwords do not match');
      return;
    }
    
    const userData = {
      name,
      email,
    };

    if (password) {
      userData.password = password;
    }

    // Set flag to indicate form was submitted to trigger success message
    setHasSubmitted(true);
    dispatch(updateProfile(userData));
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: 2,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          My Profile
        </Typography>
        
        <Grid container spacing={2}>
          {/* User Info */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Typography>
            </Box>
          </Grid>
          
          {/* Profile Form */}
          <Grid item xs={12}>
            <Box component="form" onSubmit={onSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={onChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address (Cannot be changed)"
                name="email"
                autoComplete="email"
                value={email}
                disabled
                helperText="Email cannot be changed for security reasons"
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <EmailIcon color="disabled" sx={{ mr: 1 }} />
                  ),
                }}
              />
              
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Change Password
              </Typography>
              
              <TextField
                margin="normal"
                fullWidth
                name="password"
                label="New Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={onChange}
                helperText="Leave blank to keep current password"
              />
              <TextField
                margin="normal"
                fullWidth
                name="password2"
                label="Confirm New Password"
                type="password"
                id="password2"
                value={password2}
                onChange={onChange}
              />
              
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center">
                  <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  Theme Preferences
                </Box>
              </Typography>
              
              <Grid container spacing={2}>
                {/* UI Theme Color Picker */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Theme Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                    {/* Blue Theme (Default) */}
                    <Box
                      onClick={() => {
                        setFormData({ ...formData, colorTheme: 'blue' });
                        dispatch(setThemeColor('blue'));
                      }}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        backgroundColor: '#4A90E2',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: formData.colorTheme === 'blue' ? '3px solid #000' : '3px solid transparent',
                        '&:hover': { transform: 'scale(1.05)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      Blue
                    </Box>
                    
                    {/* Green Theme */}
                    <Box
                      onClick={() => {
                        setFormData({ ...formData, colorTheme: 'green' });
                        dispatch(setThemeColor('green'));
                      }}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        backgroundColor: '#4CAF50',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: formData.colorTheme === 'green' ? '3px solid #000' : '3px solid transparent',
                        '&:hover': { transform: 'scale(1.05)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      Green
                    </Box>
                    
                    {/* Purple Theme */}
                    <Box
                      onClick={() => {
                        setFormData({ ...formData, colorTheme: 'purple' });
                        dispatch(setThemeColor('purple'));
                      }}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        backgroundColor: '#9C27B0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: formData.colorTheme === 'purple' ? '3px solid #000' : '3px solid transparent',
                        '&:hover': { transform: 'scale(1.05)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      Purple
                    </Box>
                    
                    {/* Pink Theme */}
                    <Box
                      onClick={() => {
                        setFormData({ ...formData, colorTheme: 'pink' });
                        dispatch(setThemeColor('pink'));
                      }}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        backgroundColor: '#E91E63',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: formData.colorTheme === 'pink' ? '3px solid #000' : '3px solid transparent',
                        '&:hover': { transform: 'scale(1.05)' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      Pink
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Choose your preferred color theme
                  </Typography>
                </Grid>
              </Grid>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{ mt: 3, mb: 2, py: 1.2 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile;
