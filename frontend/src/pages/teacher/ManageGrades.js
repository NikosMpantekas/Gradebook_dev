import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_URL } from '../../config/appConfig';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Checkbox } from '../../components/ui/checkbox';
import { EditGradeDialog } from '../../components/grades/GradeDialogs';
import { Spinner } from '../../components/ui/spinner';

// Icons
import { BookOpen, Plus, Trash2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const ManageGrades = () => {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    student: 'all',
    subject: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'createdAt',
    direction: 'desc'
  });
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState([]);
  
  // Edit grade dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGradeData, setEditGradeData] = useState({
    id: '',
    value: 0,
    description: '',
    student: '',
    subject: '',
    date: new Date(),
    studentName: '',
    subjectName: ''
  });

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  useEffect(() => {
    if (user && authToken) {
      fetchGrades();
      fetchStudents();
      fetchSubjects();
    } else {
      toast.error('Authentication required. Please log in again.');
    }
  }, [user, authToken]);

  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connectivity...');
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Backend health check response:', response.status);
    } catch (error) {
      console.error('Backend connectivity test failed:', error);
      toast.error('Warning: Backend server may not be accessible');
    }
  };

  const fetchGrades = async () => {
    try {
      if (!authToken) {
        console.error('No authentication token available');
        return;
      }

      // Use different endpoints based on user role
      const endpoint = user.role === 'admin' 
        ? `${API_URL}/api/grades`  // Admin gets all grades
        : `${API_URL}/api/grades/teacher/${user._id}`; // Teacher gets their grades

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('Authentication failed for grades fetch');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades || data || []);
      } else {
        console.error('Failed to fetch grades:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!authToken) {
        console.error('No authentication token available');
        return;
      }

      // Use different endpoints based on user role
      const endpoint = user.role === 'admin' 
        ? `${API_URL}/api/users/students`  // Admin gets all students
        : `${API_URL}/api/users/teacher-students`; // Teacher gets their students

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('Authentication failed for students fetch');
        toast.error('Authentication failed. Please log in again.');
        return;
      }

      if (response.status === 403) {
        const errorMessage = user.role === 'admin' 
          ? 'Access denied. Admin privileges required.'
          : 'Access denied. Teachers only.';
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setStudents(data || []);
        
        if (!data || data.length === 0) {
          const message = user.role === 'admin' 
            ? 'No students found in the system.'
            : 'No students found. You may need to be assigned to classes first.';
          toast.info(message);
        }
      } else {
        console.error('Failed to fetch students:', response.status, response.statusText);
        toast.error(`Failed to fetch students: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error fetching students. Please try again.');
    }
  };

  const fetchSubjects = async () => {
    try {
      if (!authToken) {
        console.error('No authentication token available');
        return;
      }

      const response = await fetch(`${API_URL}/api/subjects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('Authentication failed for subjects fetch');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data || []);
      } else {
        console.error('Failed to fetch subjects:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGradeSelection = (gradeId) => {
    setSelectedGrades(prev => {
      if (prev.includes(gradeId)) {
        return prev.filter(id => id !== gradeId);
      } else {
        return [...prev, gradeId];
      }
    });
  };

  const handleEditGrade = (grade) => {
    setEditGradeData({
      id: grade._id,
      value: grade.value || 0,
      description: grade.description || '',
      student: grade.student?._id || '',
      subject: grade.subject?._id || '',
      date: grade.date ? new Date(grade.date) : new Date(grade.createdAt),
      studentName: grade.student?.name || 'Unknown Student',
      subjectName: grade.subject?.name || 'Unknown Subject'
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditGradeData({
      id: '',
      value: 0,
      description: '',
      student: '',
      subject: '',
      date: new Date(),
      studentName: '',
      subjectName: ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === 'value') {
      const numValue = value === '' ? '' : Math.min(Math.max(parseInt(value, 10) || 0, 0), 100);
      processedValue = numValue;
    } else if (name === 'date') {
      processedValue = value ? new Date(value) : new Date();
    }
    
    setEditGradeData({
      ...editGradeData,
      [name]: processedValue,
    });
  };

  const handleEditSave = async () => {
    if (!editGradeData.id) {
      toast.error('Cannot save edit - no grade ID provided');
      return;
    }

    if (editGradeData.value === '' || editGradeData.value === null) {
      toast.error('Grade value cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/grades/${editGradeData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: editGradeData.value,
          description: editGradeData.description,
          date: editGradeData.date
        })
      });

      if (response.ok) {
        toast.success('Grade updated successfully');
        handleEditClose();
        fetchGrades(); // Refresh the grades list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating grade:', error);
      toast.error(error.message || 'Failed to update grade');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedGrades.length} grade(s)?`)) {
      return;
    }

    try {
      const promises = selectedGrades.map(gradeId =>
        fetch(`${API_URL}/api/grades/${gradeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedGrades.length} grade(s) deleted successfully`);
      setSelectedGrades([]);
      fetchGrades();
    } catch (error) {
      console.error('Error deleting grades:', error);
      toast.error('Failed to delete grades');
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm('Are you sure you want to delete this grade?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/grades/${gradeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Grade deleted successfully');
        fetchGrades(); // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast.error(error.message || 'Failed to delete grade');
    }
  };

  const getFilteredAndSortedGrades = () => {
    let filtered = [...grades];

    // Apply filters
    if (filters.student !== 'all') {
      filtered = filtered.filter(grade => grade.student._id === filters.student);
    }
    if (filters.subject !== 'all') {
      filtered = filtered.filter(grade => grade.subject._id === filters.subject);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(grade => new Date(grade.createdAt) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(grade => new Date(grade.createdAt) <= new Date(filters.dateTo));
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(grade =>
        grade.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.field) {
        case 'student':
          aValue = a.student.name;
          bValue = b.student.name;
          break;
        case 'subject':
          aValue = a.subject.name;
          bValue = b.subject.name;
          break;
        case 'value':
          aValue = parseFloat(a.value);
          bValue = parseFloat(b.value);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a[sortConfig.field];
          bValue = b[sortConfig.field];
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      student: 'all',
      subject: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setSearchTerm('');
  };

  const filteredGrades = getFilteredAndSortedGrades();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner className="text-primary" />
          <p className="text-muted-foreground">Loading grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {user.role === 'admin' ? 'Admin Grade Management' : 'Manage Grades'}
            </h1>
            <p className="text-muted-foreground">
              {user.role === 'admin' 
                ? 'View, filter, edit, and delete grades across all classes and teachers'
                : 'View, filter, edit, and delete grades for your assigned classes'
              }
            </p>
          </div>
          <Button 
            onClick={() => navigate(user.role === 'admin' ? '/app/admin/grades/create' : '/app/teacher/grades/create')}
            className="flex items-center gap-2 text-foreground"
          >
            <Plus className="h-4 w-4" />
            Create Grade
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedFilters(!expandedFilters)}
            >
              {expandedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expandedFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        
        <Collapsible open={expandedFilters}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search grades..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Student Filter */}
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select
                    value={filters.student}
                    onValueChange={(value) => handleFilterChange('student', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject Filter */}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={filters.subject}
                    onValueChange={(value) => handleFilterChange('subject', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
                <div className="text-sm text-muted-foreground">
                  {filteredGrades.length} of {grades.length} grades
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Bulk Actions */}
      {selectedGrades.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedGrades.length} grade(s) selected
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setSelectedGrades([])}>
                  Deselect All
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Grades ({filteredGrades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGrades.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Grades Found</h3>
              <p className="text-muted-foreground">
                {grades.length === 0 ? 'No grades have been created yet.' : 'No grades match the current filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Checkbox 
                        checked={selectedGrades.length === filteredGrades.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGrades(filteredGrades.map(grade => grade._id));
                          } else {
                            setSelectedGrades([]);
                          }
                        }}
                      />
                    </th>
                    <th 
                      className="text-left p-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('student')}
                    >
                      Student
                      {sortConfig.field === 'student' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-left p-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('subject')}
                    >
                      Subject
                      {sortConfig.field === 'subject' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-left p-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('value')}
                    >
                      Grade
                      {sortConfig.field === 'value' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-left p-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('createdAt')}
                    >
                      Date
                      {sortConfig.field === 'createdAt' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.map((grade) => (
                    <tr key={grade._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Checkbox 
                          checked={selectedGrades.includes(grade._id)}
                          onCheckedChange={() => handleGradeSelection(grade._id)}
                        />
                      </td>
                      <td className="p-2 font-medium">{grade.student?.name || 'Unknown Student'}</td>
                      <td className="p-2">{grade.subject?.name || 'Unknown Subject'}</td>
                      <td className="p-2">
                        <Badge variant={grade.value >= 5 ? 'default' : 'destructive'}>
                          {grade.value}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {new Date(grade.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground max-w-xs truncate">
                        {grade.description || '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditGrade(grade)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteGrade(grade._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Grade Dialog */}
      <EditGradeDialog
        open={editDialogOpen}
        handleClose={handleEditClose}
        editGradeData={editGradeData}
        handleEditChange={handleEditChange}
        handleEditSave={handleEditSave}
        subjects={subjects}
        user={user}
      />
    </div>
  );
};

export default ManageGrades; 