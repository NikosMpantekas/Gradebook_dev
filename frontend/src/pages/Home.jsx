import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  List,
  Sun,
  Moon,
  ArrowRight,
  GraduationCap,
  ChalkboardTeacher,
  Buildings,
  Users,
  Notebook,
  CalendarCheck,
  ChatCircleDots,
  CircleWavyCheck
} from "phosphor-react";

const Logo = ({ darkMode, currentPath }) => {
  const isHome = currentPath === "/home" || currentPath === "/";
  return (
    <Link
      to="/home"
      className={cn(
        "relative flex items-center gap-3 text-xl font-bold tracking-tight font-serif py-1 group",
        "no-underline transition-all duration-300",
        isHome
          ? (darkMode ? "text-white" : "text-slate-900")
          : (darkMode ? "text-zinc-300 hover:text-white" : "text-slate-700 hover:text-slate-900")
      )}
    >
      <img src="/logo-transparent.png" alt="Logo" className="w-9 h-9 object-contain" />
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

const DashboardMockup = ({ darkMode }) => (
  <div className={cn(
    "relative rounded-xl shadow-2xl overflow-hidden border",
    darkMode ? "bg-zinc-950 border-zinc-700 shadow-black/60" : "bg-white border-slate-300 shadow-slate-300/50"
  )}>
    {/* Browser Bar */}
    <div className={cn(
      "h-10 border-b flex items-center px-4 gap-2",
      darkMode ? "bg-zinc-900 border-zinc-700" : "bg-slate-100 border-slate-200"
    )}>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      <div className={cn(
        "flex-1 max-w-sm mx-auto h-6 rounded-md flex items-center justify-center text-[10px] font-mono",
        darkMode ? "bg-zinc-800 text-zinc-400" : "bg-white text-slate-500 border border-slate-200"
      )}>
        gradebook.pro/dashboard
      </div>
    </div>

    {/* App Content */}
    <div className="flex h-[400px] md:h-[600px]">
      {/* Sidebar */}
      <div className={cn(
        "hidden md:flex w-64 border-r p-4 flex-col gap-3",
        darkMode ? "bg-zinc-900 border-zinc-700" : "bg-slate-50 border-slate-200"
      )}>
        <div className={cn("h-8 w-32 rounded-md mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-100")} />
        {["bg-blue-500/30", "bg-zinc-700", "bg-zinc-700", "bg-zinc-700", "bg-zinc-700"].map((c, i) => (
          <div key={i} className={cn(
            "h-9 w-full rounded-lg",
            darkMode
              ? (i === 0 ? "bg-blue-500/15 border border-blue-500/20" : "bg-zinc-800")
              : (i === 0 ? "bg-blue-50 border border-blue-200" : "bg-slate-100")
          )} />
        ))}
      </div>

      {/* Main Area */}
      <div className={cn("flex-1 p-4 md:p-8 overflow-hidden", darkMode ? "bg-zinc-950" : "bg-gray-50")}>
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className={cn("h-7 md:h-8 w-36 md:w-48 rounded-md", darkMode ? "bg-zinc-700" : "bg-slate-300")} />
          <div className="flex gap-2">
            <div className={cn("h-8 w-8 rounded-full", darkMode ? "bg-blue-500/20" : "bg-blue-100")} />
            <div className={cn("h-8 w-8 rounded-full", darkMode ? "bg-zinc-700" : "bg-slate-300")} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6 md:mb-8">
          {[
            { accent: darkMode ? "border-l-blue-500" : "border-l-blue-500", dot: "bg-blue-500" },
            { accent: darkMode ? "border-l-emerald-500" : "border-l-emerald-500", dot: "bg-emerald-500" },
            { accent: darkMode ? "border-l-amber-500" : "border-l-amber-500", dot: "bg-amber-500" },
          ].map((card, i) => (
            <div key={i} className={cn(
              "h-24 md:h-32 rounded-xl border border-l-4 p-4 flex flex-col justify-center",
              card.accent,
              darkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-slate-200"
            )}>
              <div className={cn("w-3 h-3 rounded-full mb-3", card.dot)} />
              <div className={cn("h-3 md:h-4 w-20 rounded-md mb-2", darkMode ? "bg-zinc-700" : "bg-slate-200")} />
              <div className={cn("h-5 md:h-7 w-14 rounded-md", darkMode ? "bg-zinc-600" : "bg-slate-300")} />
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className={cn(
          "h-48 md:h-64 rounded-xl border p-4",
          darkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-slate-200"
        )}>
          <div className={cn("h-3 w-24 rounded-md mb-4", darkMode ? "bg-zinc-700" : "bg-slate-200")} />
          <svg viewBox="0 0 400 150" className="w-full h-[calc(100%-24px)]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mockupGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M0,120 C40,100 60,80 100,70 C140,60 160,90 200,50 C240,10 280,30 320,25 C360,20 380,40 400,15 L400,150 L0,150 Z" fill="url(#mockupGrad)" />
            <path d="M0,120 C40,100 60,80 100,70 C140,60 160,90 200,50 C240,10 280,30 320,25 C360,20 380,40 400,15" fill="none" stroke={darkMode ? "#3b82f6" : "#2563eb"} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Parallax - Synchronized for both to move together
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, -100]);
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  // Persistent theme state
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
          "pt-[env(safe-area-inset-top)]",
          scrolled
            ? (darkMode ? "bg-zinc-900/80 border-b border-zinc-800/50 backdrop-blur-md" : "bg-gray-50/80 border-b border-slate-200/50 backdrop-blur-md")
            : "bg-transparent border-transparent"
        )}
      >
        <div className="flex h-16 max-w-7xl items-center px-6 mx-auto w-full">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="flex md:hidden mr-2">
                <List size={20} weight="bold" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={cn("w-[280px] p-0 backdrop-blur-xl border-r pb-[env(safe-area-inset-bottom)]", darkMode ? "bg-[#09090b]/90 border-zinc-800" : "bg-white/90 border-slate-200")}>
              <SheetHeader className="px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-6 border-b border-zinc-100/10">
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
              {darkMode ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Standard Layout */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto flex flex-col items-center w-full relative">
            {/* Text Content */}
            <motion.div
              style={{ y: parallaxY, opacity: heroOpacity }}
              className="text-center space-y-8 max-w-4xl mb-16 relative z-20"
            >
              <style>{`
                @keyframes highlighter {
                  from {
                    width: 0;
                  }
                  to {
                    width: calc(100% + 1rem);
                  }
                }
              `}</style>
              <h1 className={cn(
                "font-serif font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1]",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Η οργάνωση του φροντιστηρίου σας, <br className="hidden md:block" />
                <span className="relative md:whitespace-nowrap inline-block">
                  <span
                    className={cn(
                      "absolute -left-2 -right-2 top-2/3 bottom-1 -z-10 transform -rotate-1 rounded-sm opacity-60",
                      darkMode ? "bg-blue-600" : "bg-blue-200"
                    )}
                    style={{
                      animation: "highlighter 0.8s ease-out 0.8s forwards",
                      transformOrigin: "left center",
                      width: 0
                    }}
                  ></span>
                  πιο απλή από ποτέ.
                </span>
              </h1>
              <p className={cn(
                "text-lg md:text-xl max-w-2xl mx-auto leading-relaxed",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Το GradeBook είναι το σύγχρονο εργαλείο για την διαχείριση τάξεων,
                μαθητών και βαθμολογιών.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className={cn("h-12 px-8 rounded-full font-semibold text-base transition-all hover:scale-105", darkMode ? "bg-white text-zinc-900 hover:bg-zinc-200" : "bg-slate-900 text-white hover:bg-slate-800")}>
                  <Link to={dashboardPath} className="flex items-center gap-2 group">
                    {loggedInUser ? "Συνεχίστε στο GradeBook" : "Συνδεθείτε στο GradeBook"}
                    <motion.div
                      whileHover={{ scale: 1.2, x: loggedInUser ? 4 : 0, rotate: loggedInUser ? 0 : 10 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {loggedInUser ? <ArrowRight size={20} weight="bold" /> : <GraduationCap size={20} weight="bold" />}
                    </motion.div>
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              style={{ y: parallaxY }}
              className={cn(
                "w-full max-w-6xl px-4 md:px-8",
                "absolute top-60 left-0 opacity-40 scale-110 pointer-events-none z-10", // Mobile: perfectly behind text
                "md:relative md:top-0 md:opacity-100 md:scale-100 md:pointer-events-auto md:z-20" // Desktop: below
              )}
            >
              <DashboardMockup darkMode={darkMode} />
            </motion.div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className={cn(
          "py-24 px-6 border-t",
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-slate-200"
        )} id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className={cn(
                "text-3xl md:text-5xl font-serif font-bold mb-6 tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Όλα τα εργαλεία σε μία πλατφόρμα
              </h2>
              <p className={cn(
                "text-xl",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Αντικαταστήστε τα πολύπλοκα excel και τα τετράδια με ένα ολοκληρωμένο σύστημα.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Card - Analytics */}
              <div className="md:col-span-2 md:row-span-2">
                <Card className={cn(
                  "h-full p-8 flex flex-col justify-between border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className="flex-1">
                    <div className={cn(
                      "w-14 h-14 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}>
                      <Notebook size={48} weight="bold" />
                    </div>
                    <h3 className={cn("text-2xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                      Βαθμολόγιο & Αξιολογήσεις
                    </h3>
                    <p className={cn("text-lg leading-relaxed max-w-md", darkMode ? "text-zinc-400" : "text-slate-600")}>
                      Διατηρήστε πλήρες ιστορικό βαθμολογιών για διαγωνίσματα και εξετάσεις.
                      Εξάγετε αυτόματα δελτία προόδου για κάθε τρίμηνο.
                    </p>
                  </div>
                  <div className="flex gap-6 mt-12 justify-center">
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-full h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="text-4xl font-bold text-emerald-500">19.5</div>
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Μ.Ο. Τάξης</div>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-full h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="text-4xl font-bold text-blue-500">A</div>
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Επίδοση</div>
                    </motion.div>
                  </div>
                </Card>
              </div>

              {/* Small Card 1 - Attendance */}
              <div>
                <Card className={cn(
                  "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                    darkMode ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    <CalendarCheck size={40} weight="bold" />
                  </div>
                  <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                    Παρουσίες
                  </h3>
                  <p className={cn("text-base leading-relaxed", darkMode ? "text-zinc-400" : "text-slate-600")}>
                    Καταγραφή απουσιών με ένα κλικ και αυτόματη ενημέρωση γονέων μέσω ειδοποιήσεων.
                  </p>
                </Card>
              </div>

              {/* Small Card 2 - Communication */}
              <div>
                <Card className={cn(
                  "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                    darkMode ? "text-purple-400" : "text-purple-600"
                  )}>
                    <ChatCircleDots size={40} weight="bold" />
                  </div>
                  <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                    Επικοινωνία
                  </h3>
                  <p className={cn("text-base leading-relaxed", darkMode ? "text-zinc-400" : "text-slate-600")}>
                    Στείλτε μαζικά μηνύματα και ανακοινώσεις σε μαθητές και γονείς.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Role-Based Benefits */}
        <section className={cn(
          "py-24 px-6 border-t",
          darkMode ? "border-zinc-800" : "border-slate-200"
        )}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className={cn(
                "text-3xl md:text-5xl font-serif font-bold mb-6 tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Σχεδιασμένο για κάθε ρόλο
              </h2>
              <p className={cn(
                "text-xl",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Κάθε χρήστης έχει εξατομικευμένη εμπειρία προσαρμοσμένη στις ανάγκες του.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: <GraduationCap size={48} weight="bold" />,
                  title: "Μαθητές",
                  color: darkMode ? "text-blue-400" : "text-blue-600",
                  borderHover: darkMode ? "hover:border-blue-500/30" : "hover:border-blue-300",
                  features: [
                    "Προβολή βαθμολογιών σε πραγματικό χρόνο",
                    "Παρακολούθηση προόδου με γραφήματα",
                    "Ειδοποιήσεις για νέες βαθμολογίες",
                    "Πρόσβαση από κινητό και tablet",
                  ],
                },
                {
                  icon: <ChalkboardTeacher size={48} weight="bold" />,
                  title: "Καθηγητές",
                  color: darkMode ? "text-emerald-400" : "text-emerald-600",
                  borderHover: darkMode ? "hover:border-emerald-500/30" : "hover:border-emerald-300",
                  features: [
                    "Γρήγορη καταχώρηση βαθμών",
                    "Διαχείριση παρουσιών με ένα κλικ",
                    "Αυτόματα στατιστικά τάξης",
                    "Αναφορές προόδου ανά μαθητή",
                  ],
                },
                {
                  icon: <Buildings size={48} weight="bold" />,
                  title: "Διαχειριστές",
                  color: darkMode ? "text-purple-400" : "text-purple-600",
                  borderHover: darkMode ? "hover:border-purple-500/30" : "hover:border-purple-300",
                  features: [
                    "Πλήρης έλεγχος φροντιστηρίου",
                    "Διαχείριση χρηστών και δικαιωμάτων",
                    "Εξαγωγή αναφορών και δελτίων",
                    "Παρακολούθηση απόδοσης τάξεων",
                  ],
                },
                {
                  icon: <Users size={48} weight="bold" />,
                  title: "Γονείς",
                  color: darkMode ? "text-rose-400" : "text-rose-600",
                  borderHover: darkMode ? "hover:border-rose-500/30" : "hover:border-rose-300",
                  features: [
                    "Ενημέρωση για βαθμολογίες σε πραγματικό χρόνο",
                    "Παρακολούθηση απουσιών του παιδιού",
                    "Επικοινωνία με τους καθηγητές",
                    "Πρόσβαση σε δελτία προόδου",
                  ],
                },
              ].map((role) => (
                <div key={role.title}>
                  <Card className={cn(
                    "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                    role.borderHover,
                    darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-slate-200"
                  )}>
                    <div className={cn(
                      "w-16 h-16 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      role.color
                    )}>
                      {role.icon}
                    </div>
                    <h3 className={cn("text-2xl font-serif font-bold mb-5", darkMode ? "text-white" : "text-slate-900")}>
                      {role.title}
                    </h3>
                    <ul className="space-y-3">
                      {role.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CircleWavyCheck size={24} weight="bold" className={cn("mt-0.5 flex-shrink-0", darkMode ? "text-emerald-400" : "text-emerald-500")} />
                          <span className={cn("text-base", darkMode ? "text-zinc-300" : "text-slate-700")}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Footer */}
        <footer className="py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
            <p className={cn("text-sm", darkMode ? "text-zinc-600" : "text-slate-400")}>
              © {new Date().getFullYear()} The GradeBook Team
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
