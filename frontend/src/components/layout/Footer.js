import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { API_URL, appConfig } from '../../config/appConfig';

const Footer = () => {
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
