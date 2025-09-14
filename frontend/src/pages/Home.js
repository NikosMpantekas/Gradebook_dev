import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import {
  Menu,
  Sun,
  Moon,
  CheckCircle2,
  Star,
  MessageSquare,
  BarChart3,
} from "lucide-react";

const Logo = ({ darkMode }) => (
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

const navLinks = [
  { label: "Πίνακας Ελέγχου", href: "/login" },
  { label: "Σχετικά με εμάς", href: "/about" },
  { label: "Επικοινωνία", href: "/contact" },
];

const DashboardMockup = () => (
  <div className="w-full max-w-[420px] h-[260px] mx-auto mt-4 md:mt-0 rounded-2xl bg-[#23262b] shadow-lg flex items-stretch justify-center overflow-hidden relative p-0" style={{filter: "blur(0.5px)"}}>
    <div className="w-[110px] h-full bg-[#23262b] flex flex-col items-start pt-3 px-2 gap-2 border-r border-primary">
      <div className="w-full h-9 bg-[#4a4a4a] rounded-md mb-2" />
      <div className="w-full h-9 bg-[#4a4a4a] rounded-md mb-1.5" />
      <div className="w-[70%] h-[18px] bg-[#23262b] rounded-md mb-1" />
      <div className="w-[60%] h-[14px] bg-[#23262b] rounded-md" />
    </div>
    <div className="flex-1 h-full bg-[#23262b] p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1 mb-2">
        <div className="w-7 h-7 bg-primary rounded-full" />
        <div className="w-[120px] h-4 bg-[#4a4a4a] rounded-md" />
        <div className="flex-1" />
        <div className="w-[22px] h-[22px] bg-[#4a4a4a] rounded-full" />
        <div className="w-[22px] h-[22px] bg-[#4a4a4a] rounded-full" />
        <div className="w-[22px] h-[22px] bg-[#4a4a4a] rounded-full" />
      </div>
      <div className="w-[120px] h-[18px] bg-[#4a4a4a] rounded-md mb-1" />
      <div className="w-[180px] h-[14px] bg-[#4a4a4a] rounded-md mb-2" />
      <div className="flex gap-2 mb-2">
        <div className="flex-1 h-[60px] bg-[#181b20] rounded-xl" />
        <div className="flex-1 h-[60px] bg-[#181b20] rounded-xl" />
      </div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1 h-9 bg-[#23262b] rounded-md border border-primary" />
        <div className="flex-1 h-9 bg-[#23262b] rounded-md border border-primary" />
        <div className="flex-1 h-9 bg-[#23262b] rounded-md border border-primary" />
        <div className="flex-1 h-9 bg-[#23262b] rounded-md border border-primary" />
      </div>
    </div>
  </div>
);

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Persistent theme state for public pages
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('publicPageTheme');
    return saved ? JSON.parse(saved) : true; // defaults to dark
  });

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleToggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('publicPageTheme', JSON.stringify(newMode));
      return newMode;
    });
  };

  const features = [
    {
      icon: <CheckCircle2 className="w-10 h-10 text-primary" />,
      title: "Παρουσίες",
      description: "Εύκολη καταγραφή παρουσιών μαθητών.",
    },
    {
      icon: <Star className="w-10 h-10 text-primary" />,
      title: "Βαθμολογίες",
      description: "Άμεση διαχείριση και ανάλυση βαθμών.",
    },
    {
      icon: <MessageSquare className="w-10 h-10 text-primary" />,
      title: "Επικοινωνία",
      description: "Γρήγορη ενημέρωση γονέων & μαθητών.",
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Αναφορές",
      description: "Αναλυτικές αναφορές προόδου.",
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center justify-center">
            <div className="">
              <div className="mb-4">
                <h1 className={cn(
                  "font-bold mb-2 text-2xl md:text-4xl leading-tight",
                  darkMode ? "text-foreground" : "text-[#23262b]"
                )}>
                  Αναβαθμίστε την διαχείριση του φροντιστηρίου σας.
                </h1>
                <p className={cn(
                  "mb-4 font-normal text-base md:text-lg",
                  darkMode ? "text-muted-foreground" : "text-gray-600"
                )}>
                  Το GradeBook παρέχει τα εφόδια για την σύγχρονη και εύκολη
                  διαχείριση φροντιστηρίων, προσφέροντας πλήρη έλεγχο των τάξεων
                  και των μαθητών σας.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="bg-[#48566a] text-white rounded-2xl px-8 py-7 font-bold text-lg shadow-sm transition-all duration-200 hover:bg-[#3a4555] hover:-translate-y-0.5 hover:scale-105"
                >
                  <a href="/login" rel="noopener noreferrer">
                    Συνδεθείτε στον Πίνακα Ελέγχου
                  </a>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="features">
                {features.map((feature, idx) => (
                  <Card
                    key={idx}
                    className={cn(
                      "flex items-center gap-2 p-4 rounded-2xl mb-1",
                      "transition-all duration-300 ease-in-out",
                      "hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]",
                      "cursor-pointer",
                      darkMode 
                        ? "bg-[#2a3441] shadow-md hover:shadow-xl" 
                        : "bg-white shadow-md hover:shadow-xl"
                    )}
                  >
                    <CardContent className="flex items-center gap-2 p-0">
                      {feature.icon}
                      <div>
                        <h3 className={cn(
                          "font-bold text-sm",
                          darkMode ? "text-card-foreground" : "text-[#23262b]"
                        )}>
                          {feature.title}
                        </h3>
                        <p className={cn(
                          "text-xs",
                          darkMode ? "text-muted-foreground" : "text-gray-600"
                        )}>
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <DashboardMockup />
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
    </div>
  );
}