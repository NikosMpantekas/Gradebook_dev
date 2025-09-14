import React, { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import {
  Menu,
  Sun,
  Moon,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../config/appConfig";

// Security utilities
const SECURITY_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_SUBJECT_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 2000,
  RATE_LIMIT_DURATION: 60000, // 1 minute
  MAX_ATTEMPTS: 3,
  ALLOWED_EMAIL_DOMAINS: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'], // Optional: restrict to common domains
};

// Input sanitization function
const sanitizeInput = (input, maxLength = 100, allowSpaces = false) => {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove script tags and javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Only trim whitespace if spaces are not allowed
  if (!allowSpaces) {
    sanitized = sanitized.trim();
  }
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// Email validation function
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= SECURITY_CONFIG.MAX_EMAIL_LENGTH;
};

// Rate limiting utility
const useRateLimit = () => {
  const attemptsRef = useRef([]);
  
  const isRateLimited = () => {
    const now = Date.now();
    // Remove old attempts
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

const Logo = ({ darkMode }) => {
  return (
    <a 
      href="/home"
      className={cn(
        "text-xl sm:text-2xl md:text-3xl font-light tracking-wide",
        "no-underline hover:text-primary transition-colors",
        "relative inline-block",
        darkMode ? "text-foreground" : "text-[#23262b]"
      )}
    >
      GradeBook
    </a>
  );
};

const navLinks = [
  { label: "Πίνακας Ελέγχου", href: "/login" },
  { label: "Σχετικά με εμάς", href: "/about" },
  { label: "Επικοινωνία", href: "/contact" },
];

const Contact = () => {
  const { t } = useTranslation();
  // Persistent theme state for public pages
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('publicPageTheme');
    return saved ? JSON.parse(saved) : true; // defaults to dark
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  
  // Rate limiting
  const { isRateLimited, recordAttempt, getRemainingTime } = useRateLimit();
  
  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleToggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('publicPageTheme', JSON.stringify(newMode));
      return newMode;
    });
  };

  // Input validation
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
    
    // Sanitize input - allow spaces for message, name, and subject fields
    const allowSpaces = name === 'message' || name === 'name' || name === 'subject';
    const sanitizedValue = sanitizeInput(value, SECURITY_CONFIG[`MAX_${name.toUpperCase()}_LENGTH`], allowSpaces);
    
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
    
    // Clear error for this field
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
    
    // Security checks
    if (isRateLimited()) {
      const remainingTime = Math.ceil(getRemainingTime() / 1000);
      setSnackbar({
        open: true,
        message: `Παρακαλώ περιμένετε ${remainingTime} δευτερόλεπτα πριν δοκιμάσετε ξανά.`,
        severity: "error",
      });
      return;
    }
    
    // Validate form
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
      // Prepare secure payload
      const securePayload = {
        name: sanitizeInput(formData.name, SECURITY_CONFIG.MAX_NAME_LENGTH, true), // Allow spaces for name
        email: sanitizeInput(formData.email, SECURITY_CONFIG.MAX_EMAIL_LENGTH).toLowerCase(),
        subject: sanitizeInput(formData.subject, SECURITY_CONFIG.MAX_SUBJECT_LENGTH, true), // Allow spaces for subject
        message: sanitizeInput(formData.message, SECURITY_CONFIG.MAX_MESSAGE_LENGTH, true), // Allow spaces for message
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      };
      
      // Additional security headers
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 10000, // 10 second timeout
      };
      
      const response = await axios.post(`${API_URL}/api/contact/public`, securePayload, config);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Το μήνυμά σας στάλθηκε επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα.",
          severity: "success",
        });
        
        // Reset form
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
        // Server responded with error
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
      icon: <Mail className="w-10 h-10 text-primary" />,
      title: "Email",
      value: (
        <a 
          href="mailto:info@gradebook.pro" 
          className="text-primary hover:text-primary/80 no-underline font-medium transition-colors"
        >
          info@gradebook.pro
        </a>
      ),
      description: "Για οποιαδήποτε απορία ή αίτηση συνεργασίας στείλτε μας email.",
    },
    {
      icon: <img src="https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/discord.svg" alt="Discord" className="w-10 h-10 align-middle" />,
      title: "Discord",
      value: "To be Discord link..",
      description: "Συζητήστε μαζί μας ή με άλλους χρήστες στο Discord server μας.",
    },
  ];

  return (
    <div className={cn(
      "min-h-screen font-sans flex flex-col transition-colors duration-100",
      darkMode ? "bg-[#181b20] text-foreground" : "bg-[#f5f6fa] text-[#23262b]"
    )}>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-100 backdrop-blur-xl",
          darkMode ? "bg-[#23262b]/80 border-[#23262b]/50" : "bg-white/80 border-[#e0e0e0]/50",
          "border-b shadow-lg"
        )}
      >
        <div className="flex h-14 max-w-screen-2xl items-center px-4 mx-auto w-full">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex md:hidden text-primary mr-1"
                aria-label="menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn(
              "w-[220px] p-0 backdrop-blur-md border-r",
              darkMode 
                ? "bg-[#181b20]/80 text-foreground border-[#2a3441]/50" 
                : "bg-[#f5f6fa]/80 text-[#23262b] border-[#e0e0e0]/50"
            )}>
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Main navigation menu for the application</SheetDescription>
              </SheetHeader>
              <div className="pt-8 px-4">
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="ghost"
                      asChild
                      className={cn(
                        "justify-start hover:text-primary",
                        darkMode ? "text-foreground" : "text-[#23262b]"
                      )}
                    >
                      <a href={link.href}>{link.label}</a>
                    </Button>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Logo darkMode={darkMode} />
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                asChild
                className="text-primary font-medium hover:bg-accent"
              >
                <a href={link.href}>{link.label}</a>
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleDarkMode}
            className="ml-2 text-primary"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col pt-14">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
          <div className="text-center mb-8">
            <h1 className={cn(
              "font-bold mb-3 text-3xl md:text-5xl leading-tight",
              darkMode ? "text-foreground" : "text-[#23262b]"
            )}>
              Επικοινωνήστε μαζί μας
            </h1>
            <p className={cn(
              "max-w-[800px] mx-auto font-normal text-base md:text-lg",
              darkMode ? "text-muted-foreground" : "text-gray-600"
            )}>
              Έχετε ερωτήσεις ή χρειάζεστε βοήθεια; Επικοινωνήστε μαζί μας και θα σας απαντήσουμε άμεσα.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Contact Form */}
            <div className="md:col-span-8">
              <Card
                className={cn(
                  "shadow-md transition-colors duration-100",
                  darkMode ? "bg-[#2a3441]" : "bg-white"
                )}
              >
                <CardContent className="p-6">
                  <h2 className={cn(
                    "font-bold mb-4 text-2xl md:text-3xl",
                    darkMode ? "text-card-foreground" : "text-[#23262b]"
                  )}>
                    Στείλτε μας μήνυμα
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="mt-3 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className={cn(
                          darkMode ? "text-foreground" : "text-[#23262b]"
                        )}>Όνομα *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className={cn(
                            "transition-colors duration-100",
                            darkMode 
                              ? "bg-[#1a1e24] border-[#2a3441] focus:border-[#337ab7]" 
                              : "bg-[#f0f2f5] border-[#d1d5db] focus:border-[#337ab7]",
                            formErrors.name && "border-destructive"
                          )}
                        />
                        {formErrors.name && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {formErrors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className={cn(
                          darkMode ? "text-foreground" : "text-[#23262b]"
                        )}>Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className={cn(
                            "transition-colors duration-100",
                            darkMode 
                              ? "bg-[#1a1e24] border-[#2a3441] focus:border-[#337ab7]" 
                              : "bg-[#f0f2f5] border-[#d1d5db] focus:border-[#337ab7]",
                            formErrors.email && "border-destructive"
                          )}
                        />
                        {formErrors.email && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {formErrors.email}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject" className={cn(
                        darkMode ? "text-foreground" : "text-[#23262b]"
                      )}>Θέμα *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className={cn(
                          "transition-colors duration-100",
                          darkMode 
                            ? "bg-[#1a1e24] border-[#2a3441] focus:border-[#337ab7]" 
                            : "bg-[#f0f2f5] border-[#d1d5db] focus:border-[#337ab7]",
                          formErrors.subject && "border-destructive"
                        )}
                      />
                      {formErrors.subject && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {formErrors.subject}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message" className={cn(
                        darkMode ? "text-foreground" : "text-[#23262b]"
                      )}>Μήνυμα *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={6}
                        required
                        className={cn(
                          "transition-colors duration-100",
                          darkMode 
                            ? "bg-[#1a1e24] border-[#2a3441] focus:border-[#337ab7]" 
                            : "bg-[#f0f2f5] border-[#d1d5db] focus:border-[#337ab7]",
                          formErrors.message && "border-destructive"
                        )}
                      />
                      {formErrors.message && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {formErrors.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="bg-primary text-primary-foreground rounded-md px-6 py-3 font-bold text-base transition-all duration-200 hover:bg-primary/90 hover:-translate-y-0.5 flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                        {isSubmitting ? "Αποστολή..." : "Αποστολή Μηνύματος"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="md:col-span-4">
              <div className="mb-4">
                <h2 className={cn(
                  "font-bold mb-3 text-xl md:text-2xl",
                  darkMode ? "text-foreground" : "text-[#23262b]"
                )}>
                  Πληροφορίες Επικοινωνίας
                </h2>
                
                <div className="flex flex-col gap-3">
                  {contactInfo.map((info, index) => (
                    <Card
                      key={index}
                      className={cn(
                        "transition-all duration-300 ease-in-out",
                        "hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]",
                        "cursor-pointer",
                        darkMode 
                          ? "bg-[#2a3441] shadow-md hover:shadow-xl" 
                          : "bg-white shadow-md hover:shadow-xl"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          {info.icon}
                        </div>
                        <h3 className={cn(
                          "font-bold mb-1 text-lg",
                          darkMode ? "text-card-foreground" : "text-[#23262b]"
                        )}>
                          {info.title}
                        </h3>
                        <div className="text-primary mb-1 font-medium">
                          {info.value}
                        </div>
                        <p className={cn(
                          "text-sm",
                          darkMode ? "text-muted-foreground" : "text-gray-600"
                        )}>
                          {info.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className={cn(
        "mt-auto py-6 border-t text-center transition-colors duration-100 flex items-center justify-center",
        darkMode ? "bg-[#23262b] border-[#23262b]" : "bg-[#f5f6fa] border-[#e0e0e0]"
      )}>
        <p className={cn(
          "text-sm transition-colors duration-100",
          darkMode ? "text-gray-400" : "text-gray-700"
        )}>
          © {new Date().getFullYear()} GradeBook Team.
        </p>
      </footer>

      {/* Notification Toast */}
      {snackbar.open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={cn(
            "rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg",
            snackbar.severity === "success" 
              ? "bg-green-600 text-white" 
              : "bg-red-600 text-white"
          )}>
            {snackbar.severity === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{snackbar.message}</span>
            <button
              onClick={handleCloseSnackbar}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact; 