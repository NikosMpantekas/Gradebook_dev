import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getUsers, deleteUser, reset } from '../../features/users/userSlice';
import { getSchools } from '../../features/schools/schoolSlice';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Search as SearchIcon,
  RefreshCw as RefreshIcon,
  Mail as EmailIcon,
  Building as SchoolIcon,
  Book as BookIcon,
  Calendar as ScheduleIcon
} from 'lucide-react';

import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// Import our custom components
import { useIsMobile } from '../../components/hooks/use-mobile';

const ManageUsers = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const { users, isLoading, isSuccess, isError, message } = useSelector(state => state.users);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Create a ref to track if users have been loaded
  const dataLoaded = React.useRef(false);
  
  // Get schools data from Redux store
  const { schools, isLoading: schoolsLoading } = useSelector((state) => state.schools);
  
  // Define applyFilters function using useCallback
  const applyFilters = useCallback(() => {
    let filtered = [...users];
    
    // Filter by search term (name or email)
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filter by school branch - show users assigned to classes within the selected school branch
    if (schoolFilter && schoolFilter !== "all") {
      filtered = filtered.filter(user => {
        // Direct school assignment check (for admin/secretaries and teachers)
        if (user.school) {
          if (Array.isArray(user.school)) {
            const directMatch = user.school.some(school => 
              (typeof school === 'object' ? school._id : school) === schoolFilter
            );
            if (directMatch) return true;
          } else {
            const directMatch = (typeof user.school === 'object' ? user.school._id : user.school) === schoolFilter;
            if (directMatch) return true;
          }
        }
        
        // Also check user.schools array for direct assignments
        if (user.schools && Array.isArray(user.schools)) {
          const directMatch = user.schools.some(school => 
            (typeof school === 'object' ? school._id : school) === schoolFilter
          );
          if (directMatch) return true;
        }
        
        // For students and teachers: check if they belong to classes within this school branch
        const userClassesInBranch = classes.filter(cls => 
          cls.schoolBranch === schoolFilter || cls.schoolId === schoolFilter
        );
        
        if (userClassesInBranch.length === 0) return false;
        
        // Check if user is a student in any class within this school branch
        if (user.role === 'student') {
          return userClassesInBranch.some(cls => 
            cls.students && cls.students.some(student => 
              (typeof student === 'object' ? student._id : student) === user._id
            )
          );
        }
        
        // Check if user is a teacher in any class within this school branch
        if (user.role === 'teacher') {
          return userClassesInBranch.some(cls => 
            cls.teachers && cls.teachers.some(teacher => 
              (typeof teacher === 'object' ? teacher._id : teacher) === user._id
            )
          );
        }
        
        return false;
      });
    }

    // Filter by class - check if user is associated with the selected class
    if (classFilter && classFilter !== "all") {
      filtered = filtered.filter(user => {
        const selectedClass = classes.find(cls => cls._id === classFilter);
        if (!selectedClass) return false;
        
        // For students: check if they are enrolled in this class
        if (user.role === 'student' && selectedClass.students && Array.isArray(selectedClass.students)) {
          return selectedClass.students.some(student => 
            (typeof student === 'object' ? student._id : student) === user._id
          );
        }
        
        // For teachers: check if they teach in this class
        if (user.role === 'teacher' && selectedClass.teachers && Array.isArray(selectedClass.teachers)) {
          return selectedClass.teachers.some(teacher => 
            (typeof teacher === 'object' ? teacher._id : teacher) === user._id
          );
        }
        
        // For admins and others, no class association
        return false;
      });
    }

    console.log('Filtered users:', filtered.length, 'out of', users.length);
    setFilteredUsers(filtered);
    setPage(0);
  }, [users, searchTerm, roleFilter, schoolFilter, classFilter, classes]);
  
  // Fetch classes data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setClassesLoading(true);
        const response = await fetch(`${currentUser?.baseURL || 'https://beta-backend.gradebook.pro'}/api/classes`, {
          headers: {
            'Authorization': `Bearer ${currentUser?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setClasses(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to fetch classes');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setClassesLoading(false);
      }
    };
    
    if (currentUser?.token) {
      fetchClasses();
    }
  }, [currentUser?.token]);

  // Monitor data loading state changes
  useEffect(() => {
    console.log('Loading state changed:', {
      usersLoading: isLoading,
      usersCount: Array.isArray(users) ? users.length : 'not array',
      schoolsCount: Array.isArray(schools) ? schools.length : 'not array'
    });
    
    // If we just finished loading and have data, apply filters
    if (!isLoading && Array.isArray(users) && users.length > 0) {
      applyFilters();
    }
  }, [isLoading, users, schools, classes, applyFilters]);

  // Debug logs
  console.log('ManageUsers rendering:', { 
    userState: currentUser?.name, 
    usersInStore: Array.isArray(users) ? users.length : 'not an array', 
    isLoadingState: isLoading, 
    isErrorState: isError,
    dataLoaded: dataLoaded.current
  });

  // IMPORTANT: Fix for the infinite loading state issue
  useEffect(() => {
    console.log('ManageUsers mounting and fetching data');
    
    // Reset the state first to clear any previous data
    dispatch(reset());
    
    // Load data
    dispatch(getUsers());
    dispatch(getSchools());
    
    // Mark as loaded when component mounts
    dataLoaded.current = true;
    
    // Clean up on unmount
    return () => {
      console.log('ManageUsers unmounting');
      dataLoaded.current = false;
    };
  }, [dispatch]);
  
  // Add visibility change handler to reload data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible again, refreshing data');
        dispatch(getUsers());
        dispatch(getSchools());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dispatch]);

  // Check for errors and display toast notification
  useEffect(() => {
    if (isError && message) {
      toast.error(`Error loading users: ${message}`);
      // Even on error, mark as loaded to prevent infinite loading state
      dataLoaded.current = true;
    }
  }, [isError, message]);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      console.log('Applying filters to', users.length, 'users');
      applyFilters();
    } else if (!isLoading && Array.isArray(users)) {
      applyFilters();
    }
  }, [searchTerm, roleFilter, schoolFilter, classFilter, users, isLoading, applyFilters]);


  const handleChangeRowsPerPage = (value) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setPage(0);
  };
  
  const handleSchoolFilterChange = (value) => {
    setSchoolFilter(value);
  };
  
  const handleClassFilterChange = (value) => {
    setClassFilter(value);
  };

  const handleAddUser = (isSecretary = false) => {
    // If the current user is a secretary, pass a query parameter to restrict creating secretary accounts
    if (isSecretary) {
      navigate('/app/admin/users/create?restrictSecretary=true');
    } else {
      navigate('/app/admin/users/create');
    }
  };

  const handleEditUser = (id) => {
    navigate(`/app/admin/users/${id}`);
  };

  // Delete User Dialog
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    
    // Prevent deleting yourself
    if (userToDelete._id === currentUser?._id) {
      toast.error('You cannot delete your own account');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }
    
    dispatch(deleteUser(userToDelete._id))
      .unwrap()
      .then(() => {
        toast.success('User deleted successfully');
        // The users list will be refreshed via the state update in the reducer
      })
      .catch((error) => {
        toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
      })
      .finally(() => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      });
  };
  
  // Handle success/error after delete operation
  useEffect(() => {
    if (isSuccess && message === 'user_deleted') {
      toast.success('User deleted successfully');
      dispatch(reset());
    }
  }, [isSuccess, message, dispatch]);

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'teacher':
        return 'bg-blue-500 text-white';
      case 'student':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getAvatarLetter = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Mobile card layout for users
  const renderMobileContent = () => {
  if (isLoading || !dataLoaded.current) {
    return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
          <span className="ml-2 text-sm">{t('admin.manageUsersPage.messages.loadingUsers')}</span>
        </div>
    );
  }

  if (isError) {
    return (
        <div className="py-4 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-1">{t('admin.manageUsersPage.errorLoadingUsers')}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {message || t('admin.manageUsersPage.unknownError')}
          </p>
            <Button 
              onClick={() => dispatch(getUsers())}
            className="gap-2"
            >
            <RefreshIcon className="h-4 w-4" />
              {t('admin.manageUsersPage.messages.tryAgain')}
            </Button>
        </div>
    );
  }

  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
        <div className="py-4 text-center">
          <p className="text-muted-foreground">{t('admin.manageUsersPage.messages.noUsersFound')}</p>
        </div>
    );
  }

  return (
      <div className="px-1 sm:px-2">
        {filteredUsers
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((user) => (
            <Card
              key={user._id}
              className="mb-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start gap-3">
                  <Avatar className={`w-12 h-12 flex-shrink-0 ${getRoleColor(user.role)}`}>
                    <AvatarFallback>{getAvatarLetter(user.name)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg overflow-hidden text-ellipsis whitespace-nowrap">
                        {user.name}
                      </h3>
                      <Badge variant="secondary">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <EmailIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>

                    {/* School and Direction information */}
                    {(user.schools?.length > 0 || user.school) && (
                      <div className="flex items-center gap-2 mb-2">
                        <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {user.schools && user.schools.length > 0 ? (
                            user.schools.map((school, idx) => (
                              <span key={idx}>
                                {school.name || school}
                                {idx < user.schools.length - 1 && ', '}
                              </span>
                            ))
                          ) : Array.isArray(user.school) ? (
                            user.school.map((school, idx) => (
                              <span key={idx}>
                                {school.name || school}
                                {idx < user.school.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            user.school?.name || user.school
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Subjects information */}
                    {user.subjects && user.subjects.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <BookIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {user.subjects.slice(0, 2).map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject.name || subject}
                            </Badge>
                          ))}
                          {user.subjects.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.subjects.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <ScheduleIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {t('admin.manageUsersPage.createdAt')}: {user.createdAt ? format(new Date(user.createdAt), 'PP') : t('admin.manageUsersPage.unknown')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user._id)}
                    disabled={currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin')}
                    title={currentUser?.role === 'secretary' && user._id === currentUser?._id ? t('admin.manageUsersPage.cannotEditOwnAccount') : 
                           currentUser?.role === 'secretary' && user.role === 'secretary' ? t('admin.manageUsersPage.cannotEditSecretaryAccounts') : 
                           currentUser?.role === 'secretary' && user.role === 'admin' ? t('admin.manageUsersPage.cannotEditAdminAccounts') : ''}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.role === 'admin' || 
                              (currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin'))}
                    title={user.role === 'admin' ? t('admin.manageUsersPage.adminAccountsCannotBeDeleted') : 
                           currentUser?.role === 'secretary' && user._id === currentUser?._id ? t('admin.manageUsersPage.cannotDeleteOwnAccount') : 
                           currentUser?.role === 'secretary' && user.role === 'secretary' ? t('admin.manageUsersPage.cannotDeleteSecretaryAccounts') : 
                           currentUser?.role === 'secretary' && user.role === 'admin' ? t('admin.manageUsersPage.cannotDeleteAdminAccounts') : ''}
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    );
  };

  // Desktop table layout
  const renderDesktopContent = () => {
    return (
      <div className="mt-6 rounded-lg border bg-card dark:border-gray-600">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageUsersPage.name')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageUsersPage.email')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageUsersPage.role')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageUsersPage.createdAt')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageUsersPage.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <tr key={user._id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-800">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className={`w-10 h-10 ${getRoleColor(user.role)}`}>
                            <AvatarFallback className="text-sm font-medium">
                              {getAvatarLetter(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground text-base">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-foreground text-base">{user.email}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4 text-foreground text-base">
                        {user.createdAt ? format(new Date(user.createdAt), 'PP') : t('admin.manageUsersPage.unknown')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user._id)}
                            disabled={currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin')}
                            title={currentUser?.role === 'secretary' && user._id === currentUser?._id ? t('admin.manageUsersPage.cannotEditOwnAccount') : 
                                   currentUser?.role === 'secretary' && user.role === 'secretary' ? t('admin.manageUsersPage.cannotEditSecretaryAccounts') : 
                                   currentUser?.role === 'secretary' && user.role === 'admin' ? t('admin.manageUsersPage.cannotEditAdminAccounts') : ''}
                            className="hover:bg-muted dark:hover:bg-gray-700 px-4 py-2"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={user.role === 'admin' || 
                                      (currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin'))}
                            title={user.role === 'admin' ? t('admin.manageUsersPage.adminAccountsCannotBeDeleted') : 
                                   currentUser?.role === 'secretary' && user._id === currentUser?._id ? t('admin.manageUsersPage.cannotDeleteOwnAccount') : 
                                   currentUser?.role === 'secretary' && user.role === 'secretary' ? t('admin.manageUsersPage.cannotDeleteSecretaryAccounts') : 
                                   currentUser?.role === 'secretary' && user.role === 'admin' ? t('admin.manageUsersPage.cannotDeleteAdminAccounts') : ''}
                            className="hover:bg-red-700 dark:hover:bg-red-600 px-4 py-2"
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    {isLoading ? (
                      <div className="flex justify-center items-center gap-3 py-6">
                        <Spinner size="sm" />
                        <span className="text-base text-foreground">{t('admin.manageUsersPage.messages.loadingUsers')}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-base">{t('admin.manageUsersPage.messages.noUsersFoundMatchingCriteria')}</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination controls */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t('admin.manageUsersPage.messages.showingUsers', {
                  start: page * rowsPerPage + 1,
                  end: Math.min((page + 1) * rowsPerPage, filteredUsers.length),
                  total: filteredUsers.length
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={rowsPerPage.toString()} onValueChange={handleChangeRowsPerPage}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t('admin.manageUsersPage.messages.rowsPerPage.5')}</SelectItem>
                  <SelectItem value="10">{t('admin.manageUsersPage.messages.rowsPerPage.10')}</SelectItem>
                  <SelectItem value="25">{t('admin.manageUsersPage.messages.rowsPerPage.25')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                {t('admin.manageUsersPage.messages.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(Math.ceil(filteredUsers.length / rowsPerPage) - 1, page + 1))}
                disabled={page >= Math.ceil(filteredUsers.length / rowsPerPage) - 1}
              >
                {t('admin.manageUsersPage.messages.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Always show a basic structure even while loading to prevent blank screen
  // This prevents the white screen flash when navigating to this page
  if (isLoading || !dataLoaded.current) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('admin.manageUsersPage.title')}</h1>
          <Button 
            disabled
            className="gap-2"
          >
            <AddIcon className="h-4 w-4" />
            {t('admin.manageUsersPage.addUser')}
          </Button>
        </div>

        <div className="rounded-lg border bg-card dark:border-gray-600 p-10 flex flex-col items-center justify-center min-h-[300px]">
          <Spinner size="xl" />
          <h2 className="text-xl font-semibold mt-6 text-foreground">{t('admin.manageUsersPage.messages.loadingUsers')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('admin.manageUsersPage.messages.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('admin.manageUsersPage.title')}</h1>
          <Button 
            onClick={handleAddUser}
            className="gap-2"
          >
            <AddIcon className="h-4 w-4" />
            {t('admin.manageUsersPage.addUser')}
          </Button>
        </div>
        <div className="rounded-lg border bg-card dark:border-gray-600 p-6">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 text-center mb-3">{t('admin.manageUsersPage.messages.errorLoadingUsers')}</h2>
          <p className="text-center mb-6 text-foreground">{t('admin.manageUsersPage.messages.errorMessage')}</p>
          <div className="flex justify-center">
            <Button 
              onClick={() => dispatch(getUsers())}
              className="gap-2"
            >
              <RefreshIcon className="h-4 w-4" />
              {t('admin.manageUsersPage.messages.tryAgain')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - simple version without complex checks that might cause crashes
  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('admin.manageUsersPage.title')}</h1>
          <Button 
            onClick={handleAddUser}
            className="gap-2"
          >
            <AddIcon className="h-4 w-4" />
            {t('admin.manageUsersPage.addUser')}
          </Button>
        </div>
        <div className="rounded-lg border bg-card dark:border-gray-600 p-6">
          <p className="text-center py-8 text-muted-foreground">{t('admin.manageUsersPage.messages.noUsersFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-foreground">{t('admin.manageUsersPage.title')}</h1>
        <Button 
          onClick={() => handleAddUser(currentUser?.role === 'secretary')}
          title={currentUser?.role === 'secretary' ? t('admin.manageUsersPage.cannotCreateSecretaryAccounts') : ''}
          className="w-full sm:w-auto gap-2"
        >
          <AddIcon className="h-4 w-4" />
          {t('admin.manageUsersPage.addUser')}
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 mb-6 rounded-lg border bg-card dark:border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <Label htmlFor="search" className="text-sm font-medium mb-2 block text-foreground">{t('admin.manageUsersPage.search')}</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t('admin.manageUsersPage.searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="role-filter" className="text-sm font-medium mb-2 block text-foreground">{t('admin.manageUsersPage.filterByRole')}</Label>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
              <SelectTrigger id="role-filter">
                <SelectValue placeholder={t('admin.manageUsersPage.allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.manageUsersPage.allRoles')}</SelectItem>
                <SelectItem value="admin">{t('admin.manageUsersPage.roles.admin')}</SelectItem>
                <SelectItem value="teacher">{t('admin.manageUsersPage.roles.teacher')}</SelectItem>
                <SelectItem value="student">{t('admin.manageUsersPage.roles.student')}</SelectItem>
                <SelectItem value="parent">{t('admin.manageUsersPage.roles.parent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="school-filter" className="text-sm font-medium mb-2 block text-foreground">{t('admin.manageUsersPage.filterBySchoolBranch')}</Label>
            <Select
              value={schoolFilter}
              onValueChange={handleSchoolFilterChange}
              disabled={schoolsLoading || !schools || schools.length === 0}
            >
              <SelectTrigger id="school-filter">
                <SelectValue placeholder={t('admin.manageUsersPage.allSchoolBranches')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.manageUsersPage.allSchoolBranches')}</SelectItem>
                {Array.isArray(schools) && schools.map((school) => (
                  <SelectItem key={school._id} value={school._id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="class-filter" className="text-sm font-medium mb-2 block text-foreground">{t('admin.manageUsersPage.filterByClass')}</Label>
            <Select
              value={classFilter}
              onValueChange={handleClassFilterChange}
              disabled={classesLoading || !classes || classes.length === 0}
            >
              <SelectTrigger id="class-filter">
                <SelectValue placeholder={t('admin.manageUsersPage.allClasses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.manageUsersPage.allClasses')}</SelectItem>
                {Array.isArray(classes) && classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.className} - {cls.subject?.name || cls.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* User Table/Cards */}
      {isMobile ? renderMobileContent() : renderDesktopContent()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.manageUsersPage.dialogs.deleteUser.title')}</DialogTitle>
            <DialogDescription>
            {t('admin.manageUsersPage.dialogs.deleteUser.message', { name: userToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
            {t('common.delete')}
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;