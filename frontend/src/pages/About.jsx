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
import { motion } from "framer-motion";
import {
  List,
  Sun,
  Moon,
  Compass,
  ShieldCheck,
  Megaphone,
  Lifebuoy,
} from "phosphor-react";
import MaintenanceIndicator from "../components/MaintenanceIndicator";

const Logo = () => {
  return (
    <Link
      to="/home"
      className={cn(
        "relative flex items-center gap-3 text-xl font-bold tracking-tight font-serif py-1 group",
        "no-underline transition-all duration-300 text-white"
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

export default function About() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  const dashboardPath = (loggedInUser && getSavedAccounts().length <= 1)
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

  
  const features = [
    {
      icon: <Compass size={48} weight="bold" />,
      title: "Διαχείριση Φροντιστηρίων",
      description:
        "Πλήρης έλεγχος των τάξεων, μαθητών και βαθμολογιών με εύκολη και διαισθητική διασύνδεση.",
    },
    {
      icon: <ShieldCheck size={48} weight="bold" />,
      title: "Ασφάλεια Δεδομένων",
      description:
        "Προστασία των ευαίσθητων πληροφοριών των μαθητών με σύγχρονες τεχνολογίες κρυπτογράφησης.",
    },
    {
      icon: <Megaphone size={48} weight="bold" />,
      title: "Γρήγορη Ενημέρωση",
      description:
        "Άμεση επικοινωνία με γονείς και μαθητές μέσω push notifications και email ειδοποιήσεων.",
    },
    {
      icon: <Lifebuoy size={48} weight="bold" />,
      title: "24/7 Υποστήριξη",
      description:
        "Συνεχής τεχνική υποστήριξη για όλες τις ανάγκες του φροντιστηρίου σας.",
    },
  ];

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
                    isActive
                      ? "text-white"
                      : "text-zinc-400 hover:text-white",
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
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1
                className={cn(
                  "font-serif font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-tight mb-6",
                  "text-white",
                )}
              >
                Σχετικά με το GradeBook
              </h1>
              <p
                className={cn(
                  "max-w-3xl mx-auto text-lg md:text-xl leading-relaxed",
                  "text-zinc-400",
                )}
              >
                Το GradeBook είναι μια σύγχρονη πλατφόρμα διαχείρισης
                φροντιστηρίων που αναπτύχθηκε για να απλοποιήσει και να
                βελτιώσει την εκπαιδευτική διαδικασία.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {features.map((feature, index) => (
                <div key={index}>
                  <Card
                    className={cn(
                      "h-full p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                      "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    <div className={cn("mb-4 text-[#94a3b8]")}>
                      {feature.icon}
                    </div>
                    <h3
                      className={cn(
                        "font-serif font-bold text-xl mb-3",
                        "text-white",
                      )}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={cn(
                        "text-base leading-relaxed",
                        "text-zinc-400",
                      )}
                    >
                      {feature.description}
                    </p>
                  </Card>
                </div>
              ))}
            </div>

            {/* Story Section */}
            <div className="text-center mb-20">
              <h2
                className={cn(
                  "font-serif font-bold text-3xl md:text-4xl mb-6 tracking-tight",
                  "text-white",
                )}
              >
                Η Ιστορία μας
              </h2>
              <p
                className={cn(
                  "max-w-4xl mx-auto text-lg md:text-xl leading-relaxed",
                  "text-zinc-400",
                )}
              >
                Το GradeBook ξεκίνησε ως μια απλή ιδέα για να βελτιώσουμε τον
                τρόπο που τα φροντιστήρια διαχειρίζονται τις πληροφορίες των
                μαθητών τους. Με την εξέλιξη της τεχνολογίας και τις αυξανόμενες
                απαιτήσεις για ψηφιακές λύσεις, αναπτύξαμε μια πλατφόρμα που
                συνδυάζει ευκολία χρήσης με ισχυρές λειτουργίες.
              </p>
            </div>

            {/* Mission Section */}
            <div className="text-center">
              <h2
                className={cn(
                  "font-serif font-bold text-3xl md:text-4xl mb-6 tracking-tight",
                  "text-white",
                )}
              >
                Η Αποστολή μας
              </h2>
              <p
                className={cn(
                  "max-w-4xl mx-auto text-lg md:text-xl leading-relaxed",
                  "text-zinc-400",
                )}
              >
                Στόχος μας είναι να παρέχουμε στους εκπαιδευτικούς και τα
                φροντιστήρια τα εργαλεία που χρειάζονται για να εστιάσουν σε
                αυτό που κάνουν καλύτερα: την εκπαίδευση των μαθητών. Με το
                GradeBook, η διαχείριση γίνεται απλή και αποδοτική.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4">
          <p
            className={cn(
              "text-sm",
              "text-zinc-600",
            )}
          >
            © {new Date().getFullYear()} The GradeBook Team
          </p>
          <Link to="/privacy" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Πολιτική Απορρήτου
          </Link>
        </div>
      </footer>
    </div>
  );
}
