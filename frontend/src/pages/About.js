import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleDarkMode } from "../features/ui/uiSlice";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { cn } from "../lib/utils";
import {
  Menu,
  Sun,
  Moon,
  GraduationCap,
  Shield,
  Zap,
  HeadphonesIcon,
} from "lucide-react";

const Logo = () => (
  <a 
    href="/home"
    className={cn(
      "text-xl sm:text-2xl md:text-3xl font-light tracking-wide",
      "no-underline text-foreground hover:text-primary transition-colors",
      "relative inline-block"
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

export default function About() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { darkMode } = useSelector((state) => state.ui);
  const dispatch = useDispatch();

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleToggleDarkMode = () => dispatch(toggleDarkMode());

  const features = [
    {
      icon: <GraduationCap className="w-10 h-10 text-primary" />,
      title: "Διαχείριση Φροντιστηρίων",
      description: "Πλήρης έλεγχος των τάξεων, μαθητών και βαθμολογιών με εύκολη και διαισθητική διασύνδεση.",
    },
    {
      icon: <Shield className="w-10 h-10 text-primary" />,
      title: "Ασφάλεια Δεδομένων",
      description: "Προστασία των ευαίσθητων πληροφοριών των μαθητών με σύγχρονες τεχνολογίες κρυπτογράφησης.",
    },
    {
      icon: <Zap className="w-10 h-10 text-primary" />,
      title: "Γρήγορη Ενημέρωση",
      description: "Άμεση επικοινωνία με γονείς και μαθητές μέσω push notifications και email ειδοποιήσεων.",
    },
    {
      icon: <HeadphonesIcon className="w-10 h-10 text-primary" />,
      title: "24/7 Υποστήριξη",
      description: "Συνεχής τεχνική υποστήριξη για όλες τις ανάγκες του φροντιστηρίου σας.",
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
                      className="justify-start text-foreground hover:text-primary"
                    >
                      <a href={link.href}>{link.label}</a>
                    </Button>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
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
              Σχετικά με το GradeBook
            </h1>
            <p className={cn(
              "max-w-[800px] mx-auto font-normal text-base md:text-lg",
              darkMode ? "text-muted-foreground" : "text-gray-600"
            )}>
              Το GradeBook είναι μια σύγχρονη πλατφόρμα διαχείρισης φροντιστηρίων που αναπτύχθηκε
              για να απλοποιήσει και να βελτιώσει την εκπαιδευτική διαδικασία.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={cn(
                  "h-full transition-all duration-300 ease-in-out",
                  "hover:shadow-lg hover:-translate-y-2 hover:scale-[1.03]",
                  "cursor-pointer",
                  darkMode 
                    ? "bg-[#2a3441] shadow-md hover:shadow-xl" 
                    : "bg-white shadow-md hover:shadow-xl"
                )}
              >
                <CardContent className="text-center p-6">
                  <div className="mb-4 flex justify-center">{feature.icon}</div>
                  <h3 className={cn(
                    "font-bold mb-2 text-lg",
                    darkMode ? "text-card-foreground" : "text-[#23262b]"
                  )}>
                    {feature.title}
                  </h3>
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-muted-foreground" : "text-gray-600"
                  )}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mb-8">
            <h2 className={cn(
              "font-bold mb-4 text-2xl md:text-3xl",
              darkMode ? "text-foreground" : "text-[#23262b]"
            )}>
              Η Ιστορία μας
            </h2>
            <p className={cn(
              "max-w-[900px] mx-auto leading-relaxed text-base md:text-lg",
              darkMode ? "text-muted-foreground" : "text-gray-600"
            )}>
              Το GradeBook ξεκίνησε ως μια απλή ιδέα για να βελτιώσουμε τον τρόπο που τα φροντιστήρια
              διαχειρίζονται τις πληροφορίες των μαθητών τους. Με την εξέλιξη της τεχνολογίας και τις
              αυξανόμενες απαιτήσεις για ψηφιακές λύσεις, αναπτύξαμε μια πλατφόρμα που συνδυάζει
              ευκολία χρήσης με ισχυρές λειτουργίες.
            </p>
          </div>

          <div className="text-center">
            <h2 className={cn(
              "font-bold mb-4 text-2xl md:text-3xl",
              darkMode ? "text-foreground" : "text-[#23262b]"
            )}>
              Η Αποστολή μας
            </h2>
            <p className={cn(
              "max-w-[900px] mx-auto leading-relaxed text-base md:text-lg",
              darkMode ? "text-muted-foreground" : "text-gray-600"
            )}>
              Στόχος μας είναι να παρέχουμε στους εκπαιδευτικούς και τα φροντιστήρια τα εργαλεία που
              χρειάζονται για να εστιάσουν σε αυτό που κάνουν καλύτερα: την εκπαίδευση των μαθητών.
              Με το GradeBook, η διαχείριση γίνεται απλή και αποδοτική.
            </p>
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