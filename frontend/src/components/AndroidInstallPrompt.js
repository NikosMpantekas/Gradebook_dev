import React, { useState, useEffect } from 'react';
import { Download, Info, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';

const AndroidInstallPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installStatus, setInstallStatus] = useState({ show: false, message: '', severity: 'info' });
  const [debugInfo, setDebugInfo] = useState('');

  // Store the beforeinstallprompt event in window for debugging access
  if (typeof window !== 'undefined') {
    window.pwaInstallEvent = installEvent;
  }

  useEffect(() => {
    // Only show on Android devices that don't have the app installed
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Check if already installed as PWA
    const isInStandaloneMode = () => 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
      document.referrer.includes('android-app://');
    
    const isInstalled = isInStandaloneMode();
    setDebugInfo(`Device: ${isAndroid ? 'Android' : 'Non-Android'}, Installed: ${isInstalled}`);
    console.log(`[PWA] Device detection - Android: ${isAndroid}, Installed: ${isInstalled}`);

    // Force debug information to console to help troubleshoot
    console.log('[PWA] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    console.log('[PWA] navigator.standalone:', window.navigator.standalone);
    console.log('[PWA] Service Worker supported:', 'serviceWorker' in navigator);
    console.log('[PWA] User Agent:', navigator.userAgent);
    
    // Check PWA requirements
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        console.log('[PWA] Service Worker registration:', registration);
      }).catch(err => {
        console.error('[PWA] Service Worker registration error:', err);
      });
    }
    
    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    console.log('[PWA] Manifest link:', manifestLink?.href);

    if (isAndroid && !isInstalled) {
      console.log('[PWA] Android device detected, not installed yet');
      
      // Show prompt after 3 seconds if they haven't dismissed it before
      const hasPromptBeenDismissed = localStorage.getItem('android_install_prompt_dismissed');
      
      if (!hasPromptBeenDismissed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] Before install prompt event fired');
      e.preventDefault();
      setInstallEvent(e);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setInstallStatus({
        show: true,
        message: 'GradeBook has been successfully installed on your device!',
        severity: 'success'
      });
      setIsOpen(false);
      localStorage.removeItem('android_install_prompt_dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      console.log('[PWA] No install event available');
      return;
    }

    try {
      console.log('[PWA] Prompting user to install');
      const result = await installEvent.prompt();
      console.log('[PWA] Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setInstallStatus({
          show: true,
          message: 'Installation started! Please follow the prompts on your device.',
          severity: 'info'
        });
      } else {
        console.log('[PWA] User dismissed the install prompt');
        setInstallStatus({
          show: true,
          message: 'Installation was cancelled. You can install later from your browser menu.',
          severity: 'info'
        });
      }
    } catch (error) {
      console.error('[PWA] Error during install prompt:', error);
      setInstallStatus({
        show: true,
        message: 'An error occurred during installation. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('android_install_prompt_dismissed', 'true');
  };

  const handleCloseStatus = () => {
    setInstallStatus({ ...installStatus, show: false });
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                Install GradeBook App
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Get the full app experience by installing GradeBook on your device
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Installation is free and takes just a few seconds</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleInstall}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Status Snackbar */}
      {installStatus.show && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          installStatus.severity === 'success' 
            ? 'bg-green-100 border border-green-200 text-green-800' 
            : installStatus.severity === 'error'
            ? 'bg-red-100 border border-red-200 text-red-800'
            : 'bg-blue-100 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {installStatus.severity === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : installStatus.severity === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Info className="h-5 w-5 text-blue-600" />
              )}
              <span className="text-sm font-medium">{installStatus.message}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseStatus}
              className="h-6 w-6 p-0 text-current hover:bg-current/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AndroidInstallPrompt;
