import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config/appConfig';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Divider,
  Button,
  CircularProgress,
  Badge,
  useMediaQuery,
  useTheme,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Email as EmailIcon,
  BugReport as BugReportIcon,
  Announcement as AnnouncementIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import ContactDeveloper from '../components/ContactDeveloper';
import UserMessagesList from '../components/UserMessagesList';
import PatchNotesList from '../components/PatchNotesList';
import PatchNoteEditor from '../components/PatchNoteEditor';
import AdminMessagesList from '../components/AdminMessagesList';
import axios from 'axios';
import { toast } from 'react-toastify';

// Custom Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ padding: '20px 0' }}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

const ContactMessages = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Check if this is the superadmin patch notes route
  const isSuperadminPatchNotesRoute = location.pathname === '/superadmin/patch-notes';
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [userMessages, setUserMessages] = useState([]);
  const [patchNotes, setPatchNotes] = useState([]);
  
  // For admins/superadmins only
  const [allMessages, setAllMessages] = useState([]);

  // Optional editor ref (superadmin only)
  const patchNoteEditorRef = React.useRef(null);

  const handleEditPatchNote = (note) => {
    if (patchNoteEditorRef.current && patchNoteEditorRef.current.handleEdit) {
      patchNoteEditorRef.current.handleEdit(note);
    }
  };

  const handleDeletePatchNote = async (note) => {
    // Deletion handled inside PatchNotesList typically; keep placeholder for compatibility
    console.log('Delete patch note requested:', note?._id);
  };

  const myUnreadCount = userMessages.filter(m => m.status === 'replied' && m.adminReply && !m.replyRead).length;
  const isAdminRole = user?.role === 'admin' || user?.role === 'superadmin';
  const allUnreadCount = isAdminRole ? allMessages.filter(m => m.read === false).length : 0;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    
    // If this is the superadmin patch notes route, only fetch patch notes
    if (isSuperadminPatchNotesRoute) {
      fetchPatchNotes();
      return;
    }
    
    // Initial fetches for full contact messages page
    (async () => {
      await Promise.all([
        (async () => fetchUserMessages())(),
        (async () => fetchPatchNotes())(),
        (async () => { if (isAdminRole) await fetchAllMessages(); })(),
      ]);
    })();
    // We intentionally omit functions to avoid ref churn; they are stable within this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, isAdminRole, isSuperadminPatchNotesRoute]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleOpenContact = () => setContactOpen(true);
  const handleCloseContact = () => { setContactOpen(false); fetchUserMessages(); };

  const fetchUserMessages = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`${API_URL}/api/contact/user`, config);
      setUserMessages(response.data);
    } catch (error) {
      console.error('Error fetching user messages:', error);
      toast.error('Failed to load your messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    if (!user || !user.token || !isAdminRole) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`${API_URL}/api/contact`, config);
      setAllMessages(response.data);
    } catch (error) {
      console.error('Error fetching all messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatchNotes = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`${API_URL}/api/patch-notes`, config);
      setPatchNotes(response.data);
    } catch (error) {
      console.error('Error fetching patch notes:', error);
      toast.error('Failed to load patch notes');
    } finally {
      setLoading(false);
    }
  };

  const renderLabel = (text, count) => (
    <Badge color="error" badgeContent={count} invisible={count === 0} max={99}>
      <Box component="span" sx={{ maxWidth: { xs: 120, sm: 'unset' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
        {text}
      </Box>
    </Badge>
  );

  // If this is the superadmin patch notes route, show only patch notes
  if (isSuperadminPatchNotesRoute) {
    return (
      <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 3, md: 4 }, display: 'flex', flexDirection: 'column', borderRadius: 2, mt: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, overflowX: 'hidden' }}>
          <Typography component="h1" variant="h6" sx={{ mb: { xs: 1.5, sm: 3 }, fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>Patch Notes Management</Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {user?.role === 'superadmin' && (
                <PatchNoteEditor ref={patchNoteEditorRef} user={user} onPatchNotesChanged={fetchPatchNotes} />
              )}
              <PatchNotesList 
                patchNotes={patchNotes} 
                user={user} 
                onEdit={handleEditPatchNote} 
                onDelete={handleDeletePatchNote} 
              />
            </>
          )}
        </Paper>
      </Box>
    );
  }

  const tabDefs = isAdminRole
    ? [
        { key: 'all', label: 'All Messages', icon: <BugReportIcon />, panel: (loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> : <AdminMessagesList messages={allMessages} user={user} onMessagesChanged={fetchAllMessages} />) },
        { key: 'my', label: 'My Messages', icon: <EmailIcon />, panel: (<><Box sx={{ mb: { xs: 1.5, sm: 3 } }}><Button variant="contained" color="primary" startIcon={<EmailIcon />} onClick={handleOpenContact} size={isMobile ? 'small' : 'medium'} sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: '0.8rem', sm: '1rem' } }}>Contact Support</Button></Box>{loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> : <UserMessagesList messages={userMessages} />}</>) },
        { key: 'patch', label: 'Patch Notes', icon: <AnnouncementIcon />, panel: (loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> : (<>{user?.role === 'superadmin' && (<PatchNoteEditor ref={patchNoteEditorRef} user={user} onPatchNotesChanged={fetchPatchNotes} />)}<PatchNotesList patchNotes={patchNotes} user={user} onEdit={handleEditPatchNote} onDelete={handleDeletePatchNote} /></>)) },
      ]
    : [
        { key: 'my', label: 'My Messages', icon: <EmailIcon />, panel: (<><Box sx={{ mb: { xs: 1.5, sm: 3 } }}><Button variant="contained" color="primary" startIcon={<EmailIcon />} onClick={handleOpenContact} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>Contact Support</Button></Box>{loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> : <UserMessagesList messages={userMessages} />}</>) },
        { key: 'patch', label: 'Patch Notes', icon: <AnnouncementIcon />, panel: (loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> : (<>{user?.role === 'superadmin' && (<PatchNoteEditor ref={patchNoteEditorRef} user={user} onPatchNotesChanged={fetchPatchNotes} />)}<PatchNotesList patchNotes={patchNotes} user={user} onEdit={handleEditPatchNote} onDelete={handleDeletePatchNote} /></>)) },
      ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 3, md: 4 }, display: 'flex', flexDirection: 'column', borderRadius: 2, mt: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, overflowX: 'hidden' }}>
        <Typography component="h1" variant="h6" sx={{ mb: { xs: 1.5, sm: 3 }, fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>Support & Announcements</Typography>
        
        {/* Mobile: Dropdown Selector */}
        {isMobile ? (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={tabValue}
              onChange={(e) => setTabValue(e.target.value)}
              displayEmpty
              IconComponent={ExpandMoreIcon}
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.9rem'
                }
              }}
            >
              {tabDefs.map((tab, index) => (
                <MenuItem key={tab.key} value={index}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {tab.icon}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{tab.label}</span>
                      {tab.key === 'all' && allUnreadCount > 0 && (
                        <Badge color="error" badgeContent={allUnreadCount} max={99} />
                      )}
                      {tab.key === 'my' && myUnreadCount > 0 && (
                        <Badge color="error" badgeContent={myUnreadCount} max={99} />
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          /* Desktop: Tabs */
          <>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="support tabs" variant="fullWidth" sx={{ '& .MuiTab-root': { fontSize: '1rem', minHeight: '56px', textTransform: 'none' } }}>
              {tabDefs.map((t, i) => (
                <Tab key={t.key} label={renderLabel(t.label, t.key === 'all' ? allUnreadCount : t.key === 'my' ? myUnreadCount : 0)} icon={t.icon} iconPosition="start" id={`tab-${i}`} aria-controls={`tabpanel-${i}`} />
              ))}
            </Tabs>
            <Divider sx={{ mt: 1, mb: 2 }} />
          </>
        )}
        
        {/* Content Panels */}
        {tabDefs.map((t, i) => (
          <TabPanel key={t.key} value={tabValue} index={i}>
            {t.panel}
          </TabPanel>
        ))}
      </Paper>
      <ContactDeveloper open={contactOpen} onClose={handleCloseContact} />
    </Box>
  );
};

export default ContactMessages;
