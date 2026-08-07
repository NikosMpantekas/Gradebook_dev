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

  // Fetch the latest patch note version (runs in background)
  useEffect(() => {
    const fetchLatestVersion = async () => {
      try {
        const apiUrl = `${API_URL}/api/patch-notes/public`;

        // Fetch the latest patch notes (public endpoint, no auth needed)
        const response = await axios.get(apiUrl, {
          timeout: 10000 // 10 second timeout
        });

        if (response.data && response.data.length > 0) {
          // Sort patch notes by creation date (newest first) and get the latest version
          const sortedPatchNotes = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latestPatchNote = sortedPatchNotes[0];

          if (latestPatchNote.version) {
            setVersion(latestPatchNote.version);
            setShowVersion(true);
          } else {
            throw new Error('No version field found in latest patch note');
          }
        } else {
          throw new Error('No patch notes returned from API');
        }
      } catch (error) {
        // Keep showing appConfig version if patch notes fetch fails
        setVersion(appConfig.version);
        setShowVersion(true);
      }
    };

    fetchLatestVersion();
  }, []);

  // Get themed background color matching the body
  const getThemedFooterBg = () => {
    const themeData = getCurrentThemeData();
    if (!themeData) return darkMode ? "#181b20" : undefined;

    try {
      const colors = darkMode ? themeData.darkColors || themeData.colors : themeData.colors;
      const bgHex = colors.background.replace('#', '');
      const bgR = parseInt(bgHex.substr(0, 2), 16);
      const bgG = parseInt(bgHex.substr(2, 2), 16);
      const bgB = parseInt(bgHex.substr(4, 2), 16);

      const primaryHex = colors.primary.replace('#', '');
      const pR = parseInt(primaryHex.substr(0, 2), 16);
      const pG = parseInt(primaryHex.substr(2, 2), 16);
      const pB = parseInt(primaryHex.substr(4, 2), 16);

      // Blend a subtle primary tint onto the actual background
      const blend = darkMode ? 0.04 : 0.02;
      const r = Math.round(bgR + (pR - bgR) * blend);
      const g = Math.round(bgG + (pG - bgG) * blend);
      const b = Math.round(bgB + (pB - bgB) * blend);

      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return darkMode ? "#181b20" : undefined;
    }
  };

  const themedFooterBg = getThemedFooterBg();

  return (
    <footer
      className={cn(
        "w-full border-t border-border transition-colors duration-200",
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
