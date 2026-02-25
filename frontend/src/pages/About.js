import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  GraduationCap,
  Shield,
  Zap,
  HeadphonesIcon,
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

export default function About() {
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

  const features = [
    {
      icon: <GraduationCap className="w-12 h-12" />,
      title: "Διαχείριση Φροντιστηρίων",
      description: "Πλήρης έλεγχος των τάξεων, μαθητών και βαθμολογιών με εύκολη και διαισθητική διασύνδεση.",
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Ασφάλεια Δεδομένων",
      description: "Προστασία των ευαίσθητων πληροφοριών των μαθητών με σύγχρονες τεχνολογίες κρυπτογράφησης.",
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Γρήγορη Ενημέρωση",
      description: "Άμεση επικοινωνία με γονείς και μαθητές μέσω push notifications και email ειδοποιήσεων.",
    },
    {
      icon: <HeadphonesIcon className="w-12 h-12" />,
      title: "24/7 Υποστήριξη",
      description: "Συνεχής τεχνική υποστήριξη για όλες τις ανάγκες του φροντιστηρίου σας.",
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className={cn(
                "font-serif font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-tight mb-6",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Σχετικά με το GradeBook
              </h1>
              <p className={cn(
                "max-w-3xl mx-auto text-lg md:text-xl leading-relaxed",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Το GradeBook είναι μια σύγχρονη πλατφόρμα διαχείρισης φροντιστηρίων που αναπτύχθηκε
                για να απλοποιήσει και να βελτιώσει την εκπαιδευτική διαδικασία.
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "h-full p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
                  )}>
                    <div className={cn(
                      "mb-4",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}>
                      {feature.icon}
                    </div>
                    <h3 className={cn(
                      "font-serif font-bold text-xl mb-3",
                      darkMode ? "text-white" : "text-slate-900"
                    )}>
                      {feature.title}
                    </h3>
                    <p className={cn(
                      "text-base leading-relaxed",
                      darkMode ? "text-zinc-400" : "text-slate-600"
                    )}>
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Story Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center mb-20"
            >
              <h2 className={cn(
                "font-serif font-bold text-3xl md:text-4xl mb-6 tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Η Ιστορία μας
              </h2>
              <p className={cn(
                "max-w-4xl mx-auto text-lg md:text-xl leading-relaxed",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Το GradeBook ξεκίνησε ως μια απλή ιδέα για να βελτιώσουμε τον τρόπο που τα φροντιστήρια
                διαχειρίζονται τις πληροφορίες των μαθητών τους. Με την εξέλιξη της τεχνολογίας και τις
                αυξανόμενες απαιτήσεις για ψηφιακές λύσεις, αναπτύξαμε μια πλατφόρμα που συνδυάζει
                ευκολία χρήσης με ισχυρές λειτουργίες.
              </p>
            </motion.div>

            {/* Mission Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center"
            >
              <h2 className={cn(
                "font-serif font-bold text-3xl md:text-4xl mb-6 tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}>
                Η Αποστολή μας
              </h2>
              <p className={cn(
                "max-w-4xl mx-auto text-lg md:text-xl leading-relaxed",
                darkMode ? "text-zinc-400" : "text-slate-600"
              )}>
                Στόχος μας είναι να παρέχουμε στους εκπαιδευτικούς και τα φροντιστήρια τα εργαλεία που
                χρειάζονται για να εστιάσουν σε αυτό που κάνουν καλύτερα: την εκπαίδευση των μαθητών.
                Με το GradeBook, η διαχείριση γίνεται απλή και αποδοτική.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo darkMode={darkMode} />
          <p className={cn("text-sm", darkMode ? "text-zinc-600" : "text-slate-400")}>
            © {new Date().getFullYear()} The GradeBook Team
          </p>
        </div>
      </footer>
    </div>
  );
}