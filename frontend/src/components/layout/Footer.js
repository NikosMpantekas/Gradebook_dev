import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { API_URL, appConfig } from '../../config/appConfig';

const Footer = () => {
  // Start with appConfig version immediately (no loading state)
  const [version, setVersion] = useState(appConfig.version);
  const [showVersion, setShowVersion] = useState(true);
  
  // Fetch the latest patch note version (runs in background)
  useEffect(() => {
    const fetchLatestVersion = async () => {
      try {
        console.log('Footer - Fetching latest patch note version...');
        
        // Fetch the latest patch notes (public endpoint, no auth needed)
        const response = await axios.get(`${API_URL}/api/patch-notes/public`);
        
        if (response.data && response.data.length > 0) {
          // Sort patch notes by creation date (newest first) and get the latest version
          const sortedPatchNotes = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latestPatchNote = sortedPatchNotes[0];
          
          if (latestPatchNote.version) {
            setVersion(latestPatchNote.version);
            setShowVersion(true);
            console.log('Footer - Updated to latest patch note version:', latestPatchNote.version);
          } else {
            throw new Error('No version found in latest patch note');
          }
        } else {
          throw new Error('No patch notes found');
        }
      } catch (error) {
        console.error('Footer - Failed to fetch latest patch note version:', error);
        
        // Hide version if patch notes fetch fails (as requested by user)
        setShowVersion(false);
        console.log('Footer - Hiding version due to patch notes fetch failure');
      }
    };
    
    fetchLatestVersion();
  }, []);
  
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {'© '}
        {new Date().getFullYear()}
        {' GradeBook - Progressive Web App \n Created by the GradeBook Team'}
      </Typography>
      {showVersion && (
        <Typography variant="body2" color="text.secondary">
          {'Version: '}{version}
        </Typography>
      )}
    </Box>
  );
};

export default Footer;
