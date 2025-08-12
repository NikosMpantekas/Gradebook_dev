import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getUsers, deleteUser, reset } from '../../features/users/userSlice';
import { getSchools } from '../../features/schools/schoolSlice';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// Import our custom components
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

// We already have these imports at the top

const ManageUsers = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const { users, isLoading, isSuccess, isError, message } = useSelector(state => state.users);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Create a ref to track if users have been loaded
  const dataLoaded = React.useRef(false);
  
  // Get schools data from Redux store
  const { schools, isLoading: schoolsLoading } = useSelector((state) => state.schools);
  
  // Fetch classes data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setClassesLoading(true);
        const response = await fetch(`${currentUser.baseURL || 'https://beta-backend.gradebook.pro'}/api/classes`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
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
  }, [isLoading, users, schools, classes]);

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
  }, [searchTerm, roleFilter, schoolFilter, classFilter, users]);

  const applyFilters = () => {
    let filtered = [...users];
    
    // Filter by search term (name or email)
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filter by school
    if (schoolFilter) {
      filtered = filtered.filter(user => {
        // Check both old and new field formats
        if (user.schools && Array.isArray(user.schools)) {
          return user.schools.some(school => 
            (typeof school === 'object' ? school._id : school) === schoolFilter
          );
        }
        if (user.school) {
          if (Array.isArray(user.school)) {
            return user.school.some(school => 
              (typeof school === 'object' ? school._id : school) === schoolFilter
            );
          }
          return (typeof user.school === 'object' ? user.school._id : user.school) === schoolFilter;
        }
        return false;
      });
    }

    // Filter by class - check if user is associated with the selected class
    if (classFilter) {
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
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(0);
  };
  
  const handleSchoolFilterChange = (event) => {
    setSchoolFilter(event.target.value);
  };
  
  const handleClassFilterChange = (event) => {
    setClassFilter(event.target.value);
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
        return 'error';
      case 'teacher':
        return 'primary';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const getAvatarLetter = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Mobile card layout for users
  const renderMobileContent = () => {
  if (isLoading || !dataLoaded.current) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading users...
          </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
        <Box py={4} textAlign="center">
          <Typography variant="subtitle1" color="error">
            Error loading users
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {message || "An unknown error occurred"}
          </Typography>
            <Button 
              variant="contained" 
              onClick={() => dispatch(getUsers())}
              startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
            >
              Try Again
            </Button>
      </Box>
    );
  }

  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
        <Box py={4} textAlign="center">
          <Typography variant="subtitle1" color="text.secondary">
            No users found. Click "Add User" to create one.
          </Typography>
      </Box>
    );
  }

  return (
      <Box sx={{ px: { xs: 1, sm: 2 } }}>
        {filteredUsers
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((user) => (
            <Card
              key={user._id}
              sx={{
                mb: 2,
                '&:hover': {
                  boxShadow: 2,
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: getRoleColor(user.role),
                    width: 50,
                    height: 50,
                    flexShrink: 0
                  }}>
                    {getAvatarLetter(user.name)}
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {user.name}
                      </Typography>
                      <Chip
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
        </Typography>
      </Box>

                    {/* School and Direction information */}
                    {(user.schools?.length > 0 || user.school) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
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
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Subjects information */}
                    {user.subjects && user.subjects.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BookIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.subjects.slice(0, 2).map((subject, idx) => (
                            <Chip
                              key={idx}
                              label={subject.name || subject}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {user.subjects.length > 2 && (
                            <Chip
                              label={`+${user.subjects.length - 2} more`}
                              size="small"
              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Created: {user.createdAt ? format(new Date(user.createdAt), 'PP') : 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Action buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => handleEditUser(user._id)}
                    disabled={currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin')}
                    title={currentUser?.role === 'secretary' && user._id === currentUser?._id ? 'You cannot edit your own account' : 
                           currentUser?.role === 'secretary' && user.role === 'secretary' ? 'You cannot edit other secretary accounts' : 
                           currentUser?.role === 'secretary' && user.role === 'admin' ? 'You cannot edit admin accounts' : ''}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.role === 'admin' || 
                              (currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin'))}
                    title={user.role === 'admin' ? 'Admin accounts cannot be deleted' : 
                           currentUser?.role === 'secretary' && user._id === currentUser?._id ? 'You cannot delete your own account' : 
                           currentUser?.role === 'secretary' && user.role === 'secretary' ? 'You cannot delete other secretary accounts' : 
                           currentUser?.role === 'secretary' && user.role === 'admin' ? 'You cannot delete admin accounts' : ''}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
      </Box>
    );
  };

  // Desktop table layout
  const renderDesktopContent = () => {
    return (
      <Paper elevation={3} sx={{ mt: 3, borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow hover key={user._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: getRoleColor(user.role) }}>
                            {getAvatarLetter(user.name)}
                          </Avatar>
                          <Typography variant="body1">{user.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), 'PP') : 'Unknown'}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          aria-label="edit user"
                          onClick={() => handleEditUser(user._id)}
                          disabled={currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin')}
                          title={currentUser?.role === 'secretary' && user._id === currentUser?._id ? 'You cannot edit your own account' : 
                                 currentUser?.role === 'secretary' && user.role === 'secretary' ? 'You cannot edit other secretary accounts' : 
                                 currentUser?.role === 'secretary' && user.role === 'admin' ? 'You cannot edit admin accounts' : ''}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          aria-label="delete user"
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.role === 'admin' || 
                                    (currentUser?.role === 'secretary' && (user._id === currentUser?._id || user.role === 'secretary' || user.role === 'admin'))}
                          title={user.role === 'admin' ? 'Admin accounts cannot be deleted' : 
                                 currentUser?.role === 'secretary' && user._id === currentUser?._id ? 'You cannot delete your own account' : 
                                 currentUser?.role === 'secretary' && user.role === 'secretary' ? 'You cannot delete other secretary accounts' : 
                                 currentUser?.role === 'secretary' && user.role === 'admin' ? 'You cannot delete admin accounts' : ''}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 1 }}>Loading users...</Typography>
                      </Box>
                    ) : (
                      'No users found matching your criteria'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    );
  };

  // Always show a basic structure even while loading to prevent blank screen
  // This prevents the white screen flash when navigating to this page
  if (isLoading || !dataLoaded.current) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Manage Users
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddUser}
            disabled={true}
          >
            Add User
          </Button>
        </Box>

        <Paper elevation={3} sx={{ p: 5, borderRadius: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: 300 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading users...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we retrieve user data
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Manage Users
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Box>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" color="error" align="center" sx={{ mb: 2 }}>
            Error loading users
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 3 }}>
            {message || "An unknown error occurred"}
          </Typography>
          <Box display="flex" justifyContent="center">
            <Button 
              variant="contained" 
              onClick={() => dispatch(getUsers())}
              startIcon={<RefreshIcon />}
            >
              Try Again
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Empty state - simple version without complex checks that might cause crashes
  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Manage Users
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </Box>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" align="center" sx={{ py: 4 }}>
            No users found. Click "Add User" to create one.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Manage Users
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleAddUser(currentUser?.role === 'secretary')}
          title={currentUser?.role === 'secretary' ? 'You cannot create secretary accounts' : ''}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add User
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="role-filter-label">Filter by Role</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                label="Filter by Role"
              >
                <MenuItem value="">
                  <em>All Roles</em>
                </MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="parent">Parent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="school-filter-label">Filter by School Branch</InputLabel>
              <Select
                labelId="school-filter-label"
                id="school-filter"
                value={schoolFilter}
                onChange={handleSchoolFilterChange}
                label="Filter by School Branch"
                disabled={schoolsLoading || !schools || schools.length === 0}
              >
                <MenuItem value="">
                  <em>All School Branches</em>
                </MenuItem>
                {Array.isArray(schools) && schools.map((school) => (
                  <MenuItem key={school._id} value={school._id}>
                    {school.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="class-filter-label">Filter by Class</InputLabel>
              <Select
                labelId="class-filter-label"
                id="class-filter"
                value={classFilter}
                onChange={handleClassFilterChange}
                label="Filter by Class"
                disabled={classesLoading || !classes || classes.length === 0}
              >
                <MenuItem value="">
                  <em>All Classes</em>
                </MenuItem>
                {Array.isArray(classes) && classes.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>
                    {cls.className} - {cls.subject?.name || cls.subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* User Table/Cards */}
      {isMobile ? renderMobileContent() : renderDesktopContent()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user "{userToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;
