import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  CheckCircle2,
  Star,
  MessageSquare,
  BarChart3,
  BookText,
  ArrowRight,
  GraduationCap,
  Settings,
  Users
} from "lucide-react";

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
                <stop offset="0%" stopColor={darkMode ? "#3b82f6" : "#3b82f6"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={darkMode ? "#3b82f6" : "#3b82f6"} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M0,120 C40,100 60,80 100,70 C140,60 160,90 200,50 C240,10 280,30 320,25 C360,20 380,40 400,15 L400,150 L0,150 Z" fill="url(#mockupGrad)" />
            <path d="M0,120 C40,100 60,80 100,70 C140,60 160,90 200,50 C240,10 280,30 320,25 C360,20 380,40 400,15" fill="none" stroke={darkMode ? "#3b82f6" : "#2563eb"} strokeWidth="2.5" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Parallax
  const { scrollY } = useScroll();
  const heroTextY = useTransform(scrollY, [0, 500], [0, -150]);
  const mockupY = useTransform(scrollY, [0, 500], [0, -70]);
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

      <main className="flex-1">
        {/* Hero Section - Standard Layout */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ y: heroTextY, opacity: heroOpacity }}
              className="text-center space-y-8 max-w-4xl mb-16 relative z-10"
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
                      {loggedInUser ? <ArrowRight className="w-4 h-4" /> : <BookText className="w-4 h-4" />}
                    </motion.div>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Mockup - Static Entry */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ y: mockupY }}
              className="w-full max-w-6xl px-4 md:px-8"
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
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16 max-w-3xl mx-auto"
            >
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
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Card - Analytics */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0 }}
                className="md:col-span-2 md:row-span-2"
              >
                <Card className={cn(
                  "h-full p-8 flex flex-col justify-between border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div>
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      darkMode ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400" : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"
                    )}>
                      <BarChart3 className="w-7 h-7" />
                    </div>
                    <h3 className={cn("text-2xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                      Αναλυτικά Στατιστικά
                    </h3>
                    <p className={cn("text-lg leading-relaxed max-w-md", darkMode ? "text-zinc-400" : "text-slate-600")}>
                      Παρακολουθήστε την πρόοδο των μαθητών με αυτόματα διαγράμματα και αναφορές.
                      Δείτε μέσους όρους, τάσεις και συγκριτικά στοιχεία με μια ματιά.
                    </p>
                  </div>
                  <div className={cn(
                    "mt-12 h-72 rounded-xl border overflow-hidden relative",
                    darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50/50 border-slate-100"
                  )}>
                    <svg viewBox="0 0 500 250" className="absolute inset-0 w-full h-full p-4" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={darkMode ? "#60a5fa" : "#3b82f6"} stopOpacity="0.35" />
                          <stop offset="100%" stopColor={darkMode ? "#60a5fa" : "#3b82f6"} stopOpacity="0.03" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[50, 100, 150, 200].map(y => (
                        <line key={y} x1="0" y1={y} x2="500" y2={y} stroke={darkMode ? "#27272a" : "#e2e8f0"} strokeWidth="1" />
                      ))}
                      {/* Line */}
                      <motion.path
                        d="M0,200 C30,180 50,140 90,130 C130,120 160,170 200,110 C240,50 270,70 310,55 C350,40 380,80 420,35 C450,10 480,30 500,20"
                        fill="none"
                        stroke={darkMode ? "#60a5fa" : "#2563eb"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                      {/* Dots at key points */}
                      {[[90, 130], [200, 110], [310, 55], [420, 35]].map(([cx, cy], i) => (
                        <motion.circle
                          key={i}
                          cx={cx} cy={cy} r="5"
                          fill={darkMode ? "#60a5fa" : "#2563eb"}
                          stroke={darkMode ? "#18181b" : "#f8fafc"}
                          strokeWidth="2"
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.8 + i * 0.15 }}
                        />
                      ))}
                    </svg>
                  </div>
                </Card>
              </motion.div>

              {/* Small Card 1 - Attendance */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className={cn(
                  "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                    darkMode ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400" : "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600"
                  )}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                    Παρουσίες
                  </h3>
                  <p className={cn("text-base leading-relaxed", darkMode ? "text-zinc-400" : "text-slate-600")}>
                    Καταγραφή απουσιών με ένα κλικ και αυτόματη ενημέρωση γονέων μέσω ειδοποιήσεων.
                  </p>
                </Card>
              </motion.div>

              {/* Small Card 2 - Communication */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className={cn(
                  "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                    darkMode ? "bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-400" : "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600"
                  )}>
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                    Επικοινωνία
                  </h3>
                  <p className={cn("text-base leading-relaxed", darkMode ? "text-zinc-400" : "text-slate-600")}>
                    Στείλτε μαζικά μηνύματα και ανακοινώσεις σε μαθητές και γονείς.
                  </p>
                </Card>
              </motion.div>

              {/* Full Width Card - Grades */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-3"
              >
                <Card className={cn(
                  "p-8 flex flex-col md:flex-row items-center gap-12 border transition-all duration-300 hover:shadow-xl group",
                  darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                )}>
                  <div className="flex-1">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      darkMode ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400" : "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600"
                    )}>
                      <Star className="w-7 h-7" />
                    </div>
                    <h3 className={cn("text-2xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                      Βαθμολόγιο & Αξιολογήσεις
                    </h3>
                    <p className={cn("text-lg leading-relaxed max-w-xl", darkMode ? "text-zinc-400" : "text-slate-600")}>
                      Διατηρήστε πλήρες ιστορικό βαθμολογιών για διαγωνίσματα και εξετάσεις.
                      Εξάγετε αυτόματα δελτία προόδου για κάθε τρίμηνο.
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-32 h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="text-4xl font-bold text-emerald-500">19.5</div>
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Μ.Ο. Τάξης</div>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-32 h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="text-4xl font-bold text-blue-500">A</div>
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Επίδοση</div>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Role-Based Benefits */}
        <section className={cn(
          "py-24 px-6 border-t",
          darkMode ? "border-zinc-800" : "border-slate-200"
        )}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16 max-w-3xl mx-auto"
            >
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
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: <GraduationCap className="w-8 h-8" />,
                  title: "Μαθητές",
                  color: darkMode ? "from-blue-500/20 to-cyan-500/10 text-blue-400" : "from-blue-50 to-cyan-50 text-blue-600",
                  borderHover: darkMode ? "hover:border-blue-500/30" : "hover:border-blue-300",
                  features: [
                    "Προβολή βαθμολογιών σε πραγματικό χρόνο",
                    "Παρακολούθηση προόδου με γραφήματα",
                    "Ειδοποιήσεις για νέες βαθμολογίες",
                    "Πρόσβαση από κινητό και tablet",
                  ],
                },
                {
                  icon: <BookText className="w-8 h-8" />,
                  title: "Καθηγητές",
                  color: darkMode ? "from-emerald-500/20 to-green-500/10 text-emerald-400" : "from-emerald-50 to-green-50 text-emerald-600",
                  borderHover: darkMode ? "hover:border-emerald-500/30" : "hover:border-emerald-300",
                  features: [
                    "Γρήγορη καταχώρηση βαθμών",
                    "Διαχείριση παρουσιών με ένα κλικ",
                    "Αυτόματα στατιστικά τάξης",
                    "Αναφορές προόδου ανά μαθητή",
                  ],
                },
                {
                  icon: <Settings className="w-8 h-8" />,
                  title: "Διαχειριστές",
                  color: darkMode ? "from-purple-500/20 to-violet-500/10 text-purple-400" : "from-purple-50 to-violet-50 text-purple-600",
                  borderHover: darkMode ? "hover:border-purple-500/30" : "hover:border-purple-300",
                  features: [
                    "Πλήρης έλεγχος φροντιστηρίου",
                    "Διαχείριση χρηστών και δικαιωμάτων",
                    "Εξαγωγή αναφορών και δελτίων",
                    "Παρακολούθηση απόδοσης τάξεων",
                  ],
                },
                {
                  icon: <Users className="w-8 h-8" />,
                  title: "Γονείς",
                  color: darkMode ? "from-rose-500/20 to-pink-500/10 text-rose-400" : "from-rose-50 to-pink-50 text-rose-600",
                  borderHover: darkMode ? "hover:border-rose-500/30" : "hover:border-rose-300",
                  features: [
                    "Ενημέρωση για βαθμολογίες σε πραγματικό χρόνο",
                    "Παρακολούθηση απουσιών του παιδιού",
                    "Επικοινωνία με τους καθηγητές",
                    "Πρόσβαση σε δελτία προόδου",
                  ],
                },
              ].map((role, i) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className={cn(
                    "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                    role.borderHover,
                    darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-slate-200"
                  )}>
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
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
                          <CheckCircle2 className={cn("w-5 h-5 mt-0.5 flex-shrink-0", darkMode ? "text-emerald-400" : "text-emerald-500")} />
                          <span className={cn("text-base", darkMode ? "text-zinc-300" : "text-slate-700")}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>


        {/* Footer */}
        <footer className="py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo darkMode={darkMode} currentPath={currentPath} />
            <p className={cn("text-sm", darkMode ? "text-zinc-600" : "text-slate-400")}>
              © {new Date().getFullYear()} The GradeBook Team
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}