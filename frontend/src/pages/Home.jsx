import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getSavedAccounts } from "../services/accountStore";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
} from "../components/ui/sheet";
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
  CircleWavyCheck,
} from "phosphor-react";
import MaintenanceIndicator from "../components/MaintenanceIndicator";

const Logo = () => {
  return (
    <Link
      to="/home"
      className={cn(
        "relative flex items-center gap-3 text-xl font-bold tracking-tight font-serif py-1 group",
        "no-underline transition-all duration-300 text-white",
      )}
    >
      <img
        src="/logo-transparent.png"
        alt="Logo"
        className="w-9 h-9 object-contain"
      />
      GradeBook
    </Link>
  );
};

const navLinks = [
  { label: "Αρχική", href: "/home", match: "/home" },
  { label: "Σχετικά με εμάς", href: "/about", match: "/about" },
  { label: "Επικοινωνία", href: "/contact", match: "/contact" },
];

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

  // Check if user is already logged in
  const loggedInUser = (() => {
    try {
      const stored =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const dashboardPath =
    loggedInUser && getSavedAccounts().length <= 1
      ? loggedInUser.role === "superadmin"
        ? "/superadmin/dashboard"
        : loggedInUser.role === "admin"
          ? "/app/admin"
          : loggedInUser.role === "teacher"
            ? "/app/teacher"
            : loggedInUser.role === "student"
              ? "/app/student"
              : loggedInUser.role === "parent"
                ? "/app/parent"
                : "/login"
      : "/login";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen font-sans flex flex-col transition-colors duration-300 selection:bg-yellow-200 selection:text-zinc-900",
        "bg-zinc-900 text-zinc-100",
      )}
      style={{
        backgroundImage: `radial-gradient(${"#3f3f46"} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      {/* Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
          "pt-[env(safe-area-inset-top)]",
          scrolled
            ? "bg-zinc-900/80 border-b border-zinc-800/50 backdrop-blur-md"
            : "bg-transparent border-transparent",
        )}
      >
        <div className="flex h-16 max-w-7xl items-center px-6 mx-auto w-full">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex md:hidden mr-2"
              >
                <List size={20} weight="bold" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className={cn(
                "w-[280px] p-0 backdrop-blur-xl border-r pb-[env(safe-area-inset-bottom)]",
                "bg-[#09090b]/90 border-zinc-800",
              )}
            >
              <SheetHeader className="px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-6 border-b border-zinc-100/10">
                <Logo />
              </SheetHeader>
              <div className="p-4">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const isActive = currentPath === link.match;
                    return (
                      <Button
                        key={link.label}
                        variant="ghost"
                        asChild
                        className={cn(
                          "justify-start text-sm font-medium h-10 px-4 rounded-md",
                          isActive
                            ? "bg-zinc-800 text-white"
                            : "hover:bg-zinc-800 text-zinc-400 hover:text-white",
                        )}
                      >
                        <Link to={link.href}>{link.label}</Link>
                      </Button>
                    );
                  })}
                  <div className="my-2 h-px bg-zinc-800" />
                  <Button
                    asChild
                    className="w-full justify-start text-sm font-medium h-10 px-4 rounded-md bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors duration-200"
                  >
                    <Link to={loggedInUser ? dashboardPath : "/login"}>
                      {loggedInUser ? "Πίνακας Ελέγχου" : "Σύνδεση"}
                    </Link>
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Logo />
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-6">
            <MaintenanceIndicator />
            {navLinks.map((link) => {
              const isActive = currentPath === link.match;
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={cn(
                    "relative text-sm font-medium transition-colors duration-300 py-1 group",
                    isActive ? "text-white" : "text-zinc-400 hover:text-white",
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute -bottom-1 left-0 h-[2px] rounded-full transition-all duration-300 ease-out",
                      "bg-white",
                      isActive ? "w-full" : "w-0 group-hover:w-full",
                    )}
                  />
                </Link>
              );
            })}
          </div>
          <div className="w-px h-4 mx-6 bg-slate-200/20 hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="md:hidden">
              <MaintenanceIndicator />
            </span>
            <Button
              asChild
              className="hidden md:inline-flex bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium px-6 py-2 rounded-full transition-colors duration-200 border border-zinc-700 hover:border-zinc-500"
            >
              <Link to={loggedInUser ? dashboardPath : "/login"}>
                {loggedInUser ? "Πίνακας Ελέγχου" : "Σύνδεση"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Standard Layout */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[100dvh] flex items-center">
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
              <h1
                className={cn(
                  "font-serif font-bold text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1]",
                  "text-white",
                )}
              >
                Η οργάνωση του φροντιστηρίου σας,{" "}
                <br className="hidden md:block" />
                <span className="relative md:whitespace-nowrap inline-block">
                  <span
                    className={cn(
                      "absolute -left-2 -right-2 top-2/3 bottom-1 -z-10 transform -rotate-1 rounded-sm opacity-60",
                      "bg-blue-600",
                    )}
                    style={{
                      animation: "highlighter 0.8s ease-out 0.8s forwards",
                      transformOrigin: "left center",
                      width: 0,
                    }}
                  ></span>
                  πιο απλή από ποτέ.
                </span>
              </h1>
              <p
                className={cn(
                  "text-lg md:text-xl max-w-2xl mx-auto leading-relaxed",
                  "text-zinc-400",
                )}
              >
                Το GradeBook είναι το σύγχρονο εργαλείο για την διαχείριση
                τάξεων, μαθητών και βαθμολογιών.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className={cn(
                    "h-12 px-8 rounded-full font-semibold text-base transition-all active:scale-[0.98]",
                    "bg-white text-zinc-900 hover:bg-zinc-200",
                  )}
                >
                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 group"
                  >
                    {loggedInUser
                      ? "Συνεχίστε στο GradeBook"
                      : "Συνδεθείτε στο GradeBook"}
                    <div className="transition-transform duration-300 ease-out group-hover:translate-x-1 flex items-center">
                      {loggedInUser ? (
                        <ArrowRight size={20} weight="bold" />
                      ) : (
                        <GraduationCap size={20} weight="bold" />
                      )}
                    </div>
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              style={{ y: parallaxY }}
              className={cn(
                "w-full max-w-6xl px-4 md:px-8",
                "absolute top-60 left-0 opacity-40 scale-110 pointer-events-none z-10", // Mobile: perfectly behind text
                "md:relative md:top-0 md:opacity-100 md:scale-100 md:pointer-events-auto md:z-20", // Desktop: below
              )}
            ></motion.div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section
          className={cn("py-24 px-6 border-t", "bg-zinc-900 border-zinc-800")}
          id="features"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2
                className={cn(
                  "text-3xl md:text-5xl font-serif font-bold mb-6 tracking-tight",
                  "text-white",
                )}
              >
                Όλα τα εργαλεία σε μία πλατφόρμα
              </h2>
              <p className={cn("text-xl", "text-zinc-400")}>
                Αντικαταστήστε τα πολύπλοκα excel και τα τετράδια με ένα
                ολοκληρωμένο σύστημα.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Card - Analytics */}
              <div className="md:col-span-2 md:row-span-2">
                <Card
                  className={cn(
                    "h-full p-8 flex flex-col justify-between border transition-all duration-300 hover:shadow-xl group",
                    "bg-zinc-900 border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div className="flex-1">
                    <div
                      className={cn(
                        "w-14 h-14 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                        "text-blue-400",
                      )}
                    >
                      <Notebook size={48} weight="bold" />
                    </div>
                    <h3
                      className={cn(
                        "text-2xl font-serif font-bold mb-3",
                        "text-white",
                      )}
                    >
                      Βαθμολόγιο & Αξιολογήσεις
                    </h3>
                    <p
                      className={cn(
                        "text-lg leading-relaxed max-w-md",
                        "text-zinc-400",
                      )}
                    >
                      Διατηρήστε πλήρες ιστορικό βαθμολογιών για διαγωνίσματα
                      και εξετάσεις. Εξάγετε αυτόματα δελτία προόδου για κάθε
                      τρίμηνο.
                    </p>
                  </div>
                  <div className="flex gap-6 mt-12 justify-center">
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-full h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        "bg-zinc-900 border-zinc-800",
                      )}
                    >
                      <div className="text-4xl font-bold text-emerald-500">
                        19.5
                      </div>
                      <div
                        className={cn("text-sm font-medium", "text-zinc-500")}
                      >
                        Μ.Ο. Τάξης
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "w-full h-40 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors",
                        "bg-zinc-900 border-zinc-800",
                      )}
                    >
                      <div className="text-4xl font-bold text-blue-500">A</div>
                      <div
                        className={cn("text-sm font-medium", "text-zinc-500")}
                      >
                        Επίδοση
                      </div>
                    </motion.div>
                  </div>
                </Card>
              </div>

              {/* Small Card 1 - Attendance */}
              <div>
                <Card
                  className={cn(
                    "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                    "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      "text-emerald-400",
                    )}
                  >
                    <CalendarCheck size={40} weight="bold" />
                  </div>
                  <h3
                    className={cn(
                      "text-xl font-serif font-bold mb-3",
                      "text-white",
                    )}
                  >
                    Παρουσίες
                  </h3>
                  <p
                    className={cn("text-base leading-relaxed", "text-zinc-400")}
                  >
                    Καταγραφή απουσιών με ένα κλικ και αυτόματη ενημέρωση γονέων
                    μέσω ειδοποιήσεων.
                  </p>
                </Card>
              </div>

              {/* Small Card 2 - Communication */}
              <div>
                <Card
                  className={cn(
                    "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                    "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                      "text-purple-400",
                    )}
                  >
                    <ChatCircleDots size={40} weight="bold" />
                  </div>
                  <h3
                    className={cn(
                      "text-xl font-serif font-bold mb-3",
                      "text-white",
                    )}
                  >
                    Επικοινωνία
                  </h3>
                  <p
                    className={cn("text-base leading-relaxed", "text-zinc-400")}
                  >
                    Στείλτε μαζικά μηνύματα και ανακοινώσεις σε μαθητές και
                    γονείς.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Role-Based Benefits */}
        <section className={cn("py-24 px-6 border-t", "border-zinc-800")}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2
                className={cn(
                  "text-3xl md:text-5xl font-serif font-bold mb-6 tracking-tight",
                  "text-white",
                )}
              >
                Σχεδιασμένο για κάθε ρόλο
              </h2>
              <p className={cn("text-xl", "text-zinc-400")}>
                Κάθε χρήστης έχει εξατομικευμένη εμπειρία προσαρμοσμένη στις
                ανάγκες του.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: <GraduationCap size={48} weight="bold" />,
                  title: "Μαθητές",
                  color: "text-blue-400",
                  borderHover: "hover:border-blue-500/30",
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
                  color: "text-emerald-400",
                  borderHover: "hover:border-emerald-500/30",
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
                  color: "text-purple-400",
                  borderHover: "hover:border-purple-500/30",
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
                  color: "text-rose-400",
                  borderHover: "hover:border-rose-500/30",
                  features: [
                    "Ενημέρωση για βαθμολογίες σε πραγματικό χρόνο",
                    "Παρακολούθηση απουσιών του παιδιού",
                    "Επικοινωνία με τους καθηγητές",
                    "Πρόσβαση σε δελτία προόδου",
                  ],
                },
              ].map((role) => (
                <div key={role.title}>
                  <Card
                    className={cn(
                      "h-full p-8 border transition-all duration-300 hover:shadow-xl group",
                      role.borderHover,
                      "bg-zinc-900/50 border-zinc-800",
                    )}
                  >
                    <div
                      className={cn(
                        "w-16 h-16 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110",
                        role.color,
                      )}
                    >
                      {role.icon}
                    </div>
                    <h3
                      className={cn(
                        "text-2xl font-serif font-bold mb-5",
                        "text-white",
                      )}
                    >
                      {role.title}
                    </h3>
                    <ul className="space-y-3">
                      {role.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CircleWavyCheck
                            size={24}
                            weight="bold"
                            className={cn(
                              "mt-0.5 flex-shrink-0",
                              "text-emerald-400",
                            )}
                          />
                          <span className={cn("text-base", "text-zinc-300")}>
                            {feature}
                          </span>
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
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4">
            <p className={cn("text-sm", "text-zinc-600")}>
              © {new Date().getFullYear()} The GradeBook Team
            </p>
            <Link
              to="/privacy"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Πολιτική Απορρήτου
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
