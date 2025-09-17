import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  reset
} from '../../features/schools/schoolSlice';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Spinner } from '../../components/ui/spinner';

// Lucide React icons
import {
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Search as SearchIcon,
  Building as SchoolIcon,
  Mail as EmailIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  MapPin as LocationIcon,
} from 'lucide-react';

// Import our custom components
import { useIsMobile } from '../../components/hooks/use-mobile';
import { cn } from '../../lib/utils';

const SchoolBranchManager = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { schools, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.schools
  );
  const { darkMode } = useSelector((state) => state.ui);
  
  // Filter states
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClusterSchools, setShowClusterSchools] = useState(false);
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // School branch being edited or added
  const [schoolBranch, setSchoolBranch] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    parentCluster: null,
    branchDescription: '',
  });
  
  // Get current user
  const { user } = useSelector((state) => state.auth);
  
  // ID of school to delete
  const [schoolIdToDelete, setSchoolIdToDelete] = useState(null);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});
  
  // Load schools on component mount
  useEffect(() => {
    dispatch(getSchools());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  // Update filtered schools when schools or search term changes
  useEffect(() => {
    if (isError) {
      toast.error(message);
    }
    
    if (schools) {
      applyFilters();
    }
  }, [schools, searchTerm, showClusterSchools, isError, message]);
  
  // Apply filters to schools data
  const applyFilters = useCallback(() => {
    try {
      if (!Array.isArray(schools)) {
        console.error('Schools is not an array:', schools);
        setFilteredSchools([]);
        return;
      }

      let filtered = schools;
      
      
      // Apply search filter
      if (searchTerm.trim() !== '') {
        filtered = filtered.filter(school => {
          const nameMatch = school.name && typeof school.name === 'string' ? 
            school.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            
          const addressMatch = school.address && typeof school.address === 'string' ? 
            school.address.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            
          const phoneMatch = school.phone && typeof school.phone === 'string' ? 
            school.phone.includes(searchTerm) : false;
            
          const emailMatch = school.email && typeof school.email === 'string' ? 
            school.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            
          return nameMatch || addressMatch || phoneMatch || emailMatch;
        });
      }
      
      setFilteredSchools(filtered);
    } catch (error) {
      console.error('Error in applyFilters:', error);
      setFilteredSchools([]);
    }
  }, [schools, searchTerm, showClusterSchools]);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Dialog handlers
  const handleOpenAddDialog = () => {
    setSchoolBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      parentCluster: null,
      branchDescription: '',
    });
    setFormErrors({});
    setOpenAddDialog(true);
  };
  
  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setSchoolBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      parentCluster: null,
      branchDescription: '',
    });
    setFormErrors({});
  };
  
  const handleOpenEditDialog = (school) => {
    setSchoolBranch({
      ...school,
      _id: school._id
    });
    setFormErrors({});
    setOpenEditDialog(true);
  };
  
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSchoolBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      parentCluster: null,
      branchDescription: '',
    });
    setFormErrors({});
  };
  
  const handleOpenDeleteDialog = (id) => {
    setSchoolIdToDelete(id);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSchoolIdToDelete(null);
  };
  
  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error when field is modified
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
    
    setSchoolBranch({
      ...schoolBranch,
      [name]: value,
    });
  };
  
  const handleCheckboxChange = (name, checked) => {
    setSchoolBranch({
      ...schoolBranch,
      [name]: checked,
    });
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!schoolBranch.name.trim()) {
      errors.name = t('admin.manageSchoolsPage.form.errors.schoolNameRequired');
    }
    
    if (!schoolBranch.address.trim()) {
      errors.address = t('admin.manageSchoolsPage.form.errors.addressRequired');
    }
    
    if (!schoolBranch.phone.trim()) {
      errors.phone = t('admin.manageSchoolsPage.form.errors.phoneRequired');
    }
    
    if (schoolBranch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolBranch.email)) {
      errors.email = t('admin.manageSchoolsPage.form.errors.validEmail');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // CRUD operations
  const handleAddSchool = () => {
    if (validateForm()) {
      dispatch(createSchool(schoolBranch))
        .unwrap()
        .then(() => {
          setOpenAddDialog(false);
          toast.success(t('admin.manageSchoolsPage.messages.schoolAddedSuccess'));
        })
        .catch((error) => {
          toast.error(error);
        });
    }
  };
  
  const handleEditSchool = () => {
    if (validateForm()) {
      if (!schoolBranch._id) {
        toast.error(t('admin.manageSchoolsPage.messages.missingSchoolId'));
        return;
      }
      
      const schoolId = schoolBranch._id;
      const schoolData = {
        name: schoolBranch.name,
        address: schoolBranch.address,
        phone: schoolBranch.phone,
        email: schoolBranch.email,
        parentCluster: schoolBranch.parentCluster,
        branchDescription: schoolBranch.branchDescription,
      };
      
      dispatch(updateSchool({ id: schoolId, schoolData }))
        .unwrap()
        .then((result) => {
          console.log('School update succeeded:', result);
          setOpenEditDialog(false);
          return dispatch(getSchools()).unwrap();
        })
        .then(() => {
          toast.success(t('admin.manageSchoolsPage.messages.schoolUpdatedSuccess'));
        })
        .catch((error) => {
          console.error('School update failed:', error);
          toast.error(`${t('admin.manageSchoolsPage.messages.updateSchoolFailed')}: ${error}`);
        });
    }
  };
  
  const handleDeleteSchool = () => {
    dispatch(deleteSchool(schoolIdToDelete))
      .unwrap()
      .then(() => {
        setOpenDeleteDialog(false);
        toast.success(t('admin.manageSchoolsPage.messages.schoolDeletedSuccess'));
      })
      .catch((error) => {
        toast.error(error);
      });
  };

  // Mobile card layout for schools
  const renderMobileContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
          <span className="ml-2 text-sm text-foreground">{t('admin.manageSchoolsPage.messages.loadingSchools')}</span>
        </div>
      );
    }

    if (!filteredSchools || filteredSchools.length === 0) {
      return (
        <div className="py-4 text-center">
          <p className="text-muted-foreground">
            {t('admin.manageSchoolsPage.messages.noSchoolBranchesFound')}
          </p>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('admin.manageSchoolsPage.messages.tryDifferentSearchTerm')}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredSchools.map((school) => (
          <Card
            key={school._id}
            className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 dark:border-gray-600 dark:hover:shadow-gray-800/50"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12 flex-shrink-0 bg-primary">
                  <AvatarFallback>
                    <SchoolIcon className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-foreground">
                      {school.name}
                    </h3>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <LocationIcon className="h-4 w-4" />
                      <span>{school.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      <span>{school.phone}</span>
                    </div>
                    {school.email && (
                      <div className="flex items-center gap-2">
                        <EmailIcon className="h-4 w-4" />
                        <span>{school.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end mt-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditDialog(school)}
                  title={t('admin.manageSchoolsPage.messages.editSchool')}
                  className="hover:bg-muted dark:hover:bg-gray-700"
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleOpenDeleteDialog(school._id)}
                  title={t('admin.manageSchoolsPage.messages.deleteSchool')}
                  className="hover:bg-red-700 dark:hover:bg-red-600"
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
                  {t('admin.manageSchoolsPage.table.school')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageSchoolsPage.table.address')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageSchoolsPage.table.contact')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageSchoolsPage.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="flex justify-center items-center gap-3 py-6">
                      <Spinner size="sm" />
                      <span className="text-base text-foreground">{t('admin.manageSchoolsPage.messages.loadingSchools')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSchools && filteredSchools.length > 0 ? (
                filteredSchools.map((school) => (
                  <tr key={school._id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-800">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 bg-primary">
                          <AvatarFallback className="text-xs">
                            <SchoolIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-foreground text-base">
                            {school.name}
                          </span>
                          {school.branchDescription && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {school.branchDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-foreground text-base">
                      <div className="flex items-center gap-2">
                        <LocationIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{school.address}</span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground text-base">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{school.phone}</span>
                        </div>
                        {school.email && (
                          <div className="flex items-center gap-2">
                            <EmailIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{school.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(school)}
                          title={t('admin.manageSchoolsPage.messages.editSchool')}
                          className="hover:bg-muted dark:hover:bg-gray-700 px-4 py-2"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(school._id)}
                          title={t('admin.manageSchoolsPage.messages.deleteSchool')}
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
                    <div className="text-center">
                      <p className="text-muted-foreground text-base">
                        {t('admin.manageSchoolsPage.messages.noSchoolBranchesFound')}
                      </p>
                      {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('admin.manageSchoolsPage.messages.tryDifferentSearchTerm')}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Show loading state if data is being loaded
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="xl" />
          <span className="ml-2 text-base text-foreground">{t('admin.manageSchoolsPage.messages.loadingSchools')}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.manageSchoolsPage.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.manageSchoolsPage.subtitle')}
        </p>
      </div>
      
      {/* Search and add controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.manageSchoolsPage.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
        </div>
        
        <Button
          onClick={handleOpenAddDialog}
          className="w-full sm:w-auto gap-2"
        >
          <AddIcon className="h-4 w-4" />
          {t('admin.manageSchoolsPage.addSchoolBranch')}
        </Button>
      </div>
      
      {/* Schools table */}
      {isMobile ? renderMobileContent() : renderDesktopContent()}
      
      {/* Add School Branch Dialog */}
      <Dialog open={openAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className={cn(
          "w-[90vw] max-w-2xl transition-colors duration-100",
          darkMode 
            ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
            : "bg-background text-foreground border-border"
        )}>
          <DialogHeader>
            <DialogTitle>{t('admin.manageSchoolsPage.dialogs.addSchool.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.manageSchoolsPage.dialogs.addSchool.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddSchool(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.schoolName')} *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={schoolBranch.name}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                  autoFocus
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.phone')} *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={schoolBranch.phone}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="address" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.address')} *
              </Label>
              <Input
                id="address"
                name="address"
                value={schoolBranch.address}
                onChange={handleInputChange}
                className="mt-1"
                required
              />
              {formErrors.address && (
                <p className="text-sm text-red-600 mt-1">{formErrors.address}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.email')}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={schoolBranch.email}
                onChange={handleInputChange}
                className="mt-1"
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="branchDescription" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.description')}
              </Label>
              <Input
                id="branchDescription"
                name="branchDescription"
                value={schoolBranch.branchDescription}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseAddDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('admin.manageSchoolsPage.addSchoolBranch')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit School Branch Dialog */}
      <Dialog open={openEditDialog} onOpenChange={handleCloseEditDialog}>
        <DialogContent className={cn(
          "w-[90vw] max-w-2xl transition-colors duration-100",
          darkMode 
            ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
            : "bg-background text-foreground border-border"
        )}>
          <DialogHeader>
            <DialogTitle>{t('admin.manageSchoolsPage.dialogs.editSchool.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.manageSchoolsPage.dialogs.editSchool.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditSchool(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.schoolName')} *
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={schoolBranch.name}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                  autoFocus
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-phone" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.phone')} *
                </Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  value={schoolBranch.phone}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-address" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.address')} *
              </Label>
              <Input
                id="edit-address"
                name="address"
                value={schoolBranch.address}
                onChange={handleInputChange}
                className="mt-1"
                required
              />
              {formErrors.address && (
                <p className="text-sm text-red-600 mt-1">{formErrors.address}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.email')}
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={schoolBranch.email}
                onChange={handleInputChange}
                className="mt-1"
              />
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="edit-branchDescription" className="text-sm font-medium">
                {t('admin.manageSchoolsPage.form.description')}
              </Label>
              <Input
                id="edit-branchDescription"
                name="branchDescription"
                value={schoolBranch.branchDescription}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete School Branch Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent className={cn(
          "w-[90vw] max-w-md transition-colors duration-100",
          darkMode 
            ? "bg-[#181b20] text-foreground border-[#2a3441]/50" 
            : "bg-background text-foreground border-border"
        )}>
          <DialogHeader>
            <DialogTitle>{t('admin.manageSchoolsPage.dialogs.deleteSchool.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.manageSchoolsPage.dialogs.deleteSchool.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteSchool}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolBranchManager;
