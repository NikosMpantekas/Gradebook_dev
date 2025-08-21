import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  Typography, 
  Grid, 
  Paper, 
  Box, 
  Card, 
  CardContent, 
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { 
  School, 
  AdminPanelSettings, 
  Check as CheckIcon,
  Block as BlockIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Notifications as NotificationsIcon,
  Grade as GradeIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Euro as EuroIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { getSchoolOwners, updateSchoolOwnerStatus, updateAdminPack, reset } from '../../features/superadmin/superAdminSlice';
import LoadingState from '../../components/common/LoadingState';

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { schoolOwners, isLoading, isError, message } = useSelector(
    (state) => state.superAdmin
  );

  const [stats, setStats] = useState({
    totalOwners: 0,
    activeOwners: 0,
    inactiveOwners: 0,
    totalUsers: 0
  });
  
  const [packDialog, setPackDialog] = useState({
    open: false,
    admin: null,
    packType: 'lite',
    monthlyPrice: 0
  });

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }

    dispatch(getSchoolOwners());

    // Cleanup function
    return () => {
      dispatch(reset());
    };
  }, [user, navigate, isError, message, dispatch]);

  // Calculate statistics whenever schoolOwners changes
  useEffect(() => {
    if (schoolOwners.length > 0) {
      const activeOwners = schoolOwners.filter(owner => owner.active).length;
      const totalUsers = schoolOwners.reduce((sum, owner) => sum + (owner.userCount || 0), 0);
      setStats({
        totalOwners: schoolOwners.length,
        activeOwners: activeOwners,
        inactiveOwners: schoolOwners.length - activeOwners,
        totalUsers: totalUsers
      });
    }
  }, [schoolOwners]);

  const handlePackEdit = (admin) => {
    setPackDialog({
      open: true,
      admin: admin,
      packType: admin.packType || 'lite',
      monthlyPrice: admin.monthlyPrice || 0
    });
  };

  const handlePackUpdate = () => {
    const { admin, packType, monthlyPrice } = packDialog;
    
    dispatch(updateAdminPack({
      adminId: admin._id,
      packData: { packType, monthlyPrice }
    }))
      .unwrap()
      .then(() => {
        toast.success(`Pack updated successfully for ${admin.name}`);
        setPackDialog({ open: false, admin: null, packType: 'lite', monthlyPrice: 0 });
      })
      .catch((error) => {
        toast.error(`Error updating pack: ${error}`);
      });
  };

  const handlePackDialogClose = () => {
    setPackDialog({ open: false, admin: null, packType: 'lite', monthlyPrice: 0 });
  };

  if (isLoading) {
    return <LoadingState fullPage={true} message="Loading school owners..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AdminPanelSettings sx={{ mr: 1 }} /> Super Admin Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Welcome to the Super Admin Control Panel
      </Typography>
      
      {/* School Owner Statistics */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
            <Grid item xs={12} sm={3}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <School />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.totalOwners}</Typography>
                    <Typography variant="body2" color="text.secondary">Total School Owners</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'success.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <CheckIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.activeOwners}</Typography>
                    <Typography variant="body2">Active Schools</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'error.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                    <BlockIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.inactiveOwners}</Typography>
                    <Typography variant="body2">Inactive Schools</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'info.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.totalUsers}</Typography>
                    <Typography variant="body2">Total Users</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                School Owners
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/superadmin/create-school-owner')}
              >
                Add School Owner
              </Button>
            </Box>

            <Box sx={{ mt: 3 }}>
              {schoolOwners.length > 0 ? (
                <Grid container spacing={2}>
                  {schoolOwners.map((owner) => (
                    <Grid item xs={12} sm={6} md={4} key={owner._id}>
                      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {owner.name}
                            </Typography>
                            <Chip 
                              size="small"
                              label={owner.active ? 'Active' : 'Inactive'}
                              color={owner.active ? 'success' : 'error'}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {owner.email}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            <School fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {owner.schoolName || 'No School Assigned'}
                          </Typography>

                          {/* User Count */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="body2" color="primary.main" fontWeight="bold">
                              {owner.userCount || 0} Users
                            </Typography>
                          </Box>

                          {/* Pack Information */}
                          <Box sx={{ mb: 2 }}>
                            <Divider sx={{ mb: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" fontWeight="bold">Pack & Pricing</Typography>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handlePackEdit(owner)}
                                sx={{ minWidth: 'auto', p: 0.5 }}
                              >
                                Edit
                              </Button>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip
                                icon={owner.packType === 'pro' ? <StarIcon /> : <StarBorderIcon />}
                                label={owner.packType === 'pro' ? 'PRO' : 'LITE'}
                                color={owner.packType === 'pro' ? 'primary' : 'default'}
                                size="small"
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EuroIcon fontSize="small" color="success" />
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                €{owner.monthlyPrice || 0}/month
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                              variant="outlined"
                              color={owner.active ? 'error' : 'success'}
                              size="small"
                              startIcon={owner.active ? <BlockIcon /> : <CheckIcon />}
                              onClick={() => {
                                dispatch(updateSchoolOwnerStatus({
                                  id: owner._id,
                                  statusData: { active: !owner.active }
                                }))
                                  .unwrap()
                                  .then(() => {
                                    toast.success(`School owner ${owner.active ? 'disabled' : 'enabled'} successfully`);
                                  })
                                  .catch((error) => {
                                    toast.error(`Error: ${error}`);
                                  });
                              }}
                            >
                              {owner.active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              endIcon={<ArrowForwardIcon />}
                              component={RouterLink}
                              to={`/superadmin/school-owner/${owner._id}`}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No school owners found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Create your first school owner to get started
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Pack Management Dialog */}
          <Dialog open={packDialog.open} onClose={handlePackDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              Edit Pack for {packDialog.admin?.name}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Pack Type</InputLabel>
                  <Select
                    value={packDialog.packType}
                    label="Pack Type"
                    onChange={(e) => setPackDialog(prev => ({ ...prev, packType: e.target.value }))}
                  >
                    <MenuItem value="lite">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StarBorderIcon />
                        LITE Package
                      </Box>
                    </MenuItem>
                    <MenuItem value="pro">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StarIcon />
                        PRO Package
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Monthly Price (EUR)"
                  type="number"
                  value={packDialog.monthlyPrice}
                  onChange={(e) => setPackDialog(prev => ({ ...prev, monthlyPrice: parseFloat(e.target.value) || 0 }))}
                  InputProps={{
                    startAdornment: <EuroIcon sx={{ mr: 1 }} />,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handlePackDialogClose}>Cancel</Button>
              <Button 
                onClick={handlePackUpdate} 
                variant="contained" 
                disabled={isLoading}
              >
                Update Pack
              </Button>
            </DialogActions>
          </Dialog>
    </Box>
  );
}

export default SuperAdminDashboard;