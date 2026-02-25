import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../config/appConfig";

// Security utilities
const SECURITY_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_SUBJECT_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 2000,
  RATE_LIMIT_DURATION: 60000,
  MAX_ATTEMPTS: 3,
};

const sanitizeInput = (input, maxLength = 100, allowSpaces = false) => {
  if (typeof input !== 'string') return '';

  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  if (!allowSpaces) {
    sanitized = sanitized.trim();
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= SECURITY_CONFIG.MAX_EMAIL_LENGTH;
};

const useRateLimit = () => {
  const attemptsRef = useRef([]);

  const isRateLimited = () => {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter(
      timestamp => now - timestamp < SECURITY_CONFIG.RATE_LIMIT_DURATION
    );

    return attemptsRef.current.length >= SECURITY_CONFIG.MAX_ATTEMPTS;
  };

  const recordAttempt = () => {
    attemptsRef.current.push(Date.now());
  };

  const getRemainingTime = () => {
    if (attemptsRef.current.length === 0) return 0;
    const oldestAttempt = Math.min(...attemptsRef.current);
    const elapsed = Date.now() - oldestAttempt;
    return Math.max(0, SECURITY_CONFIG.RATE_LIMIT_DURATION - elapsed);
  };

  return { isRateLimited, recordAttempt, getRemainingTime };
};

const Logo = ({ darkMode, currentPath }) => {
  const isHome = currentPath === "/home" || currentPath === "/";
  return (
    <Link
      to="/home"
      className={cn(
        "relative text-xl font-bold tracking-tight font-serif py-1 group",
        "no-underline transition-all duration-300",
        isHome
          ? (darkMode ? "text-white" : "text-slate-900")
          : (darkMode ? "text-zinc-300 hover:text-white" : "text-slate-700 hover:text-slate-900")
      )}
    >
      GradeBook
      <span
        className={cn(
          "absolute -bottom-1 left-0 h-[2px] rounded-full transition-all duration-300 ease-out",
          darkMode ? "bg-white" : "bg-slate-900",
          isHome ? "w-full" : "w-0 group-hover:w-full"
        )}
      />
    </Link>
  );
};

const navLinks = [
  { label: "Πίνακας Ελέγχου", href: "/login" },
  { label: "Σχετικά με εμάς", href: "/about", match: "/about" },
  { label: "Επικοινωνία", href: "/contact", match: "/contact" },
];

const Contact = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('publicPageTheme');
    return saved ? JSON.parse(saved) : true;
  });

  // Check if user is already logged in
  const loggedInUser = (() => {
    try {
      const stored = sessionStorage.getItem('user') || localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const dashboardPath = loggedInUser ? (
    loggedInUser.role === 'superadmin' ? '/superadmin/dashboard' :
      loggedInUser.role === 'admin' ? '/app/admin' :
        loggedInUser.role === 'teacher' ? '/app/teacher' :
          loggedInUser.role === 'student' ? '/app/student' :
            loggedInUser.role === 'parent' ? '/app/parent' :
              '/login'
  ) : '/login';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { isRateLimited, recordAttempt, getRemainingTime } = useRateLimit();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('publicPageTheme', JSON.stringify(newMode));
      return newMode;
    });
  };

  const validateField = (name, value) => {
    const errors = {};

    switch (name) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'Το όνομα είναι υποχρεωτικό';
        } else if (value.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
          errors.name = `Το όνομα δεν μπορεί να υπερβαίνει τους ${SECURITY_CONFIG.MAX_NAME_LENGTH} χαρακτήρες`;
        } else if (!/^[a-zA-Zα-ωΑ-Ω\s]+$/.test(value.trim())) {
          errors.name = 'Το όνομα πρέπει να περιέχει μόνο γράμματα';
        }
        break;

      case 'email':
        if (!value.trim()) {
          errors.email = 'Το email είναι υποχρεωτικό';
        } else if (!validateEmail(value.trim())) {
          errors.email = 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email';
        }
        break;

      case 'subject':
        if (!value.trim()) {
          errors.subject = 'Το θέμα είναι υποχρεωτικό';
        } else if (value.length > SECURITY_CONFIG.MAX_SUBJECT_LENGTH) {
          errors.subject = `Το θέμα δεν μπορεί να υπερβαίνει τους ${SECURITY_CONFIG.MAX_SUBJECT_LENGTH} χαρακτήρες`;
        }
        break;

      case 'message':
        if (!value.trim()) {
          errors.message = 'Το μήνυμα είναι υποχρεωτικό';
        } else if (value.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
          errors.message = `Το μήνυμα δεν μπορεί να υπερβαίνει τους ${SECURITY_CONFIG.MAX_MESSAGE_LENGTH} χαρακτήρες`;
        }
        break;

      default:
        break;
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const allowSpaces = name === 'message' || name === 'name' || name === 'subject';
    const sanitizedValue = sanitizeInput(value, SECURITY_CONFIG[`MAX_${name.toUpperCase()}_LENGTH`], allowSpaces);

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const validateForm = () => {
    const errors = {};

    Object.keys(formData).forEach(field => {
      const fieldErrors = validateField(field, formData[field]);
      Object.assign(errors, fieldErrors);
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRateLimited()) {
      const remainingTime = Math.ceil(getRemainingTime() / 1000);
      setSnackbar({
        open: true,
        message: `Παρακαλώ περιμένετε ${remainingTime} δευτερόλεπτα πριν δοκιμάσετε ξανά.`,
        severity: "error",
      });
      return;
    }

    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: "Παρακαλώ διορθώστε τα σφάλματα στη φόρμα.",
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    recordAttempt();

    try {
      const securePayload = {
        name: sanitizeInput(formData.name, SECURITY_CONFIG.MAX_NAME_LENGTH, true),
        email: sanitizeInput(formData.email, SECURITY_CONFIG.MAX_EMAIL_LENGTH).toLowerCase(),
        subject: sanitizeInput(formData.subject, SECURITY_CONFIG.MAX_SUBJECT_LENGTH, true),
        message: sanitizeInput(formData.message, SECURITY_CONFIG.MAX_MESSAGE_LENGTH, true),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 10000,
      };

      const response = await axios.post(`${API_URL}/api/contact/public`, securePayload, config);

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Το μήνυμά σας στάλθηκε επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα.",
          severity: "success",
        });

        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
        setFormErrors({});
      } else {
        throw new Error(response.data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Contact form submission error:', error);

      let errorMessage = "Προέκυψε σφάλμα κατά την αποστολή του μηνύματος. Παρακαλώ δοκιμάστε ξανά.";

      if (error.response) {
        if (error.response.status === 429) {
          errorMessage = "Πάρα πολλές προσπάθειες. Παρακαλώ περιμένετε λίγο πριν δοκιμάσετε ξανά.";
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || "Μη έγκυρα δεδομένα.";
        } else if (error.response.status === 403) {
          errorMessage = "Πρόσβαση απορρίφθηκε.";
        } else if (error.response.status >= 500) {
          errorMessage = "Πρόβλημα με τον διακομιστή. Παρακαλώ δοκιμάστε ξανά αργότερα.";
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Η σύνδεση έληξε. Παρακαλώ ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.";
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = "Πρόβλημα δικτύου. Παρακαλώ ελέγξτε τη σύνδεσή σας.";
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      value: "info@gradebook.pro",
      href: "mailto:info@gradebook.pro",
      description: "Η ομάδα μας είναι εδώ για να σας βοηθήσει.",
      colorClass: "bg-blue-500/10 text-blue-400"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Discord",
      value: "Coming soon...",
      href: "#",
      description: "Γίνετε μέλος της κοινότητάς μας.",
      colorClass: "bg-purple-500/10 text-purple-400"
    },
  ];

  return (
    <div className={cn(
      "min-h-screen font-sans flex flex-col transition-colors duration-300 selection:bg-yellow-200 selection:text-zinc-900",
      darkMode ? "bg-zinc-900 text-zinc-100" : "bg-gray-50 text-slate-900"
    )}
      style={{
        backgroundImage: `radial-gradient(${darkMode ? '#3f3f46' : '#cbd5e1'} 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }}
    >

      {/* Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
          scrolled
            ? (darkMode ? "bg-zinc-900/80 border-b border-zinc-800/50 backdrop-blur-md" : "bg-gray-50/80 border-b border-slate-200/50 backdrop-blur-md")
            : "bg-transparent border-transparent"
        )}
      >
        <div className="flex h-16 max-w-7xl items-center px-6 mx-auto w-full">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="flex md:hidden mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn("w-[280px] p-0 backdrop-blur-xl border-r", darkMode ? "bg-[#09090b]/90 border-zinc-800" : "bg-white/90 border-slate-200")}>
              <SheetHeader className="p-6 border-b border-zinc-100/10">
                <Logo darkMode={darkMode} currentPath={currentPath} />
              </SheetHeader>
              <div className="p-4">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const isActive = currentPath === link.match;
                    const resolvedHref = link.href === '/login' && loggedInUser ? dashboardPath : link.href;
                    return (
                      <Button key={link.label} variant="ghost" asChild className={cn(
                        "justify-start text-sm font-medium h-10 px-4 rounded-md",
                        isActive
                          ? (darkMode ? "bg-zinc-800 text-white" : "bg-slate-100 text-slate-900")
                          : (darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-900")
                      )}>
                        <Link to={resolvedHref}>{link.label}</Link>
                      </Button>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Logo darkMode={darkMode} currentPath={currentPath} />
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = currentPath === link.match;
              const resolvedHref = link.href === '/login' && loggedInUser ? dashboardPath : link.href;
              return (
                <Link
                  key={link.label}
                  to={resolvedHref}
                  className={cn(
                    "relative text-sm font-medium transition-colors duration-300 py-1 group",
                    isActive
                      ? (darkMode ? "text-white" : "text-slate-900")
                      : (darkMode ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute -bottom-1 left-0 h-[2px] rounded-full transition-all duration-300 ease-out",
                      darkMode ? "bg-white" : "bg-slate-900",
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    )}
                  />
                </Link>
              );
            })}
          </div>
          <div className="w-px h-4 mx-6 bg-slate-200/20 hidden md:block" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleToggleDarkMode} className={cn("rounded-full transition-colors w-8 h-8", darkMode ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 pt-20">
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

            {/* Left Column: Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-10"
            >
              <div className="space-y-6">
                <h1 className={cn(
                  "font-serif font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1]",
                  darkMode ? "text-white" : "text-slate-900"
                )}>
                  Επικοινωνήστε μαζί μας
                </h1>

                <p className={cn(
                  "text-lg md:text-xl leading-relaxed max-w-lg",
                  darkMode ? "text-zinc-400" : "text-slate-600"
                )}>
                  Έχετε κάποια ερώτηση ή πρόταση; Συμπληρώστε τη φόρμα και η ομάδα μας θα επικοινωνήσει μαζί σας το συντομότερο δυνατό.
                </p>
              </div>

              <div className="grid gap-6">
                {contactInfo.map((info, index) => (
                  <motion.a
                    key={info.title}
                    href={info.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className={cn(
                      "group flex items-center gap-6 p-4 rounded-xl transition-all duration-300 border",
                      darkMode
                        ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:shadow-xl"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      darkMode
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                    )}>
                      {info.icon}
                    </div>
                    <div>
                      <h3 className={cn(
                        "font-serif font-bold text-lg mb-1",
                        darkMode ? "text-white" : "text-slate-900"
                      )}>
                        {info.title}
                      </h3>
                      <p className={cn(
                        "text-sm font-medium mb-1",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}>
                        {info.value}
                      </p>
                      <p className={cn(
                        "text-xs",
                        darkMode ? "text-zinc-500" : "text-slate-500"
                      )}>
                        {info.description}
                      </p>
                    </div>
                    <ArrowRight className={cn(
                      "ml-auto w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1",
                      darkMode ? "text-zinc-600 group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-600"
                    )} />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Right Column: Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className={cn(
                "border transition-all duration-300 shadow-2xl",
                darkMode
                  ? "bg-zinc-900/50 border-zinc-800"
                  : "bg-white border-slate-200"
              )}>
                <CardContent className="p-8 md:p-10">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className={cn("text-sm font-medium", darkMode ? "text-zinc-300" : "text-slate-700")}>Όνομα</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Γιάννης Παπαδόπουλος"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={cn(
                            "h-12 px-4 rounded-md transition-all duration-300",
                            darkMode
                              ? "bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
                              : "bg-white border-slate-300 focus:border-blue-500",
                            formErrors.name && "border-red-500"
                          )}
                        />
                        {formErrors.name && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {formErrors.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className={cn("text-sm font-medium", darkMode ? "text-zinc-300" : "text-slate-700")}>Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={cn(
                            "h-12 px-4 rounded-md transition-all duration-300",
                            darkMode
                              ? "bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
                              : "bg-white border-slate-300 focus:border-blue-500",
                            formErrors.email && "border-red-500"
                          )}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {formErrors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className={cn("text-sm font-medium", darkMode ? "text-zinc-300" : "text-slate-700")}>Θέμα</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="Πώς μπορούμε να βοηθήσουμε;"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className={cn(
                          "h-12 px-4 rounded-md transition-all duration-300",
                          darkMode
                            ? "bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
                            : "bg-white border-slate-300 focus:border-blue-500",
                          formErrors.subject && "border-red-500"
                        )}
                      />
                      {formErrors.subject && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {formErrors.subject}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className={cn("text-sm font-medium", darkMode ? "text-zinc-300" : "text-slate-700")}>Μήνυμα</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Γράψτε το μήνυμά σας εδώ..."
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={5}
                        className={cn(
                          "resize-none p-4 rounded-md transition-all duration-300",
                          darkMode
                            ? "bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
                            : "bg-white border-slate-300 focus:border-blue-500",
                          formErrors.message && "border-red-500"
                        )}
                      />
                      {formErrors.message && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {formErrors.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full h-14 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105",
                        darkMode
                          ? "bg-white text-zinc-900 hover:bg-zinc-200"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Αποστολή...
                        </>
                      ) : (
                        <>
                          Αποστολή Μηνύματος
                          <Send className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo darkMode={darkMode} currentPath={currentPath} />
          <p className={cn("text-sm", darkMode ? "text-zinc-600" : "text-slate-400")}>
            © {new Date().getFullYear()} The GradeBook Team
          </p>
        </div>
      </footer>

      {/* Notification Toast */}
      <AnimatePresence>
        {snackbar.open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={cn(
              "rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl border backdrop-blur-md",
              snackbar.severity === "success"
                ? (darkMode ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700")
                : (darkMode ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700")
            )}>
              {snackbar.severity === "success" ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="font-medium text-sm">{snackbar.message}</span>
              <button
                onClick={handleCloseSnackbar}
                className="ml-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Contact;
