import React, { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  XCircle,
  Trash2,
  Plus,
  Loader2,
  LogOut,
} from "lucide-react";
import { Spinner } from "../components/ui/spinner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { cn } from "../lib/utils";
import {
  login,
  reset,
  switchAccount,
  logout,
  logoutAllAccounts,
} from "../features/auth/authSlice";
import { getSavedAccounts, removeAccount } from "../services/accountStore";
import authService from "../features/auth/authService";

const Login = () => {
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());
  const [showLoginForm, setShowLoginForm] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const isAddAccountFlow = queryParams.get("addAccount") === "true";
    return isAddAccountFlow || getSavedAccounts().length === 0;
  });
  const [switchingTo, setSwitchingTo] = useState(null);
  const [hasRemovedAccount, setHasRemovedAccount] = useState(false);

  const handleRemoveAccount = (e, account) => {
    e.stopPropagation();
    setHasRemovedAccount(true);

    const userId = user?._id || user?.id;
    if (user && userId === account.id && user.schoolId === account.schoolId) {
      dispatch(logout());
    }

    removeAccount(account.id, account.schoolId);
    const updated = getSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) {
      setShowLoginForm(true);
    }
  };

  const handleLogoutAll = () => {
    dispatch(logoutAllAccounts());
    setSavedAccounts([]);
    setShowLoginForm(true);
  };

  const handleSavedAccountClick = async (account) => {
    const key = `${account.id}_${account.schoolId ?? "none"}`;
    setSwitchingTo(key);
    dispatch(reset());
    try {
      const result = await dispatch(
        switchAccount({ id: account.id, schoolId: account.schoolId }),
      ).unwrap();

      // Navigate to the appropriate dashboard based on role
      const rolePaths = {
        superadmin: "/superadmin/dashboard",
        admin: "/app/admin",
        teacher: "/app/teacher",
        student: "/app/student",
        parent: "/app/parent",
      };
      const targetPath = rolePaths[result.role] || "/app/dashboard";
      const cacheBuster = Date.now();
      window.location.replace(`${targetPath}?v=${cacheBuster}`);
    } catch (err) {
      toast.error(err || "Failed to switch account. Please try again.");
      setSwitchingTo(null);
      // ponytail: refresh list in case the stale account was removed
      setSavedAccounts(getSavedAccounts());
      if (getSavedAccounts().length === 0) setShowLoginForm(true);
    }
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    saveCredentials: false,
  });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation states
  const [animationStep, setAnimationStep] = useState("idle"); // 'idle', 'transitioning', 'error'
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [dashboardPreloaded, setDashboardPreloaded] = useState(false);

  const { email, password, saveCredentials } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth,
  );
  // Sync theme with homepage's publicPageTheme preference
  
  useEffect(() => {
    setIsLoaded(true);
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("addAccount") === "true") {
      dispatch(reset());
    }
  }, [dispatch]);

  useEffect(() => {
    // Debug the login state
    console.log("=== LOGIN COMPONENT AUTH STATE CHECK ===");
    console.log("Login component - Auth state:", {
      isSuccess,
      isError,
      user: !!user,
      userRole: user?.role,
      hasToken: !!user?.token,
    });
    console.log("Current URL:", window.location.href);

    if (isError) {
      console.error("Login error:", message);
      toast.error(message);
      setAnimationStep("error");
      setHasSubmitted(false);
      // Reset after 3 seconds
      const timer = setTimeout(() => {
        setAnimationStep("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }

    const queryParams = new URLSearchParams(window.location.search);
    const isAddAccountFlow = queryParams.get("addAccount") === "true";

    // Only redirect automatically if:
    // 1. A login attempt was explicitly submitted during this component's lifecycle and succeeded, OR
    // 2. A user is already loaded in state, we are NOT in the "add account" flow, AND we have at most 1 saved account
    if (
      (isSuccess && hasSubmitted) ||
      (user &&
        !isAddAccountFlow &&
        !hasRemovedAccount &&
        getSavedAccounts().length <= 1)
    ) {
      console.log(
        "=== LOGIN SUCCESSFUL OR USER EXISTS - STARTING ANIMATION SEQUENCE ===",
      );
      console.log("User role:", user?.role);
      console.log("Password change required:", user?.requirePasswordChange);
      console.log("Is first login:", user?.isFirstLogin);

      // Start the success animation sequence
      if (animationStep === "idle") {
        startFadeAnimation(user);
      }
    }

    return () => {
      // Only reset when the component unmounts or when an error/success occurs
      if (isError || isSuccess) {
        dispatch(reset());
      }
    };
  }, [user, isError, isSuccess, message, navigate, dispatch, hasSubmitted]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]:
        e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Pre-load dashboard data to avoid loading screen
  const preloadDashboard = async (user) => {
    if (dashboardPreloaded) return;

    try {
      console.log("Pre-loading dashboard data...");
      // Pre-fetch essential dashboard data based on user role
      // This runs during animation to have data ready when dashboard loads
      setDashboardPreloaded(true);
    } catch (error) {
      console.warn("Dashboard preload failed:", error);
    }
  };

  // Simple fade-out login animation
  const startFadeAnimation = async (user) => {
    console.log("Starting fade login animation");

    // Start preloading dashboard data immediately
    preloadDashboard(user);

    // Fade out phase
    setAnimationStep("transitioning");

    // Navigate after fade completes
    setTimeout(() => {
      performNavigation(user);
    }, 500); // Simple fade duration
  };

  const performNavigation = (user) => {
    // Clear form fields and blur all inputs before navigating
    setFormData({
      email: "",
      password: "",
      saveCredentials: false,
    });
    document.activeElement?.blur();
    const inputs = document.querySelectorAll("#email, #password");
    inputs.forEach((input) => input.blur());

    let redirectPath;
    if (user?.requirePasswordChange || user?.isFirstLogin) {
      console.log(
        "PASSWORD CHANGE REQUIRED - Redirecting to password change page",
      );
      redirectPath = "/change-password";
    } else {
      switch (user?.role) {
        case "superadmin":
          redirectPath = "/superadmin/dashboard";
          break;
        case "admin":
          redirectPath = "/app/admin";
          break;
        case "teacher":
          redirectPath = "/app/teacher";
          break;
        case "student":
          redirectPath = "/app/student";
          break;
        case "parent":
          redirectPath = "/app/parent";
          break;
        default:
          console.error("Unknown user role:", user?.role);
          redirectPath = "/app/dashboard";
      }
    }

    console.log("LOGIN REDIRECT: Navigating to", redirectPath);
    // Use window.location.replace() instead of React Router's navigate() to force a full
    // page reload. This clears all extension-injected DOM (e.g. Bitwarden iframe) that
    // would otherwise persist across client-side navigation and get stuck on screen.
    const cacheBuster = new Date().getTime();
    window.location.replace(`${redirectPath}?v=${cacheBuster}`);
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const userData = {
      email,
      password,
      saveCredentials,
    };

    setHasSubmitted(true);
    dispatch(reset());
    dispatch(login(userData));
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Παρακαλώ εισάγετε το email σας");
      return;
    }
    setIsSubmittingForgot(true);
    try {
      await authService.forgotPasswordRequest(forgotEmail);
      toast.success(
        "Αν αυτό το email είναι εγγεγραμμένο, ειδοποιήσαμε τον αρμόδιο διαχειριστή.",
      );
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      // Backend responds generically; we also show generic success
      toast.success(
        "Αν αυτό το email είναι εγγεγραμμένο, ειδοποιήσαμε τον αρμόδιο διαχειριστή.",
      );
      setForgotOpen(false);
      setForgotEmail("");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Handle forgot password modal open
  const handleForgotOpen = () => {
    // Blur all inputs to close any autocomplete/autofill dropdowns
    document.activeElement?.blur();
    setForgotOpen(true);
  };

  return (
    <div
      className={cn(
        "min-h-screen flex font-sans transition-colors duration-300",
        "bg-zinc-900 text-zinc-100",
      )}
      style={{
        backgroundImage: `radial-gradient(${"#3f3f46"} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      {/* ===== Left Branded Panel (hidden on mobile) ===== */}
      <div
        className={cn(
          "hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center border-r",
          "border-zinc-800",
        )}
      >
        {/* Subtle theme-based glow accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/3 -left-1/4 w-[70%] h-[70%] rounded-full opacity-[0.07] blur-[100px]"
            style={{
              background:
                `radial-gradient(circle, ${"#3b82f6"} 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute -bottom-1/4 right-0 w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[80px]"
            style={{
              background:
                `radial-gradient(circle, ${"#3b82f6"} 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* Centered logo + name in a row */}
        <RouterLink
          to="/home"
          className={cn(
            "relative z-10 flex flex-row items-center gap-6 no-underline group transition-all duration-700",
            !isLoaded
              ? "opacity-0 -translate-x-4"
              : "opacity-100 translate-x-0",
          )}
        >
          <div className="w-24 h-24 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <img
              src="/logo-transparent.png"
              alt="GradeBook Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <span
            className={cn(
              "text-6xl font-serif font-bold tracking-tight",
              "text-white",
            )}
          >
            GradeBook
          </span>
        </RouterLink>
      </div>

      {/* ===== Right Form Panel ===== */}
      <div className="flex-1 flex flex-col min-h-screen relative pb-[env(safe-area-inset-bottom)]">
        {/* Mobile: Compact branded header (shown only on mobile) */}
        <div className="lg:hidden relative z-10 pt-[max(env(safe-area-inset-top),2rem)] pb-4 px-6 text-center">
          <RouterLink
            to="/home"
            className={cn(
              "text-xl font-bold font-serif py-1 no-underline",
              "text-white",
            )}
          >
            GradeBook
          </RouterLink>
        </div>

        {/* Form container */}
        <div
          className={cn(
            "flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10 transition-all duration-700",
            "opacity-100",
          )}
        >
          <div className="w-full max-w-sm">
            {/* Login Card */}
            <Card
              className={cn(
                "w-full border shadow-xl transition-all duration-300",
                "bg-zinc-900 border-zinc-800 shadow-black/40",
              )}
            >
              <CardHeader className="flex flex-col items-center space-y-3 pb-2 pt-6">
                <div className="text-center">
                  <CardTitle
                    className={cn(
                      "text-2xl font-serif font-bold tracking-tight transition-all ease-out duration-700",
                      "text-white",
                    )}
                  >
                    {animationStep === "transitioning"
                      ? "Καλώς ήρθατε!"
                      : animationStep === "error"
                        ? "Αποτυχία σύνδεσης"
                        : showLoginForm
                          ? "Σύνδεση στο GradeBook"
                          : "Καλώς ορίσατε"}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                {showLoginForm ? (
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          "text-zinc-400",
                        )}
                      >
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
                          "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20",
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          "text-zinc-400",
                        )}
                      >
                        ΚΩΔΙΚΟΣ ΠΡΟΣΒΑΣΗΣ
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="password"
                          required
                          value={password}
                          onChange={onChange}
                          className={cn(
                            "transition-colors duration-150 pr-10",
                            "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20",
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                            "text-zinc-500 hover:text-zinc-300",
                          )}
                          onClick={togglePasswordVisibility}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {showPassword
                              ? "Απόκρυψη κωδικού"
                              : "Εμφάνιση κωδικού"}
                          </span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="saveCredentials"
                        name="saveCredentials"
                        checked={saveCredentials}
                        className={cn(
                          "rounded-full transition-colors duration-150 border-muted-foreground/45",
                          "data-[state=checked]:text-zinc-900 focus-visible:ring-zinc-400",
                        )}
                        disabled={isLoading || animationStep !== "idle"}
                        onCheckedChange={(checked) =>
                          onChange({
                            target: { name: "saveCredentials", value: checked },
                          })
                        }
                      />
                      <Label
                        htmlFor="saveCredentials"
                        className={cn(
                          "text-sm font-normal",
                          "text-zinc-400",
                        )}
                      >
                        Απομνημόνευση στοιχείων
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className={cn(
                        "w-full h-12 rounded-full font-semibold text-base transition-all hover:scale-[1.02] flex items-center justify-center",
                        "bg-white text-zinc-900 hover:bg-zinc-200",
                        animationStep === "transitioning" &&
                          "scale-105 shadow-lg",
                      )}
                      disabled={isLoading || animationStep !== "idle"}
                    >
                      {animationStep === "transitioning" ? (
                        <Check className="h-5 w-5 animate-in zoom-in-50 duration-500 stroke-[3px]" />
                      ) : animationStep === "error" ? (
                        <XCircle className="h-5 w-5 animate-in zoom-in-50 duration-300" />
                      ) : isLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        "Είσοδος"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "w-full transition-colors text-sm",
                        "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                      )}
                      onClick={handleForgotOpen}
                    >
                      Ξεχάσατε τον κωδικό σας;
                    </Button>

                    {savedAccounts.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "w-full transition-colors text-sm",
                          "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                        )}
                        onClick={() => setShowLoginForm(false)}
                      >
                        Επιλογή συνδεδεμένου λογαριασμού
                      </Button>
                    )}

                    <Button
                      asChild
                      variant="ghost"
                      className={cn(
                        "w-full transition-colors text-sm",
                        "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800",
                      )}
                    >
                      <RouterLink
                        to="/home"
                        className="flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Επιστροφή στην Αρχική</span>
                      </RouterLink>
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "text-xs font-medium uppercase tracking-wider text-center mb-2",
                        "text-zinc-400",
                      )}
                    >
                      Επιλέξτε λογαριασμό για σύνδεση
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {savedAccounts.map((account) => {
                        const key = `${account.id}_${account.schoolId ?? "none"}`;
                        const isSwitching = switchingTo === key;

                        return (
                          <div
                            key={key}
                            onClick={() =>
                              !isSwitching && handleSavedAccountClick(account)
                            }
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 group",
                              "bg-zinc-900/60 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-100",
                              isSwitching && "opacity-60 pointer-events-none",
                            )}
                          >
                            <Avatar
                              className={cn(
                                "h-9 w-9 shrink-0",
                                "bg-zinc-800",
                              )}
                            >
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold flex items-center justify-center w-full h-full rounded-full",
                                  "bg-zinc-700 text-zinc-100",
                                )}
                              >
                                {account.avatarInitials ||
                                  (
                                    account.name ||
                                    (account.role === "superadmin"
                                      ? "ΔΣ"
                                      : account.role === "admin"
                                        ? "Δ"
                                        : account.role === "teacher"
                                          ? "Κ"
                                          : account.role === "student"
                                            ? "Μ"
                                            : account.role === "parent"
                                              ? "Γ"
                                              : "Λ")
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0 flex flex-col">
                              <span
                                className={cn(
                                  "text-sm font-semibold truncate",
                                  "text-white",
                                )}
                              >
                                {account.name ||
                                  (account.role === "superadmin"
                                    ? "Διαχειριστής Συστήματος"
                                    : account.role === "admin"
                                      ? "Διαχειριστής"
                                      : account.role === "teacher"
                                        ? "Καθηγητής"
                                        : account.role === "student"
                                          ? "Μαθητής"
                                          : account.role === "parent"
                                            ? "Γονέας"
                                            : "Λογαριασμός")}
                              </span>
                              <span
                                className={cn(
                                  "text-xs truncate",
                                  "text-zinc-400",
                                )}
                              >
                                {account.schoolName ||
                                  (account.role === "superadmin"
                                    ? "Σύστημα"
                                    : "GradeBook")}
                              </span>
                            </div>

                            {isSwitching ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                            ) : (
                              <button
                                onClick={(e) => handleRemoveAccount(e, account)}
                                className={cn(
                                  "p-1.5 rounded-md shrink-0 opacity-0 group-hover:opacity-100 transition-all cursor-pointer",
                                  "hover:bg-zinc-850 hover:text-red-450 text-zinc-500",
                                )}
                                aria-label="Αφαίρεση λογαριασμού"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 space-y-2">
                      <Button
                        type="button"
                        onClick={() => setShowLoginForm(true)}
                        className={cn(
                          "w-full h-11 rounded-full font-semibold text-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2",
                          "bg-zinc-800 text-white hover:bg-zinc-700",
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Σύνδεση με άλλο λογαριασμό</span>
                      </Button>

                      {savedAccounts.length > 1 && (
                        <Button
                          type="button"
                          onClick={handleLogoutAll}
                          variant="ghost"
                          className={cn(
                            "w-full h-11 rounded-full font-semibold text-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2 text-red-500 hover:text-red-650 hover:bg-red-500/10",
                          )}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Αποσύνδεση όλων</span>
                        </Button>
                      )}
                    </div>

                    <Button
                      asChild
                      variant="ghost"
                      className={cn(
                        "w-full transition-colors text-sm",
                        "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800",
                      )}
                    >
                      <RouterLink
                        to="/home"
                        className="flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Επιστροφή στην Αρχική</span>
                      </RouterLink>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile-only footer */}
            <div className="lg:hidden mt-8 text-center">
              <p
                className={cn(
                  "text-xs",
                  "text-zinc-600",
                )}
              >
                © {new Date().getFullYear()} GradeBook
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-md fade-in transition-colors",
            "bg-zinc-900 border-zinc-800 text-zinc-100",
          )}
        >
          <DialogHeader>
            <DialogTitle className="font-serif">
              Ξεχάσατε τον κωδικό σας;
            </DialogTitle>
            <DialogDescription
              className={"text-zinc-500"}
            >
              Εισαγάγετε το email σας και θα στείλουμε αίτημα για την επαναφορά
              του κωδικού σας.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p
              className={cn(
                "text-sm",
                "text-zinc-400",
              )}
            >
              Εισαγάγετε το email που χρησιμοποιείτε. Θα ειδοποιήσουμε τον
              διαχειριστή για να σας βοηθήσει.
            </p>
            <form
              onSubmit={handleForgot}
              className="space-y-4"
              autoComplete="off"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="forgot-email"
                  className={"text-zinc-400"}
                >
                  Email
                </Label>
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
                    "bg-zinc-950 border-zinc-700 text-white focus:border-blue-500/50",
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  disabled={isSubmittingForgot}
                  className={cn(
                    "border-zinc-700 text-zinc-400 hover:bg-zinc-800",
                  )}
                >
                  Ακύρωση
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className={cn(
                    "rounded-full font-semibold",
                    "bg-white text-zinc-900 hover:bg-zinc-200",
                  )}
                >
                  {isSubmittingForgot ? (
                    <div className="flex items-center space-x-2">
                      <Spinner size="sm" />
                      <span>Αποστολή...</span>
                    </div>
                  ) : (
                    "Αποστολή αιτήματος"
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
