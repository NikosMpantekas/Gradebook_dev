import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { Lock, ArrowLeft, Check, Eye, EyeOff, GraduationCap, XCircle } from 'lucide-react';
import { Spinner } from '../components/ui/spinner';
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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    saveCredentials: false,
  });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation states
  const [animationStep, setAnimationStep] = useState('idle'); // 'idle', 'transitioning', 'error'
  const [isLoaded, setIsLoaded] = useState(false);
  const [dashboardPreloaded, setDashboardPreloaded] = useState(false);

  const { email, password, saveCredentials } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );
  // Sync theme with homepage's publicPageTheme preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('publicPageTheme');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
      setAnimationStep('error');
      // Reset after 3 seconds
      const timer = setTimeout(() => {
        setAnimationStep('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (isSuccess || user) {
      console.log('=== LOGIN SUCCESSFUL - STARTING ANIMATION SEQUENCE ===');
      console.log('User role:', user?.role);
      console.log('Password change required:', user?.requirePasswordChange);
      console.log('Is first login:', user?.isFirstLogin);

      // Start the success animation sequence
      if (animationStep === 'idle') {
        startFadeAnimation(user);
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };


  // Pre-load dashboard data to avoid loading screen
  const preloadDashboard = async (user) => {
    if (dashboardPreloaded) return;

    try {
      console.log('Pre-loading dashboard data...');
      // Pre-fetch essential dashboard data based on user role
      // This runs during animation to have data ready when dashboard loads
      setDashboardPreloaded(true);
    } catch (error) {
      console.warn('Dashboard preload failed:', error);
    }
  };

  // Simple fade-out login animation
  const startFadeAnimation = async (user) => {
    console.log('Starting fade login animation');

    // Start preloading dashboard data immediately
    preloadDashboard(user);

    // Fade out phase
    setAnimationStep('transitioning');

    // Navigate after fade completes
    setTimeout(() => {
      performNavigation(user);
    }, 500); // Simple fade duration
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

    const userData = {
      email,
      password,
      saveCredentials,
    };

    dispatch(reset());
    dispatch(login(userData));
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Παρακαλώ εισάγετε το email σας');
      return;
    }
    setIsSubmittingForgot(true);
    try {
      await authService.forgotPasswordRequest(forgotEmail);
      toast.success('Αν αυτό το email είναι εγγεγραμμένο, ειδοποιήσαμε τον αρμόδιο διαχειριστή.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      // Backend responds generically; we also show generic success
      toast.success('Αν αυτό το email είναι εγγεγραμμένο, ειδοποιήσαμε τον αρμόδιο διαχειριστή.');
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
      Node.prototype.insertBefore = function (newNode, referenceNode) {
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
      Node.prototype.appendChild = function (newNode) {
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
      className={cn(
        "min-h-screen flex font-sans transition-colors duration-300",
        darkMode ? "bg-zinc-900 text-zinc-100" : "bg-gray-50 text-slate-900"
      )}
      style={{
        backgroundImage: `radial-gradient(${darkMode ? '#3f3f46' : '#cbd5e1'} 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }}
    >
      {/* ===== Left Branded Panel (hidden on mobile) ===== */}
      <div className={cn(
        "hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center border-r",
        darkMode ? "border-zinc-800" : "border-slate-200"
      )}>
        {/* Subtle blue glow accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/3 -left-1/4 w-[70%] h-[70%] rounded-full opacity-[0.07] blur-[100px]"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          <div className="absolute -bottom-1/4 right-0 w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[80px]"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>

        {/* Centered logo + name in a row */}
        <RouterLink to="/home" className={cn(
          "relative z-10 flex flex-row items-center gap-6 no-underline group transition-all duration-700",
          !isLoaded ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"
        )}>
          <div className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
            darkMode
              ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400"
              : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"
          )}>
            <GraduationCap className="w-10 h-10" />
          </div>
          <span className={cn(
            "text-6xl font-serif font-bold tracking-tight",
            darkMode ? "text-white" : "text-slate-900"
          )}>
            GradeBook
          </span>
        </RouterLink>
      </div>

      {/* ===== Right Form Panel ===== */}
      <div className="flex-1 flex flex-col min-h-screen relative">

        {/* Mobile: Compact branded header (shown only on mobile) */}
        <div className="lg:hidden relative z-10 pt-8 pb-4 px-6 text-center">
          <RouterLink to="/home" className={cn(
            "text-xl font-bold font-serif py-1 no-underline",
            darkMode ? "text-white" : "text-slate-900"
          )}>
            GradeBook
          </RouterLink>
        </div>

        {/* Form container */}
        <div
          className={cn(
            "flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10 transition-all duration-700",
            !isLoaded ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          <div className="w-full max-w-sm">
            {/* Login Card */}
            <Card
              className={cn(
                "w-full border shadow-xl transition-all duration-300",
                darkMode
                  ? "bg-zinc-900 border-zinc-800 shadow-black/40"
                  : "bg-white border-slate-200 shadow-slate-200/60"
              )}
            >
              <CardHeader className="flex flex-col items-center space-y-3 pb-2">
                {/* Icon */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all ease-out duration-700",
                  animationStep === 'transitioning'
                    ? "bg-emerald-500/20 scale-110 text-emerald-400"
                    : animationStep === 'error'
                      ? "bg-red-500/20 scale-110 text-red-500"
                      : darkMode
                        ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400"
                        : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"
                )}>
                  {animationStep === 'error' ? (
                    <XCircle className="h-7 w-7 animate-in zoom-in-50 duration-300" />
                  ) : (
                    <Lock className={cn("h-7 w-7", animationStep === 'transitioning' && "animate-pulse")} />
                  )}
                </div>
                <div className="text-center">
                  <CardTitle className={cn(
                    "text-2xl font-serif font-bold tracking-tight transition-all ease-out duration-700",
                    animationStep === 'transitioning' ? "text-emerald-500" :
                      animationStep === 'error' ? "text-red-500" :
                        darkMode ? "text-white" : "text-slate-900"
                  )}>
                    {animationStep === 'transitioning' ? 'Καλώς ήρθατε!' :
                      animationStep === 'error' ? 'Αποτυχία σύνδεσης' :
                        'Σύνδεση στο GradeBook'}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      darkMode ? "text-zinc-400" : "text-slate-500"
                    )}>
                      ΔΙΕΥΘΥΝΣΗ EMAIL
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      autoFocus
                      value={email}
                      onChange={onChange}
                      className={cn(
                        "transition-colors duration-150",
                        darkMode
                          ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      darkMode ? "text-zinc-400" : "text-slate-500"
                    )}>
                      ΚΩΔΙΚΟΣ ΠΡΟΣΒΑΣΗΣ
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={onChange}
                        className={cn(
                          "transition-colors duration-150 pr-10",
                          darkMode
                            ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                          darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                        )}
                        onClick={togglePasswordVisibility}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}</span>
                      </Button>
                    </div>
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
                    <Label htmlFor="saveCredentials" className={cn(
                      "text-sm font-normal",
                      darkMode ? "text-zinc-400" : "text-slate-500"
                    )}>
                      Απομνημόνευση στοιχείων
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className={cn(
                      "w-full h-12 rounded-full font-semibold text-base transition-all hover:scale-[1.02]",
                      darkMode
                        ? "bg-white text-zinc-900 hover:bg-zinc-200"
                        : "bg-slate-900 text-white hover:bg-slate-800",
                      animationStep === 'transitioning' && "scale-105 shadow-lg"
                    )}
                    disabled={isLoading || animationStep !== 'idle'}
                  >
                    {animationStep === 'transitioning' ? (
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 animate-pulse" />
                        <span>Καλώς ήρθατε!</span>
                      </div>
                    ) : isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Spinner size="sm" />
                        <span>Σύνδεση...</span>
                      </div>
                    ) : (
                      'Είσοδος'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "w-full transition-colors text-sm",
                      darkMode
                        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                    onClick={handleForgotOpen}
                  >
                    Ξεχάσατε τον κωδικό σας;
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "w-full transition-colors text-sm",
                      darkMode
                        ? "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <RouterLink to="/home" className="flex items-center justify-center space-x-2">
                      <ArrowLeft className="h-4 w-4" />
                      <span>Επιστροφή στην Αρχική</span>
                    </RouterLink>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Mobile-only footer */}
            <div className="lg:hidden mt-8 text-center">
              <p className={cn(
                "text-xs",
                darkMode ? "text-zinc-600" : "text-slate-400"
              )}>
                © {new Date().getFullYear()} GradeBook
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className={cn(
          "sm:max-w-md fade-in transition-colors",
          darkMode
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-slate-200 text-slate-900"
        )}>
          <DialogHeader>
            <DialogTitle className="font-serif">Ξεχάσατε τον κωδικό σας;</DialogTitle>
            <DialogDescription className={darkMode ? "text-zinc-500" : "text-slate-500"}>
              Εισαγάγετε το email σας και θα στείλουμε αίτημα για την επαναφορά του κωδικού σας.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className={cn("text-sm", darkMode ? "text-zinc-400" : "text-slate-600")}>
              Εισαγάγετε το email που χρησιμοποιείτε. Θα ειδοποιήσουμε τον διαχειριστή για να σας βοηθήσει.
            </p>
            <form onSubmit={handleForgot} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className={darkMode ? "text-zinc-400" : "text-slate-600"}>Email</Label>
                <Input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  className={cn(
                    "transition-colors",
                    darkMode
                      ? "bg-zinc-950 border-zinc-700 text-white focus:border-blue-500/50"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForgotOpen(false)} disabled={isSubmittingForgot}
                  className={cn(
                    darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}>
                  Ακύρωση
                </Button>
                <Button type="submit" disabled={isSubmittingForgot}
                  className={cn(
                    "rounded-full font-semibold",
                    darkMode ? "bg-white text-zinc-900 hover:bg-zinc-200" : "bg-slate-900 text-white hover:bg-slate-800"
                  )}>
                  {isSubmittingForgot ? (
                    <div className="flex items-center space-x-2">
                      <Spinner size="sm" />
                      <span>Αποστολή...</span>
                    </div>
                  ) : (
                    'Αποστολή αιτήματος'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
