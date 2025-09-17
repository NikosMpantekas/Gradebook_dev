import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Avatar } from '../../components/ui/avatar';
import { 
  School, 
  ShieldCheck, 
  Check as CheckIcon,
  X as BlockIcon,
  Plus as AddIcon,
  ArrowRight as ArrowForwardIcon,
  Bell as NotificationsIcon,
  GraduationCap as GradeIcon,
  Settings as SettingsIcon,
  Users as PeopleIcon,
  Star as StarIcon,
  Star as StarBorderIcon,
  Euro as EuroIcon,
  Edit as EditIcon
} from 'lucide-react';
import { getSchoolOwners, updateSchoolOwnerStatus, updateAdminPack, reset } from '../../features/superadmin/superAdminSlice';
import LoadingState from '../../components/common/LoadingState';
import MaintenanceNotifications from '../../components/MaintenanceNotifications';

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
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Super Admin Control Panel</p>
        </div>
      </div>

      {/* Maintenance Notifications */}
      <MaintenanceNotifications />
      
      {/* School Owner Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <School className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalOwners}</p>
              <p className="text-sm text-muted-foreground">Total School Owners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.activeOwners}</p>
              <p className="text-sm text-muted-foreground">Active Schools</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-red-100 rounded-lg mr-4">
              <BlockIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.inactiveOwners}</p>
              <p className="text-sm text-muted-foreground">Inactive Schools</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <PeopleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>School Owners</CardTitle>
            <Button
              onClick={() => navigate('/superadmin/create-school-owner')}
              className="flex items-center space-x-2"
            >
              <AddIcon className="h-4 w-4" />
              <span>Add School Owner</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {schoolOwners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {schoolOwners.map((owner) => (
                <Card key={owner._id} className="h-full">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{owner.name}</h3>
                      <Badge variant={owner.active ? 'default' : 'destructive'}>
                        {owner.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{owner.email}</p>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <School className="h-4 w-4" />
                      <span>{owner.schoolName || 'No School Assigned'}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <PeopleIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        {owner.userCount || 0} Users
                      </span>
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Pack & Pricing</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePackEdit(owner)}
                          className="h-8 px-2"
                        >
                          <EditIcon className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={owner.packType === 'pro' ? 'default' : 'secondary'} className="flex items-center space-x-1">
                          <StarIcon className="h-3 w-3" />
                          <span>{owner.packType === 'pro' ? 'PRO' : 'LITE'}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <EuroIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          €{owner.monthlyPrice || 0}/month
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between space-x-2 pt-2">
                      <Button
                        variant={owner.active ? "destructive" : "default"}
                        size="sm"
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
                        className="flex items-center space-x-1"
                      >
                        {owner.active ? <BlockIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                        <span>{owner.active ? 'Disable' : 'Enable'}</span>
                      </Button>
                      
                      <Button
                        size="sm"
                        asChild
                        className="flex items-center space-x-1"
                      >
                        <RouterLink to={`/superadmin/school-owner/${owner._id}`}>
                          Details
                          <ArrowForwardIcon className="h-3 w-3" />
                        </RouterLink>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No school owners found
              </h3>
              <p className="text-sm text-muted-foreground">
                Create your first school owner to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pack Management Dialog */}
      <Dialog open={packDialog.open} onOpenChange={(open) => !open && handlePackDialogClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pack for {packDialog.admin?.name}</DialogTitle>
            <DialogDescription>
              Update the subscription package and pricing for this school owner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pack-type">Pack Type</Label>
              <Select
                value={packDialog.packType}
                onValueChange={(value) => setPackDialog(prev => ({ ...prev, packType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lite">
                    <div className="flex items-center space-x-2">
                      <StarBorderIcon className="h-4 w-4" />
                      <span>LITE Package</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center space-x-2">
                      <StarIcon className="h-4 w-4" />
                      <span>PRO Package</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthly-price">Monthly Price (EUR)</Label>
              <div className="relative">
                <EuroIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthly-price"
                  type="number"
                  value={packDialog.monthlyPrice}
                  onChange={(e) => setPackDialog(prev => ({ ...prev, monthlyPrice: parseFloat(e.target.value) || 0 }))}
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handlePackDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handlePackUpdate} 
              disabled={isLoading}
            >
              Update Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperAdminDashboard;