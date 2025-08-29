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

const SchoolBranchManager = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { schools, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.schools
  );
  
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
    website: '',
    // These fields will be auto-populated based on admin's domain
    schoolDomain: '', // Will be set from admin's email domain
    emailDomain: '', // Will be set from admin's email domain
    parentCluster: null,
    isClusterSchool: false,
    branchDescription: '',
  });
  
  // Get current user's email domain to set domain values automatically
  const { user } = useSelector((state) => state.auth);
  const userDomain = user?.email ? user.email.split('@')[1] : '';
  const schoolDomainBase = userDomain ? userDomain.split('.')[0] : '';
  
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
      
      // Filter by cluster school visibility
      if (!showClusterSchools) {
        filtered = schools.filter(school => !school.isClusterSchool);
      }
      
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
      website: '',
      schoolDomain: schoolDomainBase,
      emailDomain: userDomain,
      parentCluster: null,
      isClusterSchool: false,
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
      website: '',
      schoolDomain: '',
      emailDomain: '',
      parentCluster: null,
      isClusterSchool: false,
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
      website: '',
      schoolDomain: '',
      emailDomain: '',
      parentCluster: null,
      isClusterSchool: false,
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
    
    if (schoolBranch.website && !/^https?:\/\/.+/.test(schoolBranch.website)) {
      errors.website = t('admin.manageSchoolsPage.form.errors.websiteProtocol');
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
        website: schoolBranch.website,
        schoolDomain: schoolBranch.schoolDomain,
        emailDomain: schoolBranch.emailDomain,
        parentCluster: schoolBranch.parentCluster,
        isClusterSchool: schoolBranch.isClusterSchool,
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
                    {school.isClusterSchool && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
                        {t('admin.manageSchoolsPage.messages.clusterSchool')}
                      </span>
                    )}
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
                    {school.website && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        <span className="truncate">{school.website}</span>
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
                  {t('admin.manageSchoolsPage.table.type')}
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  {t('admin.manageSchoolsPage.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
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
                      {school.isClusterSchool ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {t('admin.manageSchoolsPage.messages.clusterSchool')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {t('admin.manageSchoolsPage.messages.branch')}
                        </span>
                      )}
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
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-cluster"
              checked={showClusterSchools}
              onCheckedChange={setShowClusterSchools}
            />
            <Label htmlFor="show-cluster" className="text-sm">
              {t('admin.manageSchoolsPage.showClusterSchools')}
            </Label>
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
        <DialogContent className="max-w-2xl">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div>
                <Label htmlFor="website" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.website')}
                </Label>
                <Input
                  id="website"
                  name="website"
                  value={schoolBranch.website}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolDomain" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.schoolDomain')}
                </Label>
                <Input
                  id="schoolDomain"
                  name="schoolDomain"
                  value={schoolBranch.schoolDomain}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder={`${schoolDomainBase}.school`}
                />
              </div>
              
              <div>
                <Label htmlFor="emailDomain" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.emailDomain')}
                </Label>
                <Input
                  id="emailDomain"
                  name="emailDomain"
                  value={schoolBranch.emailDomain}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder={`${schoolDomainBase}.edu`}
                />
              </div>
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
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isClusterSchool"
                name="isClusterSchool"
                checked={schoolBranch.isClusterSchool}
                onCheckedChange={(checked) => handleInputChange({ target: { name: 'isClusterSchool', value: checked } })}
              />
              <Label htmlFor="isClusterSchool" className="text-sm">
                {t('admin.manageSchoolsPage.form.isClusterSchool')}
              </Label>
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
        <DialogContent className="max-w-2xl">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div>
                <Label htmlFor="edit-website" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.website')}
                </Label>
                <Input
                  id="edit-website"
                  name="website"
                  value={schoolBranch.website}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-schoolDomain" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.schoolDomain')}
                </Label>
                <Input
                  id="edit-schoolDomain"
                  name="schoolDomain"
                  value={schoolBranch.schoolDomain}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-emailDomain" className="text-sm font-medium">
                  {t('admin.manageSchoolsPage.form.emailDomain')}
                </Label>
                <Input
                  id="edit-emailDomain"
                  name="emailDomain"
                  value={schoolBranch.emailDomain}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
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
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isClusterSchool"
                name="isClusterSchool"
                checked={schoolBranch.isClusterSchool}
                onCheckedChange={(checked) => handleInputChange({ target: { name: 'isClusterSchool', value: checked } })}
              />
              <Label htmlFor="edit-isClusterSchool" className="text-sm">
                {t('admin.manageSchoolsPage.form.isClusterSchool')}
              </Label>
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
        <DialogContent>
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
