import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Container, Typography, Box, Snackbar, Alert, Paper, Grid, CircularProgress, Chip } from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../../config/appConfig';

// Components
import GradeTable from '../../components/grades/GradeTable';
import { EditGradeDialog, DeleteGradeDialog } from '../../components/grades/GradeDialogs';
import ClassBasedFilter from '../../components/grades/ClassBasedFilter';

// Custom hooks
import useGradeData from '../../hooks/useGradeData';
import useGradeDialogs from '../../components/grades/GradeDialogHandlers';

// Utils
import { filterGrades } from '../../utils/gradeFilterUtils';

// Icons
import SchoolIcon from '@mui/icons-material/School';
import DirectionsIcon from '@mui/icons-material/Directions';
import BookIcon from '@mui/icons-material/Book';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

/**
 * ManageGrades Component
 * Shows a paginated table of grades with class-based filtering options
 */
const ManageGrades = () => {
  console.log('[ManageGrades] Component rendering');
  
  // Redux state
  const { grades, isLoading: isGradesLoading, isError: isGradesError } = useSelector(state => state.grades);
  const { user } = useSelector(state => state.auth);

  // Local state for class-based filtering
  const [filterOptions, setFilterOptions] = useState({
    schoolBranches: [],
    directions: [],
    subjects: []
  });
  const [filters, setFilters] = useState({
    schoolBranch: '',
    direction: '',
    subject: '',
    student: ''
  });
  const [students, setStudents] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Existing state
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Additional state for branch name lookup (like in CreateGradeSimple)
  const [branchNames, setBranchNames] = useState({});

  // Custom hooks
  const {
    isLoadingSubjects,
    isLoadingStudents,
    fetchStudentsBySubject,
    fetchAllStudents
  } = useGradeData(user);

  // Dialog handlers
  const dialogHandlers = useGradeDialogs({ students, subjects: filterOptions.subjects });
  const {
    alertState,
    deleteDialogOpen, 
    gradeToDelete,
    editDialogOpen,
    editGradeData,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleEditClick,
    handleEditChange,
    handleEditSave,
    handleEditCancel,
    handleAlertClose
  } = dialogHandlers;

  // Load filter options when component mounts
  useEffect(() => {
    if (user?.token) {
      loadFilterOptions();
    }
  }, [user]);
  
  // Effect to load branch names when filter options change - same as in CreateGradeSimple
  useEffect(() => {
    if (filterOptions.schoolBranches && filterOptions.schoolBranches.length > 0 && user?.token) {
      loadBranchNames();
    }
  }, [filterOptions.schoolBranches, user]);

  // Load students when filters change
  useEffect(() => {
    if (filters.schoolBranch && filters.direction && filters.subject && user?.token) {
      loadFilteredStudents();
    } else {
      setStudents([]);
      setFilters(prev => ({ ...prev, student: '' }));
    }
  }, [filters.schoolBranch, filters.direction, filters.subject, user]);

  // Set up filtered grades when source data changes
  useEffect(() => {
    console.log('[ManageGrades] Updating filtered grades with class-based filtering');
    console.log('[ManageGrades] Current grades:', grades?.length || 0);
    console.log('[ManageGrades] Current filters:', filters);
    
    if (!grades || !Array.isArray(grades)) {
      console.log('[ManageGrades] No grades available, setting empty array');
      setFilteredGrades([]);
      return;
    }
    
    // Debug: Log structure of first grade to understand data format
    if (grades.length > 0) {
      console.log('[ManageGrades] Sample grade structure:', grades[0]);
    }
    
    // Use the existing filterGrades utility function instead of custom logic
    // This function already handles both string and object forms properly
    const filtered = filterGrades(grades, filters.subject, filters.student);
    
    // Additional filtering for school branch (not handled by filterGrades utility)
    let finalFiltered = filtered;
    
    if (filters.schoolBranch) {
      const beforeCount = finalFiltered.length;
      finalFiltered = finalFiltered.filter(grade => {
        // Check direct schoolId field (matches DB structure)
        const hasMatchingBranch = grade.schoolId === filters.schoolBranch;
        console.log(`[ManageGrades] Grade ${grade._id}: schoolId=${grade.schoolId}, filter=${filters.schoolBranch}, match=${hasMatchingBranch}`);
        return hasMatchingBranch;
      });
      console.log(`[ManageGrades] After schoolBranch filter (${filters.schoolBranch}): ${beforeCount} -> ${finalFiltered.length}`);
    }
    
    console.log(`[ManageGrades] Final filtered grades count: ${finalFiltered.length}`);
    setFilteredGrades(finalFiltered);
    
    // Reset to first page when filters change
    setPage(0);
  }, [grades, filters]);

  // Load available filter options (school branches, directions, subjects) for the teacher/admin
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const endpoint = `${API_URL}/api/students/teacher/filters`;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      const response = await axios.get(endpoint, config);
      
      // Enhanced logging to debug school branch data
      console.log(`[ManageGrades] Raw filter options data:`, response.data);
      
      // Ensure school branches are properly formatted with value AND label
      const processedOptions = {
        ...response.data,
        schoolBranches: (response.data?.schoolBranches || []).map(branch => {
          // If the branch is already an object with value and label, use it as-is
          if (branch && typeof branch === 'object' && branch.value && branch.label) {
            return branch;
          }
          // If it's just a string or has only value without label, ensure both fields exist
          const branchValue = branch?.value || branch;
          const branchLabel = branch?.label || branch;
          
          return {
            value: branchValue,
            label: branchLabel
          };
        })
      };
      
      console.log(`[ManageGrades] Processed filter options for ${user.role}:`, processedOptions);
      setFilterOptions(processedOptions);
    } catch (error) {
      console.error('[ManageGrades] Error loading filter options:', error);
      toast.error('Failed to load filter options');
      setFilterOptions({ schoolBranches: [], directions: [], subjects: [] });
    } finally {
      setLoadingFilters(false);
    }
  };
  
  // Load school branch names - copied from CreateGradeSimple.js
  const loadBranchNames = async () => {
    console.log('[ManageGrades] Loading school branch names');
    try {
      const branchIds = filterOptions.schoolBranches.map(branch => branch.value);
      
      // Skip if there are no valid branch IDs
      if (!branchIds.length) return;
      
      // Filter only valid MongoDB ObjectIds
      const validBranchIds = branchIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
      
      // Skip if no valid IDs after filtering
      if (!validBranchIds.length) {
        console.log('[ManageGrades] No valid branch IDs found');
        return;
      }
      
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      console.log('[ManageGrades] Fetching branch names for IDs:', validBranchIds);
      console.log('[ManageGrades] Using API_URL for secure API call:', API_URL);
      
      const response = await axios.post(`${API_URL}/api/branches/batch`, {
        branchIds: validBranchIds
      }, config);
      
      // Create a mapping of branch ID to name
      const nameMap = {};
      if (response.data.branches) {
        response.data.branches.forEach(branch => {
          nameMap[branch._id] = branch.name;
        });
      }
      
      console.log('[ManageGrades] Loaded branch names:', nameMap);
      setBranchNames(nameMap);
    } catch (error) {
      console.error('[ManageGrades] Error loading branch names:', error);
    }
  };

  // Load students based on selected filters using class-based filtering
  const loadFilteredStudents = async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (filters.schoolBranch) params.append('schoolBranch', filters.schoolBranch);
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.subject) params.append('subject', filters.subject);
      
      console.log('Loading filtered students with params:', params.toString());
      
      const endpoint = `${API_URL}/api/students/teacher/filtered?${params}`;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      const response = await axios.get(endpoint, config);
      setStudents(response.data);
      console.log(`[ManageGrades] Loaded ${response.data.length} students for filters:`, filters);
    } catch (error) {
      console.error('[ManageGrades] Error loading filtered students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    console.log(`[ManageGrades] ${filterType} filter changed to: ${value}`);
    
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Reset dependent filters when parent filter changes
      if (filterType === 'schoolBranch') {
        newFilters.direction = '';
        newFilters.subject = '';
        newFilters.student = '';
      } else if (filterType === 'direction') {
        newFilters.subject = '';
        newFilters.student = '';
      } else if (filterType === 'subject') {
        newFilters.student = '';
      }
      
      return newFilters;
    });
  };

  // Get available directions based on selected branch
  const getAvailableDirections = () => {
    if (!filters.schoolBranch || !filterOptions.directions) return [];
    return filterOptions.directions.filter(direction => 
      filterOptions.directions.some(dir => dir.value === direction.value)
    );
  };

  // Get available subjects based on selected direction  
  const getAvailableSubjects = () => {
    if (!filters.direction || !filterOptions.subjects) return [];
    return filterOptions.subjects.filter(subject => 
      filterOptions.subjects.some(subj => subj.value === subject.value)
    );
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="lg" sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
          {user?.role === 'admin' ? (
            <AdminPanelSettingsIcon color="primary" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          ) : (
            <BookIcon color="primary" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          )}
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              Manage Grades
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {user?.role === 'admin' 
                ? 'View, filter, edit, and delete all grades in your school'
                : 'View, filter, edit, and delete grades for your assigned classes'
              }
            </Typography>
          </Box>
        </Box>

        {/* Filter Chips Display */}
        {(filters.schoolBranch || filters.direction || filters.subject || filters.student) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 }, mt: { xs: 1, sm: 2 } }}>
            {filters.schoolBranch && (
              <Chip
                icon={<SchoolIcon />}
                label={`Branch: ${branchNames[filters.schoolBranch] || filterOptions.schoolBranches?.find(branch => branch.value === filters.schoolBranch)?.label || 'Unknown'}`}
                onDelete={() => handleFilterChange('schoolBranch', '')}
                color="primary"
                variant="outlined"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              />
            )}
            {filters.direction && (
              <Chip
                icon={<DirectionsIcon />}
                label={`Direction: ${filterOptions.directions?.find(dir => dir.value === filters.direction)?.label || 'Unknown'}`}
                onDelete={() => handleFilterChange('direction', '')}
                color="secondary"
                variant="outlined"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              />
            )}
            {filters.subject && (
              <Chip
                icon={<BookIcon />}
                label={`Subject: ${filterOptions.subjects?.find(subj => subj.value === filters.subject)?.label || 'Unknown'}`}
                onDelete={() => handleFilterChange('subject', '')}
                color="info"
                variant="outlined"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              />
            )}
            {filters.student && (
              <Chip
                icon={<PersonIcon />}
                label={`Student: ${students.find(student => student._id === filters.student)?.name || 'Selected Student'}`}
                onDelete={() => handleFilterChange('student', '')}
                color="success"
                variant="outlined"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              />
            )}
          </Box>
        )}
      </Paper>
      
      {/* Filter Section */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          <SchoolIcon /> Class-Based Filters
        </Typography>
        
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* School Branch Filter */}
          <Grid item xs={12} md={6} lg={3}>
            <ClassBasedFilter
              filterType="schoolBranch"
              value={filters.schoolBranch}
              options={filterOptions.schoolBranches}
              loading={loadingFilters}
              onChange={(value) => handleFilterChange('schoolBranch', value)}
              label="School Branch"
              disabled={loadingFilters}
              branchNames={branchNames} // Pass the branchNames mapping to display proper names
            />
          </Grid>
          
          {/* Direction Filter */}
          <Grid item xs={12} md={6} lg={3}>
            <ClassBasedFilter
              filterType="direction"
              value={filters.direction}
              options={getAvailableDirections()}
              loading={loadingFilters}
              onChange={(value) => handleFilterChange('direction', value)}
              label="Direction"
              disabled={!filters.schoolBranch || loadingFilters}
            />
          </Grid>
          
          {/* Subject Filter */}
          <Grid item xs={12} md={6} lg={3}>
            <ClassBasedFilter
              filterType="subject"
              value={filters.subject}
              options={getAvailableSubjects()}
              loading={loadingFilters}
              onChange={(value) => handleFilterChange('subject', value)}
              label="Subject"
              disabled={!filters.direction || loadingFilters}
            />
          </Grid>
          
          {/* Student Filter */}
          <Grid item xs={12} md={6} lg={3}>
            <ClassBasedFilter
              filterType="student"
              value={filters.student}
              options={students.map(student => ({ value: student._id, label: student.name }))}
              loading={loadingStudents}
              onChange={(value) => handleFilterChange('student', value)}
              label="Student"
              disabled={!filters.subject || loadingStudents}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Grades Table */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <GradeTable
          filteredGrades={filteredGrades}
          isLoading={isGradesLoading}
          isError={isGradesError}
          grades={grades}
          page={page}
          rowsPerPage={rowsPerPage}
          handleChangePage={handleChangePage}
          handleChangeRowsPerPage={handleChangeRowsPerPage}
          handleEditClick={handleEditClick}
          handleDeleteClick={handleDeleteClick}
        />
      </Box>
      
      {/* Dialogs */}
      <EditGradeDialog
        open={editDialogOpen}
        handleClose={handleEditCancel}
        editGradeData={editGradeData}
        handleEditChange={handleEditChange}
        handleEditSave={handleEditSave}
        subjects={filterOptions.subjects}
        user={user}
      />
      
      <DeleteGradeDialog
        open={deleteDialogOpen}
        handleClose={handleDeleteCancel}
        handleConfirm={handleDeleteConfirm}
        gradeToDelete={gradeToDelete}
      />
      
      {/* Alert Snackbar */}
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
      >
        <Alert 
          onClose={handleAlertClose} 
          severity={alertState.severity} 
          elevation={6} 
          variant="filled"
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageGrades;
