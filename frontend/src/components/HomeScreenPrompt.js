import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const HomeScreenPrompt = () => {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  // Check if the app is already installed
  const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;

  useEffect(() => {
    // Don't show if app is already installed or we're not on a mobile device
    if (isAppInstalled || !isMobileDevice()) {
      return;
    }

    // Check if we should show the prompt based on user's previous choice
    const promptShownBefore = localStorage.getItem('homeScreenPromptShown');
    const lastPromptDate = localStorage.getItem('homeScreenPromptDate');
    const now = new Date().getTime();
    
    // If the prompt was shown before, only show it again after 14 days
    if (promptShownBefore) {
      if (lastPromptDate && now - parseInt(lastPromptDate, 10) < 14 * 24 * 60 * 60 * 1000) {
        return; // Don't show if less than 14 days have passed
      }
    }

    // Detect iOS devices
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // For Android and other browsers that support the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the prompt after a delay
      setTimeout(() => setOpen(true), 2000);
    });

    // For iOS devices (which don't support beforeinstallprompt)
    if (isIOSDevice && !promptShownBefore) {
      // Show the iOS instructions after a delay
      setTimeout(() => setOpen(true), 2000);
    }

    // Save that we've shown the prompt
    localStorage.setItem('homeScreenPromptShown', 'true');
    localStorage.setItem('homeScreenPromptDate', now.toString());

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, [isAppInstalled]);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddToHomeScreen = async () => {
    if (!isIOS && deferredPrompt) {
      // For Android and other browsers that support beforeinstallprompt
      try {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // Clear the saved prompt since it can't be used again
        setDeferredPrompt(null);
        setOpen(false);
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    }
    // For iOS, the dialog will remain open with instructions
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Add to Home Screen</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Install GradeBook on your device for a better experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isIOS ? (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground">Look for the square with an arrow pointing up</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Scroll down and tap "Add to Home Screen"</p>
                  <p className="text-xs text-muted-foreground">This will add GradeBook to your home screen</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Tap "Add" to confirm</p>
                  <p className="text-xs text-muted-foreground">GradeBook will now appear on your home screen</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Tap the install button below</p>
                  <p className="text-xs text-muted-foreground">This will start the installation process</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Follow your device prompts</p>
                  <p className="text-xs text-muted-foreground">Your device will guide you through the installation</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Enjoy the app experience</p>
                  <p className="text-xs text-muted-foreground">Access GradeBook from your home screen</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Installation is free and takes just a few seconds</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleAddToHomeScreen}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HomeScreenPrompt;
