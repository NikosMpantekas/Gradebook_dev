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
  const [animationStep, setAnimationStep] = useState('idle'); // 'idle', 'validating', 'success', 'zooming'
  const [showTick, setShowTick] = useState(false);
  const containerRef = useRef(null);
  const formRef = useRef(null);

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
        startSuccessAnimation(user);
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

  // Success animation sequence
  const startSuccessAnimation = async (user) => {
    console.log('Starting success animation sequence');
    
    // Step 1: Show validation state
    setAnimationStep('validating');
    
    // Step 2: Show success tick after brief delay
    setTimeout(() => {
      setShowTick(true);
      setAnimationStep('success');
      
      // Step 3: Start zoom effect
      setTimeout(() => {
        setAnimationStep('zooming');
        
        // Step 4: Navigate after zoom completes
        setTimeout(() => {
          performNavigation(user);
        }, 1200); // Allow zoom animation to complete
      }, 800); // Show tick for 800ms
    }, 500); // Brief validation delay
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
        animationStep === 'zooming' && "scale-150 opacity-0"
      )}
    >
      {/* Netflix/F1 Style Success Animation Overlay */}
      {showTick && (
        <div className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-600 via-green-500 to-green-400 transition-all duration-800 ease-out",
          animationStep === 'success' ? "opacity-100 scale-100" : "opacity-0 scale-75",
          animationStep === 'zooming' && "scale-125 blur-sm"
        )}>
          <div className={cn(
            "relative flex items-center justify-center transition-all duration-1000 ease-out",
            animationStep === 'success' ? "scale-100 rotate-0" : "scale-0 rotate-45"
          )}>
            {/* Animated background ring */}
            <div className="absolute w-32 h-32 border-4 border-white/30 rounded-full animate-pulse" />
            <div className="absolute w-24 h-24 border-2 border-white/50 rounded-full animate-spin" style={{animationDuration: '3s'}} />
            
            {/* Success tick icon */}
            <div className={cn(
              "w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ease-out",
              animationStep === 'success' ? "scale-100" : "scale-0"
            )}>
              <Check className="w-8 h-8 text-green-600 animate-pulse" strokeWidth={3} />
            </div>
            
            {/* Success text */}
            <div className={cn(
              "absolute top-24 text-white text-xl font-bold tracking-wide transition-all duration-700 delay-300 ease-out",
              animationStep === 'success' ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}>
              Welcome back!
            </div>
          </div>
          
          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-2 h-2 bg-white rounded-full animate-bounce",
                  animationStep === 'success' && "opacity-60"
                )}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <Card 
        ref={formRef}
        className={cn(
          "w-full transition-all duration-700 ease-in-out",
          animationStep === 'validating' && "scale-95 opacity-80 blur-sm",
          animationStep === 'success' && "scale-90 opacity-60 blur-md",
          animationStep === 'zooming' && "scale-75 opacity-30 blur-lg"
        )}
      >
        <CardHeader className="flex flex-col items-center space-y-2">
          <Avatar className={cn(
            "bg-primary transition-all duration-500 ease-in-out",
            animationStep === 'validating' && "animate-pulse bg-yellow-500",
            animationStep === 'success' && "bg-green-500 scale-110"
          )}>
            <AvatarFallback>
              {animationStep === 'validating' ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
              ) : animationStep === 'success' ? (
                <Check className="h-6 w-6 animate-bounce" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </AvatarFallback>
          </Avatar>
          <CardTitle className={cn(
            "text-2xl font-normal transition-all duration-500 ease-in-out",
            animationStep === 'validating' && "text-yellow-600",
            animationStep === 'success' && "text-green-600"
          )}>
            {animationStep === 'validating' ? 'Validating...' : 
             animationStep === 'success' ? 'Success!' : 
             t('auth.loginTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailPlaceholder')}</Label>
              <Input
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
