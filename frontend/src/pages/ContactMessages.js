import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config/appConfig';
import { 
  Mail as EmailIcon,
  Bug as BugIcon,
  Megaphone as AnnouncementIcon,
  ChevronDown as ExpandMoreIcon
} from 'lucide-react';
import ContactDeveloper from '../components/ContactDeveloper';
import UserMessagesList from '../components/UserMessagesList';
import PatchNotesList from '../components/PatchNotesList';
import PatchNoteEditor from '../components/PatchNoteEditor';
import AdminMessagesList from '../components/AdminMessagesList';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Spinner } from '../components/ui/spinner';
// shadcn components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { useTheme } from '../components/theme-provider';
import { useTranslation } from 'react-i18next';

const ContactMessages = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();
  const { t } = useTranslation();
  
  
  
  // Check if this is the superadmin patch notes route
  const isSuperadminPatchNotesRoute = location.pathname === '/superadmin/patch-notes';
  
  const [tabValue, setTabValue] = useState('my');
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

  const handleTabChange = (value) => setTabValue(value);

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
      toast.error(t('contactMessages.loadUserFailed'));
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
      toast.error(t('contactMessages.loadAllFailed'));
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
      toast.error(t('contactMessages.loadPatchNotesFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderLabel = (text, count) => (
    <div className="flex items-center gap-2">
      <span>{text}</span>
      {count > 0 && (
        <Badge variant="destructive" className="ml-1">
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </div>
  );

  // If this is the superadmin patch notes route, show only patch notes
  if (isSuperadminPatchNotesRoute) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <Card className="p-4 md:p-6 lg:p-8 mt-4 md:mt-6 mb-4 md:mb-6 overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-bold">{t('contactMessages.patchNotesManagement')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center my-8">
                <Spinner className="text-primary" />
              </div>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabDefs = isAdminRole
    ? [
        { key: 'my', label: t('contactMessages.tabs.my'), icon: <EmailIcon className="h-4 w-4" />, panel: (<>{loading ? <div className="flex justify-center my-8"><Spinner className="text-primary" /></div> : <UserMessagesList messages={userMessages} />}</>) },
        { key: 'patch', label: t('contactMessages.tabs.patch'), icon: <AnnouncementIcon className="h-4 w-4" />, panel: (loading ? <div className="flex justify-center my-8"><Spinner className="text-primary" /></div> : (<>{user?.role === 'superadmin' && (<PatchNoteEditor ref={patchNoteEditorRef} user={user} onPatchNotesChanged={fetchPatchNotes} />)}<PatchNotesList patchNotes={patchNotes} user={user} onEdit={handleEditPatchNote} onDelete={handleDeletePatchNote} /></>)) },
      ]
    : [
        { key: 'my', label: t('contactMessages.tabs.my'), icon: <EmailIcon className="h-4 w-4" />, panel: (<>{loading ? <div className="flex justify-center my-8"><Spinner className="text-primary" /></div> : <UserMessagesList messages={userMessages} />}</>) },
        { key: 'patch', label: t('contactMessages.tabs.patch'), icon: <AnnouncementIcon className="h-4 w-4" />, panel: (loading ? <div className="flex justify-center my-8"><Spinner className="text-primary" /></div> : (<>{user?.role === 'superadmin' && (<PatchNoteEditor ref={patchNoteEditorRef} user={user} onPatchNotesChanged={fetchPatchNotes} />)}<PatchNotesList patchNotes={patchNotes} user={user} onEdit={handleEditPatchNote} onDelete={handleDeletePatchNote} /></>)) },
      ];

  return (
    <div className="w-full mx-auto p-4 sm:p-6">
      <Card className="mt-4 md:mt-6 mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold">{t('contactMessages.supportAndAnnouncements')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Dropdown Selector */}
          <div className="block md:hidden mb-4">
            <Select value={tabValue} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('contactMessages.selectTab')} />
              </SelectTrigger>
              <SelectContent>
                {tabDefs.map((tab) => (
                  <SelectItem key={tab.key} value={tab.key}>
                    <div className="flex items-center gap-2 w-full">
                      {tab.icon}
                      <div className="flex items-center gap-2">
                        <span>{t(`contactMessages.tabs.${tab.key}`)}</span>
                        {tab.key === 'all' && allUnreadCount > 0 && (
                          <Badge variant="destructive">{allUnreadCount > 99 ? '99+' : allUnreadCount}</Badge>
                        )}
                        {tab.key === 'my' && myUnreadCount > 0 && (
                          <Badge variant="destructive">{myUnreadCount > 99 ? '99+' : myUnreadCount}</Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs */}
          <div className="hidden md:block">
            <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full">
              <TabsList className={`grid w-full ${isAdminRole ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-100 dark:bg-gray-800`}>
                {tabDefs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                    {tab.icon}
                    {renderLabel(tab.label, tab.key === 'all' ? allUnreadCount : tab.key === 'my' ? myUnreadCount : 0)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Separator className="mt-4 mb-6" />
              
              {/* Content Panels */}
              {tabDefs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                  {tab.panel}
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          {/* Mobile Content Panels */}
          <div className="md:hidden">
            {tabDefs.map((tab) => (
              <div key={tab.key} className={tabValue === tab.key ? 'block' : 'hidden'}>
                {tab.panel}
              </div>
            ))}
          </div>
          
          {/* Contact Support Button - Only visible on "My Messages" tab */}
          {tabValue === 'my' && (
            <div className="flex justify-end mt-6 pt-4 border-t border-border">
              <Button 
                onClick={handleOpenContact} 
                className="transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/20 hover:border-primary/60 group bg-background border-2 border-border shadow-lg text-foreground"
                size="lg"
              >
                <EmailIcon className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                {t('contactMessages.contactSupport')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ContactDeveloper open={contactOpen} onClose={handleCloseContact} />
    </div>
  );
};

export default ContactMessages;
