import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

const ServerWarningBanner = () => {
  const { darkMode } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
            "bg-amber-500/90 text-white backdrop-blur-md border border-amber-400/30",
          )}
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
          aria-label="Ειδοποίηση διακομιστή"
        >
          <AlertTriangle className="w-6 h-6 text-white" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md text-center sm:text-left z-[9999]">
        <DialogHeader className="items-center sm:items-start">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 mb-4 sm:mx-0">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl">
            Περιορισμένη Λειτουργικότητα
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Η λειτουργικότητα της εφαρμογής είναι περιορισμένη λόγω προβλημάτων
            με τους παρόχους των διακομιστών μας. Εργαζόμαστε για την επίλυση
            του προβλήματος.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end mt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              OK
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServerWarningBanner;
