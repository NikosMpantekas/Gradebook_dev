import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { cn } from '../lib/utils';
import { login, reset } from '../features/auth/authSlice';
import authService from '../features/auth/authService';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    saveCredentials: false,
  });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  
  // Animation states
  const [animationStep, setAnimationStep] = useState('idle'); // 'idle', 'validating', 'scaling', 'zooming'
  const [gapPosition, setGapPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

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
      console.log('=== LOGIN SUCCESSFUL - STARTING ANIMATION SEQUENCE ===');
      console.log('User role:', user?.role);
      console.log('Password change required:', user?.requirePasswordChange);
      console.log('Is first login:', user?.isFirstLogin);
      
      // Start the success animation sequence
      if (animationStep === 'idle' || animationStep === 'validating') {
        startZoomAnimation(user);
      }
    }

    return () => {
      // Only reset when the component unmounts or when an error/success occurs
      if (isError || isSuccess) {
        dispatch(reset());
      }
    };
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  };

  // Calculate gap position between email and password fields
  const calculateGapPosition = () => {
    if (emailRef.current && passwordRef.current && containerRef.current) {
      const emailRect = emailRef.current.getBoundingClientRect();
      const passwordRect = passwordRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate the center point between email and password fields
      const gapCenterY = (emailRect.bottom + passwordRect.top) / 2;
      const gapCenterX = (emailRect.left + emailRect.right) / 2;
      
      // Convert to relative position within container
      const relativeTop = ((gapCenterY - containerRect.top) / containerRect.height) * 100;
      const relativeLeft = ((gapCenterX - containerRect.left) / containerRect.width) * 100;
      
      setGapPosition({ top: relativeTop, left: relativeLeft });
      console.log('Gap position calculated:', { top: relativeTop, left: relativeLeft });
    }
  };

  // Zoom animation sequence
  const startZoomAnimation = async (user) => {
    console.log('Starting zoom into gap animation sequence');
    
    // Step 1: Brief validation state
    setAnimationStep('validating');
    
    // Step 2: Calculate gap position and start scaling
    setTimeout(() => {
      calculateGapPosition();
      setAnimationStep('scaling');
      
      // Step 3: Zoom into the gap
      setTimeout(() => {
        setAnimationStep('zooming');
        
        // Step 4: Navigate after zoom completes
        setTimeout(() => {
          performNavigation(user);
        }, 1500); // Allow zoom animation to complete
      }, 1000); // Scale for 1 second
    }, 300); // Brief validation delay
  };
  
  const performNavigation = (user) => {
    // Check if password change is required
    if (user?.requirePasswordChange || user?.isFirstLogin) {
      console.log('PASSWORD CHANGE REQUIRED - Redirecting to password change page');
      navigate('/change-password');
      return;
    }
    
    // Navigate directly to role-specific route
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
        redirectPath = '/app/dashboard';
    }
    
    console.log('LOGIN REDIRECT: Navigating to', redirectPath);
    navigate(redirectPath);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    
    // Start validation animation
    setAnimationStep('validating');

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

  // Handle forgot password modal open with delay to prevent autofill conflicts
  const handleForgotOpen = () => {
    try {
      // Close Safari's email autocomplete dropdown if it's open
      const emailInput = document.getElementById('email');
      if (emailInput) {
        // Blur the input to close any open autocomplete dropdowns
        emailInput.blur();
        // Force focus away from the input
        document.activeElement?.blur();
      }
      
      // Close any password manager autofill overlays (Bitwarden, 1Password, etc.)
      // These extensions often inject their own DOM elements that can conflict with modals
      const passwordManagerOverlays = document.querySelectorAll('[data-1p-ignore], [data-lpignore], [data-bitwarden-widget]');
      passwordManagerOverlays.forEach(overlay => {
        if (overlay.style) {
          overlay.style.display = 'none';
        }
      });
      
      // More aggressive: Hide any elements that might be autofill overlays
      // Look for common autofill overlay patterns
      const potentialAutofillElements = document.querySelectorAll('div[style*="position: absolute"], div[style*="position: fixed"], div[class*="autofill"], div[class*="autocomplete"]');
      potentialAutofillElements.forEach(element => {
        if (element.style && !element.classList.contains('modal') && !element.classList.contains('dialog')) {
          element.style.visibility = 'hidden';
          // Store original visibility to restore later
          element.dataset.originalVisibility = element.style.visibility;
        }
      });
      
      // Prevent any DOM manipulation errors by temporarily disabling problematic scripts
      const originalInsertBefore = Node.prototype.insertBefore;
      const originalAppendChild = Node.prototype.appendChild;
      
      // Override insertBefore to catch and ignore NotFoundError
      Node.prototype.insertBefore = function(newNode, referenceNode) {
        try {
          return originalInsertBefore.call(this, newNode, referenceNode);
        } catch (error) {
          if (error.name === 'NotFoundError') {
            console.warn('Caught and prevented NotFoundError in insertBefore:', error);
            return newNode;
          }
          throw error;
        }
      };
      
      // Override appendChild to catch and ignore NotFoundError
      Node.prototype.appendChild = function(newNode) {
        try {
          return originalAppendChild.call(this, newNode);
        } catch (error) {
          if (error.name === 'NotFoundError') {
            console.warn('Caught and prevented NotFoundError in appendChild:', error);
            return newNode;
          }
          throw error;
        }
      };
      
      // Longer delay to ensure modal is fully rendered and stable before any scripts can interfere
      setTimeout(() => {
        setForgotOpen(true);
        
        // Restore original DOM methods after modal is stable
        setTimeout(() => {
          Node.prototype.insertBefore = originalInsertBefore;
          Node.prototype.appendChild = originalAppendChild;
          
          // Restore visibility of hidden elements after modal is stable
          potentialAutofillElements.forEach(element => {
            if (element.dataset.originalVisibility !== undefined) {
              element.style.visibility = element.dataset.originalVisibility;
              delete element.dataset.originalVisibility;
            }
          });
        }, 500);
      }, 200);
      
    } catch (error) {
      console.warn('Error in handleForgotOpen, opening modal anyway:', error);
      // Fallback: just open the modal
      setForgotOpen(true);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "container mx-auto max-w-sm min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ease-in-out",
        animationStep === 'scaling' && "scale-125",
        animationStep === 'zooming' && "scale-[20] opacity-0"
      )}
      style={{
        transformOrigin: animationStep === 'zooming' ? `${gapPosition.left}% ${gapPosition.top}%` : 'center',
        transition: animationStep === 'zooming' ? 'transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 1.5s ease-out' : 'transform 1s ease-out'
      }}
    >
      <Card 
        ref={formRef}
        className={cn(
          "w-full transition-all duration-500 ease-in-out",
          animationStep === 'validating' && "scale-105 shadow-lg",
          animationStep === 'scaling' && "scale-110 shadow-xl",
          animationStep === 'zooming' && "scale-100"
        )}
      >
        <CardHeader className="flex flex-col items-center space-y-2">
          <Avatar className={cn(
            "bg-primary transition-all duration-500 ease-in-out",
            animationStep === 'validating' && "animate-pulse bg-blue-500",
            animationStep === 'scaling' && "bg-green-500 scale-110",
            animationStep === 'zooming' && "bg-green-600 scale-125"
          )}>
            <AvatarFallback>
              {animationStep === 'validating' ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
              ) : (animationStep === 'scaling' || animationStep === 'zooming') ? (
                <Check className="h-6 w-6 animate-pulse" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </AvatarFallback>
          </Avatar>
          <CardTitle className={cn(
            "text-2xl font-normal transition-all duration-500 ease-in-out",
            animationStep === 'validating' && "text-blue-600",
            (animationStep === 'scaling' || animationStep === 'zooming') && "text-green-600"
          )}>
            {animationStep === 'validating' ? 'Validating...' : 
             (animationStep === 'scaling' || animationStep === 'zooming') ? 'Logging in...' : 
             t('auth.loginTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailPlaceholder')}</Label>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={onChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.passwordPlaceholder')}</Label>
              <Input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={onChange}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveCredentials"
                name="saveCredentials"
                checked={saveCredentials}
                onCheckedChange={(checked) => 
                  onChange({ target: { name: 'saveCredentials', value: checked } })
                }
              />
              <Label htmlFor="saveCredentials" className="text-sm font-normal">
                Remember me
              </Label>
            </div>
            
            <Button
              type="submit"
              className={cn(
                "w-full transition-all duration-500 ease-in-out transform",
                animationStep === 'validating' && "bg-yellow-500 hover:bg-yellow-600 scale-105 shadow-lg",
                animationStep === 'success' && "bg-green-500 hover:bg-green-600 scale-110 shadow-xl",
                animationStep === 'zooming' && "scale-95 opacity-70"
              )}
              disabled={isLoading || animationStep !== 'idle'}
            >
              {animationStep === 'validating' ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Validating credentials...</span>
                </div>
              ) : animationStep === 'success' ? (
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 animate-bounce" />
                  <span>Login successful!</span>
                </div>
              ) : isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                t('auth.loginButton')
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full bg-muted hover:bg-muted-foreground/20 text-foreground hover:text-foreground transition-colors"
              onClick={handleForgotOpen}
            >
              Forgot password?
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <RouterLink to="/" className="flex items-center justify-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Homepage</span>
              </RouterLink>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md fade-in">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the email you use to sign in. We will notify the appropriate administrator to help reset your password.
            </p>
            <form onSubmit={handleForgot} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForgotOpen(false)} disabled={isSubmittingForgot}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingForgot}>
                  {isSubmittingForgot ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    'Send request'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} GradeBook - Progressive Web App<br />
          Created by the GradeBook Team
        </p>
      </div>
    </div>
  );
};

export default Login;
