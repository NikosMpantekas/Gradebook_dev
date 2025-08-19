import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Users, 
  User, 
  School, 
  BookOpen, 
  Search, 
  Filter, 
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Spinner } from '../../../components/ui/spinner';
import { API_URL } from '../../../config/appConfig';

const NotificationRecipients = ({ 
  selectedRecipients, 
  onRecipientsChange, 
  error, 
  disabled,
  currentUserRole,
  // Add props for recipients data
  students = [],
  teachers = [],
  parents = [],
  loading = false
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['students', 'teachers', 'parents']));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'

  // Remove the API fetching logic - data comes from props now
  // const [students, setStudents] = useState([]);
  // const [teachers, setTeachers] = useState([]);
  // const [parents, setParents] = useState([]);
  // const [loading, setLoading] = useState(false);
  // const { token } = useSelector((state) => state.auth);
  // const { role: currentUserRole } = useState('admin'); // Default to admin for now

  // Remove the useEffect and fetchRecipients function since data comes from props
  // useEffect(() => {
  //   fetchRecipients();
  // }, []);

  const handleRecipientToggle = (recipientId, recipientType) => {
    const recipientKey = `${recipientType}_${recipientId}`;
    
    if (selectedRecipients.includes(recipientKey)) {
      onRecipientsChange(selectedRecipients.filter(id => id !== recipientKey));
    } else {
      onRecipientsChange([...selectedRecipients, recipientKey]);
    }
  };

  const isRecipientSelected = (recipientId, recipientType) => {
    const recipientKey = `${recipientType}_${recipientId}`;
    return selectedRecipients.includes(recipientKey);
  };

  const getRecipientCount = (type) => {
    const count = selectedRecipients.filter(id => id.startsWith(`${type}_`)).length;
    return count > 0 ? count : null;
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

  const filterRecipients = (recipients, type) => {
    let filtered = recipients;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(recipient =>
        recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(recipient => recipient.role === filterRole);
    }
    
    return filtered;
  };

  const getFilteredStudents = () => filterRecipients(students, 'student');
  const getFilteredTeachers = () => filterRecipients(teachers, 'teacher');
  const getFilteredParents = () => filterRecipients(parents, 'parent');

  const selectAllInSection = (recipients, type) => {
    const recipientKeys = recipients.map(recipient => `${type}_${recipient._id}`);
    const newSelected = [...new Set([...selectedRecipients, ...recipientKeys])];
    onRecipientsChange(newSelected);
  };

  const deselectAllInSection = (recipients, type) => {
    const recipientKeys = recipients.map(recipient => `${type}_${recipient._id}`);
    const newSelected = selectedRecipients.filter(id => !recipientKeys.includes(id));
    onRecipientsChange(newSelected);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spinner className="text-primary" />
        <p className="text-sm text-muted-foreground">Loading recipients...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-primary" />
          <CardTitle>Select Recipients</CardTitle>
          {selectedRecipients.length > 0 && (
            <Badge variant="default">{selectedRecipients.length} selected</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border hover:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium text-foreground">Filter by role:</Label>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-36 h-9 bg-background border-border hover:border-primary/50 hover:bg-background/80 transition-all duration-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Roles" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg">
                <SelectItem value="all" className="hover:bg-muted/50 cursor-pointer">
                  All Roles
                </SelectItem>
                <SelectItem value="student" className="hover:bg-muted/50 cursor-pointer">
                  Students
                </SelectItem>
                <SelectItem value="teacher" className="hover:bg-muted/50 cursor-pointer">
                  Teachers
                </SelectItem>
                <SelectItem value="parent" className="hover:bg-muted/50 cursor-pointer">
                  Parents
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recipients Sections */}
        <div className="space-y-4">
          {/* Students Section */}
          <Collapsible open={expandedSections.has('students')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Students</CardTitle>
                      {getRecipientCount('student') && (
                        <Badge variant="secondary">{getRecipientCount('student')}</Badge>
                      )}
                    </div>
                    {expandedSections.has('students') ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectAllInSection(getFilteredStudents(), 'student')}
                      disabled={disabled}
                    >
                      Select All
                    </Button>
          <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deselectAllInSection(getFilteredStudents(), 'student')}
                      disabled={disabled}
                    >
                      Deselect All
          </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getFilteredStudents().map((student) => (
                      <div key={student._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                        <Checkbox
                          id={`student-${student._id}`}
                          checked={isRecipientSelected(student._id, 'student')}
                          onCheckedChange={() => handleRecipientToggle(student._id, 'student')}
                          disabled={disabled}
                        />
                        <Label htmlFor={`student-${student._id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-sm text-muted-foreground">{student.email}</span>
                          </div>
                          {student.school && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <School className="h-3 w-3" />
                              <span>{student.school.name}</span>
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Teachers Section */}
          <Collapsible open={expandedSections.has('teachers')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Teachers</CardTitle>
                      {getRecipientCount('teacher') && (
                        <Badge variant="secondary">{getRecipientCount('teacher')}</Badge>
                      )}
                    </div>
                    {expandedSections.has('teachers') ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-2 mb-3">
            <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectAllInSection(getFilteredTeachers(), 'teacher')}
                      disabled={disabled}
                    >
                      Select All
            </Button>
            <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deselectAllInSection(getFilteredTeachers(), 'teacher')}
                      disabled={disabled}
                    >
                      Deselect All
            </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getFilteredTeachers().map((teacher) => (
                      <div key={teacher._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                        <Checkbox
                          id={`teacher-${teacher._id}`}
                          checked={isRecipientSelected(teacher._id, 'teacher')}
                          onCheckedChange={() => handleRecipientToggle(teacher._id, 'teacher')}
                          disabled={disabled}
                        />
                        <Label htmlFor={`teacher-${teacher._id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{teacher.name}</span>
                            <span className="text-sm text-muted-foreground">{teacher.email}</span>
                          </div>
                          {teacher.subjects && teacher.subjects.length > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              <span>{teacher.subjects.map(s => s.name).join(', ')}</span>
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Parents Section */}
          <Collapsible open={expandedSections.has('parents')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Parents</CardTitle>
                      {getRecipientCount('parent') && (
                        <Badge variant="secondary">{getRecipientCount('parent')}</Badge>
                      )}
                    </div>
                    {expandedSections.has('parents') ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectAllInSection(getFilteredParents(), 'parent')}
                      disabled={disabled}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deselectAllInSection(getFilteredParents(), 'parent')}
                      disabled={disabled}
                    >
                      Deselect All
                  </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getFilteredParents().map((parent) => (
                      <div key={parent._id} className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50">
                        <Checkbox
                          id={`parent-${parent._id}`}
                          checked={isRecipientSelected(parent._id, 'parent')}
                          onCheckedChange={() => handleRecipientToggle(parent._id, 'parent')}
                          disabled={disabled}
                        />
                        <Label htmlFor={`parent-${parent._id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{parent.name}</span>
                            <span className="text-sm text-muted-foreground">{parent.email}</span>
                          </div>
                          {parent.students && parent.students.length > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{parent.students.map(s => s.name).join(', ')}</span>
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Summary */}
        {selectedRecipients.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedRecipients.length} recipient(s) selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRecipientsChange([])}
                disabled={disabled}
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationRecipients;
