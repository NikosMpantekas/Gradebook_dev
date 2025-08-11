import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';

const Footer = () => {
  // Use state to store the version
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Fetch the latest patch note version
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
            console.log('Footer - Latest patch note version:', latestPatchNote.version);
          } else {
            throw new Error('No version found in latest patch note');
          }
        } else {
          throw new Error('No patch notes found');
        }
      } catch (error) {
        console.error('Footer - Failed to fetch latest patch note version:', error);
        
        // Fallback to appConfig version if patch notes fetch fails
        try {
          const module = await import('../../config/appConfig.js');
          setVersion(module.appConfig.version);
          console.log('Footer - Using fallback version from appConfig:', module.appConfig.version);
        } catch (configError) {
          console.error('Footer - Failed to load appConfig fallback:', configError);
          setVersion('0.0.0');
        }
      } finally {
        setLoading(false);
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
      <Typography variant="body2" color="text.secondary">
        {'Version: '}{loading ? 'Loading...' : (version || '0.0.0')}
      </Typography>
    </Box>
  );
};

export default Footer;
