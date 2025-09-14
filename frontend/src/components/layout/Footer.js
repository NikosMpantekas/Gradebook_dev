import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, appConfig } from '../../config/appConfig';
import { useSelector } from 'react-redux';
import { Separator } from '../ui/separator';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

const Footer = () => {
  const { darkMode } = useSelector((state) => state.ui);
  const { getCurrentThemeData } = useTheme();
  
  // Start with appConfig version immediately (no loading state)
  const [version, setVersion] = useState(appConfig.version);
  const [showVersion, setShowVersion] = useState(true);
  
  // Debug logging
  console.log('Footer - Initial appConfig version:', appConfig.version);
  
  // Fetch the latest patch note version (runs in background)
  useEffect(() => {
    const fetchLatestVersion = async () => {
      try {
        const apiUrl = `${API_URL}/api/patch-notes/public`;
        console.log('Footer - Starting patch notes fetch...');
        console.log('Footer - API URL:', apiUrl);
        console.log('Footer - Current version before fetch:', version);
        
        // Fetch the latest patch notes (public endpoint, no auth needed)
        const response = await axios.get(apiUrl, {
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Footer - API Response received:', response.status);
        console.log('Footer - Response data:', response.data);
        
        if (response.data && response.data.length > 0) {
          // Sort patch notes by creation date (newest first) and get the latest version
          const sortedPatchNotes = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latestPatchNote = sortedPatchNotes[0];
          
          console.log('Footer - Latest patch note found:', latestPatchNote);
          
          if (latestPatchNote.version) {
            setVersion(latestPatchNote.version);
            setShowVersion(true);
            console.log('Footer - ✅ Updated to latest patch note version:', latestPatchNote.version);
          } else {
            throw new Error('No version field found in latest patch note');
          }
        } else {
          throw new Error('No patch notes returned from API');
        }
      } catch (error) {
        console.error('Footer - Failed to fetch latest patch note version:', error);
        console.error('Footer - API_URL being used:', API_URL);
        console.error('Footer - Full error details:', error.response || error.message);
        
        // Keep showing appConfig version if patch notes fetch fails
        setVersion(appConfig.version);
        setShowVersion(true);
        console.log('Footer - Keeping appConfig version due to patch notes fetch failure:', appConfig.version);
      }
    };
    
    fetchLatestVersion();
  }, []);
  
  // Get themed background color matching the body
  const getThemedFooterBg = () => {
    const themeData = getCurrentThemeData();
    if (!themeData) return darkMode ? "#181b20" : undefined;
    
    try {
      const primaryColor = darkMode 
        ? themeData.darkColors?.primary || themeData.colors.primary
        : themeData.colors.primary;
      
      const hex = primaryColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      if (darkMode) {
        // Same tint as the main background
        const tintedR = Math.max(24, Math.min(35, 24 + Math.round(r * 0.05)));
        const tintedG = Math.max(27, Math.min(38, 27 + Math.round(g * 0.05)));
        const tintedB = Math.max(32, Math.min(43, 32 + Math.round(b * 0.05)));
        return `rgb(${tintedR}, ${tintedG}, ${tintedB})`;
      } else {
        // Same tint as the main background  
        const tintedR = Math.max(245, Math.min(255, 248 + Math.round(r * 0.02)));
        const tintedG = Math.max(245, Math.min(255, 250 + Math.round(g * 0.02)));
        const tintedB = Math.max(245, Math.min(255, 250 + Math.round(b * 0.02)));
        return `rgb(${tintedR}, ${tintedG}, ${tintedB})`;
      }
    } catch {
      return darkMode ? "#181b20" : undefined;
    }
  };
  
  const themedFooterBg = getThemedFooterBg();
  
  return (
    <footer 
      className={cn(
        "w-full border-t border-border transition-all duration-200",
        !themedFooterBg && "bg-background"
      )}
      style={{
        backgroundColor: themedFooterBg || undefined
      }}
    >
      <div className="container mx-auto px-4 h-28 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: darkMode ? '#9CA3AF' : '#6B7280' }}>
            © {new Date().getFullYear()} GradeBook - Progressive Web App created by the GradeBook Team.
          </p>
          
          {showVersion && (
            <>
              <Separator className="w-20 mx-auto" style={{ backgroundColor: darkMode ? '#4B5563' : '#D1D5DB' }} />
              <p className="text-xs" style={{ color: darkMode ? '#6B7280' : '#9CA3AF' }}>
                Version: {version}
              </p>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
