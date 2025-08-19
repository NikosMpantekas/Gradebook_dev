import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  User,
  School,
  BookOpen,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  Mail,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Checkbox } from '../../components/ui/checkbox';
import { Spinner } from '../../components/ui/spinner';
import { API_URL } from '../../config/appConfig';

const TeacherGrades = () => {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    student: 'all',
    subject: 'all',
    dateFrom: '',
    dateTo: '',
    minGrade: '',
    maxGrade: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'createdAt',
    direction: 'desc'
  });
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Get token from user object or localStorage as fallback
  const authToken = user?.token || localStorage.getItem('token');

  useEffect(() => {
    fetchGrades();
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/grades/teacher`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades || []);
      } else {
        throw new Error('Failed to fetch grades');
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/teacher-students`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data || []);
      } else if (response.status === 403) {
        console.error('Access denied. Teachers only.');
      } else {
        console.error('Failed to fetch students:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subjects`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
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

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleFilters = () => {
    setExpandedFilters(!expandedFilters);
  };

  const clearFilters = () => {
    setFilters({
      student: 'all',
      subject: 'all',
      dateFrom: '',
      dateTo: '',
      minGrade: '',
      maxGrade: ''
    });
    setSearchTerm('');
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

  const exportGrades = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = () => {
    const headers = ['Student', 'Subject', 'Grade', 'Date', 'Description'];
    const rows = filteredGrades.map(grade => [
      grade.student?.name || 'Unknown Student',
      grade.subject?.name || 'Unknown Subject',
      grade.value,
      new Date(grade.createdAt).toLocaleDateString(),
      grade.description || '-'
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
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
    if (filters.minGrade) {
      filtered = filtered.filter(grade => grade.value >= parseFloat(filters.minGrade));
    }
    if (filters.maxGrade) {
      filtered = filtered.filter(grade => parseFloat(grade.value) <= parseFloat(filters.maxGrade));
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
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      if (sortConfig.field === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
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

  const getGradeColor = (value) => {
    const numValue = parseFloat(value);
    if (numValue >= 9) return 'text-green-600';
    if (numValue >= 7) return 'text-blue-600';
    if (numValue >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Spinner className="text-primary" />
        <p className="text-muted-foreground">Loading grades...</p>
      </div>
    );
  }

  const filteredGrades = getFilteredAndSortedGrades();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Teacher Grades</h1>
            <p className="text-muted-foreground">
              Manage and analyze all grades you've created for your students
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportGrades}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button 
            onClick={() => navigate('/teacher/create-grade')}
            className="sleek-button bg-primary hover:bg-primary/90 text-foreground hover:text-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Grade
          </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filters</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={toggleFilters}>
              {expandedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grades by student name, subject, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <Collapsible open={expandedFilters}>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select
                      value={filters.student}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, student: value }))}
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

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={filters.subject}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
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

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder="To"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label>Min Grade</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="0.0"
                      value={filters.minGrade}
                      onChange={(e) => handleFilterChange('minGrade', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Grade</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="10.0"
                      value={filters.maxGrade}
                      onChange={(e) => handleFilterChange('maxGrade', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table View
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            Card View
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('createdAt')}
            className="h-8 px-2"
          >
            Date
            {sortConfig.field === 'createdAt' && (
              sortConfig.direction === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('value')}
            className="h-8 px-2"
          >
            Grade
            {sortConfig.field === 'value' && (
              sortConfig.direction === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

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

      {/* Grades Display */}
          <Card>
        <CardHeader>
          <CardTitle>Grades ({filteredGrades.length})</CardTitle>
        </CardHeader>
        
        <CardContent>
          {filteredGrades.length > 0 ? (
            viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                  <tbody className="bg-white divide-y divide-gray-200">
                {filteredGrades.map((grade) => (
                      <tr key={grade._id} className="hover:bg-muted/50">
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
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/teacher/edit-grade/${grade._id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/teacher/view-grade/${grade._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this grade?')) {
                            // Handle delete
                          }
                        }}
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGrades.map((grade) => (
                  <Card
                    key={grade._id}
                    className={`hover:shadow-lg transition-shadow ${
                      selectedGrades.includes(grade._id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedGrades.includes(grade._id)}
                            onCheckedChange={() => handleGradeSelection(grade._id)}
                          />
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{grade.student.name}</span>
                        </div>
                        <Badge variant="default" className={`text-lg font-bold ${getGradeColor(grade.value)}`}>
                          {grade.value}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{grade.subject.name}</span>
                          </div>
                          <Badge variant="default" className={`text-lg font-bold ${getGradeColor(grade.value)}`}>
                            {grade.value}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(grade.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {grade.description && (
                          <p className="text-sm text-muted-foreground italic">
                            {grade.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/teacher/edit-grade/${grade._id}`)}
                            className="flex-1"
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/teacher/view-grade/${grade._id}`)}
                            className="flex-1"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        </div>
                      </div>
            </CardContent>
          </Card>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Grades Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || Object.values(filters).some(f => f !== 'all')
                  ? 'No grades match your current search and filters.'
                  : 'You haven\'t created any grades yet.'
                }
              </p>
              {!searchTerm && !Object.values(filters).some(f => f !== 'all') && (
                <Button 
                  onClick={() => navigate('/teacher/create-grade')} 
                  className="mt-4 sleek-button bg-primary hover:bg-primary/90 text-foreground hover:text-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Grade
                </Button>
              )}
            </div>
          )}
            </CardContent>
          </Card>
    </div>
  );
};

export default TeacherGrades;
