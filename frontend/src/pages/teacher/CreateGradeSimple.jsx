import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus, 
  Save, 
  X, 
  User, 
  BookOpen, 
  Award, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Spinner } from '../../components/ui/spinner';
import { DatePicker } from '../../components/ui/date-picker';
import { API_URL } from '../../config/appConfig';
import { useTranslation } from 'react-i18next';

const CreateGradeSimple = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    value: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState(new Set(['basic', 'advanced']));
  
  // Filter state for the working backend approach
  const [filterOptions, setFilterOptions] = useState({
    schoolBranches: [],
    subjects: []
  });
  const [selectedFilters, setSelectedFilters] = useState({
    schoolBranch: '',
    subject: ''
  });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [branchNames, setBranchNames] = useState({});

  // Load filter options when component mounts
  useEffect(() => {
    if (user?.token) {
      loadFilterOptions();
    }
  }, [user]);

  // Effect to load branch names when filter options change
  useEffect(() => {
    if (filterOptions.schoolBranches && filterOptions.schoolBranches.length > 0 && user?.token) {
      loadBranchNames();
    }
  }, [filterOptions.schoolBranches, user]);

  // Load students when filters change
  useEffect(() => {
    if (selectedFilters.schoolBranch && selectedFilters.subject && user?.token) {
      loadFilteredStudents();
    } else {
      setStudents([]);
      setFormData(prev => ({ ...prev, studentId: '' }));
    }
  }, [selectedFilters.schoolBranch, selectedFilters.subject, user]);

  // Load available filter options (school branches, directions, subjects) for the teacher/admin
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      // Use different endpoints based on user role
      // Admins get access to ALL students, teachers get only their assigned students
      const endpoint = user.role === 'admin' || user.role === 'superadmin' 
        ? `${API_URL}/api/students/notification/filters`  // Admin endpoint - all students
        : `${API_URL}/api/students/teacher/filters`;      // Teacher endpoint - assigned students only
      
      const response = await fetch(endpoint, config);
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data);
        console.log(`[CreateGrade] Loaded filter options for ${user.role} using ${endpoint}:`, data);
      } else {
        throw new Error('Failed to load filter options');
      }
    } catch (error) {
      console.error('[CreateGrade] Error loading filter options:', error);
      toast.error(t('teacherGrades.createPage.loadFiltersFailed'));
      setFilterOptions({ schoolBranches: [], directions: [], subjects: [] });
    } finally {
      setLoadingFilters(false);
    }
  };
  
  // Load school branch names using our new API endpoint
  const loadBranchNames = async () => {
    console.log('[CreateGrade] Loading school branch names');
    try {
      const branchIds = filterOptions.schoolBranches.map(branch => branch.value);
      
      // Skip if there are no valid branch IDs
      if (!branchIds.length) return;
      
      // Filter only valid MongoDB ObjectIds
      const validBranchIds = branchIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
      
      // Skip if no valid IDs after filtering
      if (!validBranchIds.length) {
        console.log('[CreateGrade] No valid branch IDs found');
        return;
      }
      
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      console.log('[CreateGrade] Fetching branch names for IDs:', validBranchIds);
      
      const endpoint = `${API_URL}/api/branches/batch`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branchIds: validBranchIds
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Create a mapping of branch ID to name
        const nameMap = {};
        if (data.branches) {
          data.branches.forEach(branch => {
            nameMap[branch._id] = branch.name;
          });
        }
        
        console.log('[CreateGrade] Loaded branch names:', nameMap);
        setBranchNames(nameMap);
      }
    } catch (error) {
      console.error('[CreateGrade] Error loading branch names:', error);
    }
  };
  
  // Load students based on selected filters using class-based filtering
  const loadFilteredStudents = async () => {
    if (!selectedFilters.schoolBranch || !selectedFilters.subject) return;
    
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        schoolBranch: selectedFilters.schoolBranch,
        subject: selectedFilters.subject
      });
      
      // Use different endpoints based on user role
      // Admins get access to ALL students, teachers get only their assigned students
      const endpoint = user.role === 'admin' || user.role === 'superadmin' 
        ? `${API_URL}/api/students/notification/filtered?${params}`  // Admin endpoint - all students
        : `${API_URL}/api/students/teacher/filtered?${params}`;      // Teacher endpoint - assigned students only
      
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // For teacher endpoint, all returned data are already students (no filtering needed)
        // For admin endpoint, we may need to filter, but teacher endpoint is student-only
        const studentsOnly = user.role === 'admin' || user.role === 'superadmin' 
          ? data.filter(user => user.role === 'student') // Admin endpoint may return mixed data
          : data; // Teacher endpoint returns students only, no role field needed
        
        setStudents(studentsOnly);
        
        console.log(`[CreateGrade] Loaded ${data.length} total users, filtered to ${studentsOnly.length} students for ${user.role}:`, studentsOnly);
      } else {
        throw new Error('Failed to load students');
      }
    } catch (error) {
      console.error('[CreateGrade] Error loading students:', error);
      toast.error(t('teacherGrades.createPage.loadStudentsFailed'));
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Get available subjects based on selected school branch
  const getAvailableSubjects = () => {
    if (!selectedFilters.schoolBranch) return [];
    return filterOptions.subjects;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear subject selection when student changes (for admin)
    if (name === 'studentId') {
      setFormData(prev => ({
        ...prev,
        subjectId: ''
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.studentId) {
      newErrors.studentId = 'Student is required';
    }
    
    if (!selectedFilters.subject) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.value) {
      newErrors.value = 'Grade value is required';
    } else {
      const gradeValue = parseFloat(formData.value);
      if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
        newErrors.value = 'Grade must be between 0 and 100';
      }
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the subject ID for the selected subject name
      // Since we're using subject names in classes, we need to find the subject ID
      const subjectsEndpoint = `${API_URL}/api/subjects`;
      const subjectsResponse = await fetch(subjectsEndpoint, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (subjectsResponse.ok) {
        const subjects = await subjectsResponse.json();
        const selectedSubject = subjects.find(s => s.name === selectedFilters.subject);
        
        if (!selectedSubject) {
          toast.error(t('teacherGrades.createPage.subjectNotFound'));
          return;
        }
        
        const gradeData = {
          student: formData.studentId,
          subject: selectedSubject._id, // Use subject ID for grade creation
          value: Number(formData.value),
          description: formData.description,
          date: formData.date
        };
        
        console.log('[CreateGrade] Submitting grade data:', gradeData);
        
        const endpoint = `${API_URL}/api/grades`;
        const gradeResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(gradeData)
        });
        
        if (gradeResponse.ok) {
          toast.success('Grade added successfully!');
          // Role-aware redirect - admin goes to admin routes, teachers to teacher routes
          const redirectPath = user.role === 'admin' || user.role === 'superadmin' 
            ? '/app/admin/grades/manage'
            : '/app/teacher/grades/manage';
          
          console.log(`[CreateGrade] Redirecting ${user.role} to: ${redirectPath}`);
          navigate(redirectPath);
        } else {
          throw new Error(t('teacherGrades.createPage.createFailed'));
        }
      } else {
        throw new Error(t('teacherGrades.createPage.fetchSubjectsFailed'));
      }
      
    } catch (error) {
      console.error('[CreateGrade] Error creating grade:', error);
      const errorMessage = error.message || t('teacherGrades.createPage.createFailed');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSelectedStudent = () => {
    return students.find(s => s._id === formData.studentId);
  };

  const getSelectedSubject = () => {
    return subjects.find(s => s._id === formData.subjectId);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {user.role === 'admin' ? t('teacherGrades.createPage.titleAdmin') : t('teacherGrades.createPage.titleTeacher')}
        </h1>
        <p className="text-muted-foreground">
          {user.role === 'admin' 
            ? t('teacherGrades.createPage.subtitleAdmin')
            : t('teacherGrades.createPage.subtitleTeacher')
          }
        </p>
      </div>

      {/* Filter Section - New working backend approach */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            {t('teacherGrades.createPage.filtersCardTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFilters ? (
            <div className="flex justify-center items-center p-4">
              <Spinner className="text-primary" />
              <span className="ml-2">{t('teacherGrades.createPage.loadingFilters')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School Branch Filter */}
              <div className="space-y-2">
                <Label htmlFor="schoolBranch">{t('teacherGrades.createPage.schoolBranch')}</Label>
                <Select
                  value={selectedFilters.schoolBranch}
                  onValueChange={(value) => {
                    setSelectedFilters(prev => ({ ...prev, schoolBranch: value, subject: '' }));
                    setStudents([]);
                    setFormData(prev => ({ ...prev, studentId: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('teacherGrades.createPage.schoolBranchPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.schoolBranches.map((branch) => (
                      <SelectItem key={branch.value} value={branch.value}>
                        {branchNames[branch.value] || branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Subject Filter */}
              <div className="space-y-2">
                <Label htmlFor="subject">{t('teacherGrades.subject')}</Label>
                <Select
                  value={selectedFilters.subject}
                  onValueChange={(value) => {
                    setSelectedFilters(prev => ({ ...prev, subject: value }));
                    setStudents([]);
                    setFormData(prev => ({ ...prev, studentId: '' }));
                  }}
                  disabled={!selectedFilters.schoolBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('teacherGrades.createPage.subjectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.subjects.map((subject) => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedFilters.schoolBranch && (
                  <p className="text-sm text-muted-foreground">{t('teacherGrades.createPage.selectBranchFirst')}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Collapsible open={expandedSections.has('basic')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="h-6 w-6 text-primary" />
                    <CardTitle>{t('teacherGrades.createPage.basicInfoTitle')}</CardTitle>
                  </div>
                  {expandedSections.has('basic') ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="studentId">{t('teacherGrades.student')} *</Label>
                    <Select value={formData.studentId} onValueChange={(value) => handleSelectChange('studentId', value)}>
                      <SelectTrigger className={errors.studentId ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('teacherGrades.createPage.studentPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingStudents ? (
                          <div className="flex items-center justify-center p-4">
                            <Spinner className="text-primary" />
                            <span className="ml-2">{t('teacherGrades.createPage.loadingStudents')}</span>
                          </div>
                        ) : students.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            {!selectedFilters.subject ? t('teacherGrades.createPage.selectAllFiltersFirst') : t('teacherGrades.createPage.noStudentsFoundForFilters')}
                          </div>
                        ) : (
                          students.map((student) => (
                            <SelectItem key={student._id} value={student._id}>
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{student.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.studentId && (
                      <p className="text-sm text-destructive">{errors.studentId}</p>
                    )}
                  </div>

                  {/* Grade Value */}
                  <div className="space-y-2">
                    <Label htmlFor="value">{t('teacherGrades.createPage.gradeValueLabel')} *</Label>
                    <Input
                      id="value"
                      name="value"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder={t('teacherGrades.createPage.gradeValuePlaceholder')}
                      className={errors.value ? 'border-destructive' : ''}
                    />
                    {errors.value && (
                      <p className="text-sm text-destructive">{errors.value}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">{t('teacherGrades.createPage.dateLabel')} *</Label>
                    {/* Mobile: Native date input */}
                    <div className="block sm:hidden">
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full min-w-0 ${errors.date ? 'border-destructive' : ''}`}
                        style={{ WebkitAppearance: 'none' }}
                        inputMode="none"
                      />
                    </div>
                    {/* Desktop: Beautiful DatePicker */}
                    <div className="hidden sm:block">
                      <DatePicker
                        placeholder={t('teacherGrades.createPage.dateLabel')}
                        value={formData.date}
                        onChange={(value) => handleInputChange({ target: { name: 'date', value } })}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full ${errors.date ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.date && (
                      <p className="text-sm text-destructive">{errors.date}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Advanced Options Section */}
        <Collapsible open={expandedSections.has('advanced')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Plus className="h-6 w-6 text-primary" />
                    <CardTitle>{t('teacherGrades.createPage.advancedOptionsTitle')}</CardTitle>
                  </div>
                  {expandedSections.has('advanced') ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t('teacherGrades.createPage.descriptionLabelOptional')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('teacherGrades.createPage.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Preview Section */}
        {(formData.studentId || formData.subjectId || formData.value) && (
          <Card>
            <CardHeader>
              <CardTitle>{t('teacherGrades.createPage.previewTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.studentId && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('teacherGrades.createPage.previewStudent')}</span>
                    <span>{getSelectedStudent()?.name}</span>
                  </div>
                )}
                
                {selectedFilters.subject && (
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('teacherGrades.createPage.previewSubject')}</span>
                    <span>{selectedFilters.subject}</span>
                  </div>
                )}
                
                {formData.value && (
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('teacherGrades.createPage.previewGrade')}</span>
                    <Badge variant="default">{formData.value}</Badge>
                  </div>
                )}
                
                {formData.date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t('teacherGrades.createPage.previewDate')}</span>
                    <span>{new Date(formData.date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(user.role === 'admin' ? '/app/admin/grades/manage' : '/app/teacher/grades/manage')}
            disabled={loading}
          >
            <X className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? t('teacherGrades.createPage.creating') : t('teacherGrades.createGrade')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateGradeSimple;
