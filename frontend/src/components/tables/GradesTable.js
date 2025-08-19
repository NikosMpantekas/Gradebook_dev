import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  User,
  BookOpen,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Spinner } from '../ui/spinner';

const GradesTable = ({ 
  grades = [], 
  students = [], 
  subjects = [], 
  onEdit, 
  onDelete, 
  onView,
  isLoading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter and sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = grades.filter(grade => {
      const matchesSearch = 
        grade.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubject = !selectedSubject || grade.subjectId === selectedSubject;
      const matchesStudent = !selectedStudent || grade.studentId === selectedStudent;
      
      return matchesSearch && matchesSubject && matchesStudent;
    });

    // Sort grades
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === 'score' || sortField === 'maxScore') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [grades, searchTerm, selectedSubject, selectedStudent, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedGrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGrades = filteredAndSortedGrades.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    if (percentage >= 60) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const getAssignmentTypeColor = (type) => {
    const colors = {
      homework: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      quiz: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      test: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      exam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      project: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      participation: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[type] || colors.other;
  };

  const exportGrades = () => {
    // Implementation for exporting grades to CSV/Excel
    console.log('Exporting grades...');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Spinner className="text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Grades Management</span>
            <Button onClick={exportGrades} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search grades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject-filter">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="student-filter">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Results</Label>
              <div className="text-sm text-muted-foreground pt-2">
                {filteredAndSortedGrades.length} grades found
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('studentName')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Student
                      {sortField === 'studentName' && (
                        sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('subjectName')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Subject
                      {sortField === 'subjectName' && (
                        sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('title')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Assignment
                      {sortField === 'title' && (
                        sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('score')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Score
                      {sortField === 'score' && (
                        sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('date')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Date
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentGrades.map((grade) => {
                  const percentage = grade.maxScore ? (grade.score / grade.maxScore) * 100 : 0;
                  const letterGrade = grade.letterGrade || 'N/A';
                  
                  return (
                    <tr key={grade._id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {grade.studentName?.charAt(0)?.toUpperCase() || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{grade.studentName}</div>
                            <div className="text-sm text-muted-foreground">{grade.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{grade.subjectName}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{grade.title}</div>
                          {grade.comments && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {grade.comments}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{grade.score}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">{grade.maxScore}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getGradeColor(percentage)}>
                              {letterGrade}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(grade.date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <Badge className={getAssignmentTypeColor(grade.assignmentType)}>
                          {grade.assignmentType}
                        </Badge>
                      </td>
                      
                      <td className="px-4 py-3">
                        <Badge variant={grade.isFinal ? "destructive" : "secondary"}>
                          {grade.isFinal ? "Final" : "Draft"}
                        </Badge>
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onView(grade)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(grade)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Grade
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete(grade._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Grade
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedGrades.length)} of {filteredAndSortedGrades.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradesTable; 