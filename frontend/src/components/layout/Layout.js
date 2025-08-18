import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cn } from '../../lib/utils';

import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import OfflineDetector from '../OfflineDetector';

const Layout = () => {
  const location = useLocation();
  
  // Retrieve previous mobileOpen state from localStorage to prevent it from resetting on navigation
  const [mobileOpen, setMobileOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    // Always default to false for mobile, false for desktop (mobile sidebar should never be open on desktop)
    return window.innerWidth < 600 ? false : false;
  });

  const { darkMode } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  // Debug logging for layout rendering
  useEffect(() => {
    console.log('Layout component rendering at path:', location.pathname);
    console.log('Current user data:', user ? {
      id: user._id,
      name: user.name,
      role: user.role,
      hasToken: !!user.token
    } : 'No user');
    console.log('Sidebar state on render:', mobileOpen);
  }, [location.pathname, user, mobileOpen]);

  // Enhanced drawer toggle that also persists the state
  const handleDrawerToggle = () => {
    const newState = !mobileOpen;
    setMobileOpen(newState);
    // Persist the state in localStorage
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  // Sidebar width for layout spacing
  const drawerWidth = 256; // Fixed: 256px = 64 * 4 (lg:w-64)

  // Store the current section in localStorage to maintain context across refreshes
  useEffect(() => {
    if (location.pathname.includes('/superadmin/')) {
      localStorage.setItem('currentSection', 'superadmin');
    } else if (location.pathname.includes('/admin/')) {
      localStorage.setItem('currentSection', 'admin');
    }
  }, [location.pathname]);

  // This ensures we have persistent sidebar state regardless of navigation
  useEffect(() => {
    // Save sidebar state on route change
    localStorage.setItem('sidebarOpen', mobileOpen.toString());
    // Set up listener for browser back/forward navigation
    const handlePopState = () => {
      // Restore sidebar state from localStorage
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState !== null) {
        setMobileOpen(savedState === 'true');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileOpen, location.pathname]);

  // Handle window resize to properly manage mobile sidebar state
  useEffect(() => {
    const handleResize = () => {
      // If window is resized to desktop size, close mobile sidebar
      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen(false);
        localStorage.setItem('sidebarOpen', 'false');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  return (
    <div className={cn(
      "flex min-h-screen layout-stable",
      "bg-background"
    )}>
      <Header 
        drawerWidth={drawerWidth} 
        handleDrawerToggle={handleDrawerToggle} 
      />
      <Sidebar 
        drawerWidth={drawerWidth} 
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <main className={cn(
        "flex-1 flex flex-col min-h-screen overflow-x-hidden layout-stable",
        "lg:ml-64" // Fixed: Account for sidebar width on desktop (64 * 4 = 256px)
      )}>
        {/* Main content area */}
        <div className={cn(
          "flex-1 flex flex-col w-full",
          "mt-14 sm:mt-16", // Account for header height
          "p-1 sm:p-2 md:p-3"
        )}>
          <OfflineDetector>
            <Outlet />
          </OfflineDetector>
        </div>
        
        {/* Footer - positioned at bottom of main content */}
        <div className="mt-auto pt-4">
          <Footer />
        </div>
      </main>
    </div>
  );
};

export default Layout;
