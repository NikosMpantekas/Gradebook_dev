import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  Grid,
  Link,
  Paper,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { LockOutlined as LockOutlinedIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { login, reset } from '../features/auth/authSlice';
import authService from '../features/auth/authService';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    saveCredentials: false,
  });

  const [version, setVersion] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const { email, password, saveCredentials } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    // Debug the login state
    console.log('=== LOGIN COMPONENT AUTH STATE CHECK ===');
    console.log('Login component - Auth state:', { 
      isSuccess, 
      isError, 
      user: !!user,
      userRole: user?.role,
      hasToken: !!user?.token 
    });
    console.log('Current URL:', window.location.href);
    
    if (isError) {
      console.error('Login error:', message);
      toast.error(message);
    }

    if (isSuccess || user) {
      console.log('=== LOGIN SUCCESSFUL - DETERMINING REDIRECT ===');
      console.log('User role:', user?.role);
      console.log('Password change required:', user?.requirePasswordChange);
      console.log('Is first login:', user?.isFirstLogin);
      
      // Check if password change is required
      if (user?.requirePasswordChange || user?.isFirstLogin) {
        console.log('PASSWORD CHANGE REQUIRED - Redirecting to password change page');
        navigate('/change-password');
        return;
      }
      
      // Navigate directly to role-specific route instead of /app/dashboard
      // This prevents redirect loops through /app/dashboard
      let redirectPath;
      switch (user?.role) {
        case 'superadmin':
          redirectPath = '/superadmin/dashboard';
          break;
        case 'admin':
          redirectPath = '/app/admin';
          break;
        case 'teacher':
          redirectPath = '/app/teacher';
          break;
        case 'student':
          redirectPath = '/app/student';
          break;
        case 'parent':
          redirectPath = '/app/parent';
          break;
        default:
          console.error('Unknown user role:', user?.role);
          redirectPath = '/app/dashboard'; // Fallback
      }
      
      console.log('LOGIN REDIRECT: Navigating to', redirectPath);
      navigate(redirectPath);
    }

    return () => {
      // Only reset when the component unmounts or when an error/success occurs
      if (isError || isSuccess) {
        dispatch(reset());
      }
    };
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  // Load version dynamically like the Footer component
  useEffect(() => {
    import('../config/appConfig.js')
      .then(module => {
        setVersion(module.appConfig.version);
      })
      .catch(error => {
        console.error('Failed to load appConfig:', error);
        setVersion('0.0.0');
      });
  }, []);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const userData = {
      email,
      password,
      saveCredentials,
    };

    dispatch(login(userData));
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }
    setIsSubmittingForgot(true);
    try {
      await authService.forgotPasswordRequest(forgotEmail);
      toast.success('If this email is registered, we notified the appropriate administrator.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      // Backend responds generically; we also show generic success
      toast.success('If this email is registered, we notified the appropriate administrator.');
      setForgotOpen(false);
      setForgotEmail('');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={6} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2,
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {t('auth.loginTitle')}
        </Typography>
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label={t('auth.emailPlaceholder')}
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={onChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label={t('auth.passwordPlaceholder')}
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={onChange}
          />
          <FormControlLabel
            control={
              <Checkbox 
                value="remember" 
                color="primary" 
                name="saveCredentials"
                checked={saveCredentials}
                onChange={onChange}
              />
            }
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 1.5, py: 1.2 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('auth.loginButton')
            )}
          </Button>

          <Button
            fullWidth
            variant="text"
            sx={{ mb: 2, textTransform: 'none' }}
            onClick={() => setForgotOpen(true)}
          >
            Forgot password?
          </Button>
          
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            fullWidth
            sx={{ 
              mb: 2,
              color: 'text.secondary',
              borderColor: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              }
            }}
          >
            Back to Homepage
          </Button>
          {/* Sign-up option removed as accounts are admin-created only */}
        </Box>
      </Paper>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs" keepMounted disableRestoreFocus>
        <DialogTitle>Forgot password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the email you use to sign in. We will notify the appropriate administrator to help reset your password.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="forgot-email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)} disabled={isSubmittingForgot}>Cancel</Button>
          <Button onClick={handleForgot} variant="contained" disabled={isSubmittingForgot}>
            {isSubmittingForgot ? <CircularProgress size={20} color="inherit" /> : 'Send request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {'© '}
          {new Date().getFullYear()}
          {' GradeBook - Progressive Web App \n Created by the GradeBook Team'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {'Version: '}{version}
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;
