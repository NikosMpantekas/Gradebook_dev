import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  CheckCircle2,
  Star,
  MessageSquare,
  BarChart3,
  BookText
} from "lucide-react";

const Logo = ({ darkMode }) => (
  <a
    href="/home"
    className={cn(
      "text-xl font-bold tracking-tight font-serif",
      "no-underline transition-all duration-300 hover:opacity-80",
      darkMode ? "text-white" : "text-slate-900"
    )}
  >
    GradeBook
  </a>
);

const navLinks = [
  { label: "Πίνακας Ελέγχου", href: "/login" },
  { label: "Σχετικά με εμάς", href: "/about" },
  { label: "Επικοινωνία", href: "/contact" },
];

const DashboardMockup = ({ darkMode }) => (
  <div className={cn(
    "relative rounded-xl shadow-2xl overflow-hidden border",
    darkMode ? "bg-zinc-950 border-zinc-800 shadow-black/50" : "bg-white border-slate-200 shadow-slate-200/50"
  )}>
    {/* Browser Bar */}
    <div className={cn(
      "h-10 border-b flex items-center px-4 gap-2",
      darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-slate-50/50 border-slate-100"
    )}>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
      </div>
      <div className={cn(
        "flex-1 max-w-sm mx-auto h-6 rounded-md flex items-center justify-center text-[10px] font-mono",
        darkMode ? "bg-zinc-900 text-zinc-500" : "bg-white text-slate-400"
      )}>
        gradebook.pro/dashboard
      </div>
    </div>

    {/* App Content */}
    <div className="flex h-[400px] md:h-[600px]">
      {/* Sidebar - Hidden on mobile */}
      <div className={cn(
        "hidden md:flex w-64 border-r p-4 flex-col gap-4",
        darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-slate-50/50 border-slate-100"
      )}>
        <div className={cn("h-8 w-32 rounded-md mb-4", darkMode ? "bg-zinc-800" : "bg-slate-200")} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn(
            "h-8 w-full rounded-md",
            darkMode ? "bg-zinc-800/50" : "bg-slate-100"
          )} />
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 p-4 md:p-8 overflow-hidden bg-opacity-50">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className={cn("h-6 md:h-8 w-32 md:w-48 rounded-md", darkMode ? "bg-zinc-800" : "bg-slate-200")} />
          <div className="flex gap-2">
            <div className={cn("h-6 md:h-8 w-6 md:w-8 rounded-full", darkMode ? "bg-zinc-800" : "bg-slate-200")} />
            <div className={cn("h-6 md:h-8 w-6 md:w-8 rounded-full", darkMode ? "bg-zinc-800" : "bg-slate-200")} />
          </div>
        </div>

        {/* Grid - Stack on mobile, 3 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn(
              "h-24 md:h-32 rounded-xl border p-4 flex flex-col justify-center",
              darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-slate-100"
            )}>
              <div className={cn("h-6 md:h-8 w-8 rounded-md mb-3", darkMode ? "bg-zinc-800" : "bg-slate-100")} />
              <div className={cn("h-3 md:h-4 w-20 rounded-md mb-2", darkMode ? "bg-zinc-800" : "bg-slate-100")} />
              <div className={cn("h-4 md:h-6 w-12 rounded-md", darkMode ? "bg-zinc-800" : "bg-slate-100")} />
            </div>
          ))}
        </div>

        <div className={cn(
          "h-48 md:h-64 rounded-xl border p-4",
          darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-slate-100"
        )}>
          <div className="flex items-end gap-2 md:gap-4 h-full pb-2 md:pb-4 px-2 md:px-4">
            {[40, 70, 50, 90, 60, 80, 40, 70, 50, 90].map((h, i) => (
              <div key={i} className={cn(
                "flex-1 rounded-t-md transition-all duration-500 hover:opacity-80",
                darkMode ? "bg-blue-600" : "bg-blue-500"
              )} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Persistent theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('publicPageTheme');
    return saved ? JSON.parse(saved) : true;
  });

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
                <Logo darkMode={darkMode} />
              </SheetHeader>
              <div className="p-4">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Button key={link.label} variant="ghost" asChild className={cn("justify-start text-sm font-medium h-10 px-4 rounded-md", darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-900")}>
                      <a href={link.href}>{link.label}</a>
                    </Button>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Logo darkMode={darkMode} />
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className={cn("text-sm font-medium transition-colors", darkMode ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}>
                {link.label}
              </a>
            ))}
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
                  <a href="/login" className="flex items-center gap-2 group">
                    Συνδεθείτε στο GradeBook
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <BookText className="w-4 h-4" />
                    </motion.div>
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Mockup - Static Entry */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full max-w-6xl px-4 md:px-8"
            >
              <DashboardMockup darkMode={darkMode} />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Large Card */}
              <Card className={cn(
                "md:col-span-2 md:row-span-2 p-8 flex flex-col justify-between border transition-all hover:shadow-xl",
                darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
              )}>
                <div>
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                    darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
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
                  darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50/50 border-slate-100"
                )}>
                  <div className="absolute inset-0 flex items-end justify-around p-8 gap-3">
                    {[30, 50, 45, 70, 60, 85, 90].map((h, i) => (
                      <div key={i} className={cn(
                        "w-full rounded-t-md opacity-80",
                        darkMode ? "bg-blue-500" : "bg-blue-600"
                      )} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </Card>

              {/* Small Card 1 */}
              <Card className={cn(
                "p-8 border transition-all hover:shadow-xl",
                darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
              )}>
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-6",
                  darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                )}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                  Παρουσίες
                </h3>
                <p className={cn("text-base", darkMode ? "text-zinc-400" : "text-slate-600")}>
                  Καταγραφή απουσιών με ένα κλικ και αυτόματη ενημέρωση γονέων.
                </p>
              </Card>

              {/* Small Card 2 */}
              <Card className={cn(
                "p-8 border transition-all hover:shadow-xl",
                darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
              )}>
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-6",
                  darkMode ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
                )}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className={cn("text-xl font-serif font-bold mb-3", darkMode ? "text-white" : "text-slate-900")}>
                  Επικοινωνία
                </h3>
                <p className={cn("text-base", darkMode ? "text-zinc-400" : "text-slate-600")}>
                  Στείλτε μαζικά μηνύματα και ανακοινώσεις σε μαθητές και γονείς.
                </p>
              </Card>

              {/* Medium Card */}
              <Card className={cn(
                "md:col-span-3 p-8 flex flex-col md:flex-row items-center gap-12 border transition-all hover:shadow-xl",
                darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-slate-200 hover:border-slate-300"
              )}>
                <div className="flex-1">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                    darkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
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
                  <div className={cn(
                    "w-32 h-40 rounded-xl border flex flex-col items-center justify-center gap-3",
                    darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="text-4xl font-bold text-emerald-500">19.5</div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Μ.Ο. Τάξης</div>
                  </div>
                  <div className={cn(
                    "w-32 h-40 rounded-xl border flex flex-col items-center justify-center gap-3",
                    darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="text-4xl font-bold text-blue-500">A</div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-zinc-500" : "text-slate-400")}>Επίδοση</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <footer className={cn(
          "py-12 border-t transition-colors duration-300",
          darkMode ? "border-zinc-800" : "border-slate-200"
        )}>
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Logo darkMode={darkMode} />
              <p className={cn("text-sm", darkMode ? "text-zinc-500" : "text-slate-500")}>
                © {new Date().getFullYear()}
              </p>
            </div>
            <div className="flex gap-8">
              <a href="/contact" className={cn("text-sm hover:underline", darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800")}>Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}