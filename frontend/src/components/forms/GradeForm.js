import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  BookOpen,
  User,
  Calendar,
  FileText,
  Star,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const GradeForm = ({ 
  grade = null, 
  students = [], 
  subjects = [], 
  onSubmit, 
  onCancel, 
  isEditing = false, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    assignmentType: '',
    title: '',
    score: '',
    maxScore: '',
    weight: '',
    date: '',
    comments: '',
    isFinal: false
  });
  
  const [errors, setErrors] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    if (grade) {
      setFormData({
        studentId: grade.studentId || '',
        subjectId: grade.subjectId || '',
        assignmentType: grade.assignmentType || '',
        title: grade.title || '',
        score: grade.score || '',
        maxScore: grade.maxScore || '',
        weight: grade.weight || '',
        date: grade.date || '',
        comments: grade.comments || '',
        isFinal: grade.isFinal || false
      });
      
      // Set selected student and subject for display
      const student = students.find(s => s._id === grade.studentId);
      const subject = subjects.find(s => s._id === grade.subjectId);
      setSelectedStudent(student);
      setSelectedSubject(subject);
    }
  }, [grade, students, subjects]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Update selected student/subject for display
    if (name === 'studentId') {
      const student = students.find(s => s._id === value);
      setSelectedStudent(student);
    } else if (name === 'subjectId') {
      const subject = subjects.find(s => s._id === value);
      setSelectedSubject(subject);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.studentId) {
      newErrors.studentId = 'Student is required';
    }
    
    if (!formData.subjectId) {
      newErrors.subjectId = 'Subject is required';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Assignment title is required';
    }
    
    if (!formData.score || isNaN(formData.score)) {
      newErrors.score = 'Valid score is required';
    }
    
    if (!formData.maxScore || isNaN(formData.maxScore)) {
      newErrors.maxScore = 'Valid maximum score is required';
    }
    
    if (parseFloat(formData.score) > parseFloat(formData.maxScore)) {
      newErrors.score = 'Score cannot exceed maximum score';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) < 0 || parseFloat(formData.weight) > 100)) {
      newErrors.weight = 'Weight must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    // Calculate percentage and letter grade
    const percentage = (parseFloat(formData.score) / parseFloat(formData.maxScore)) * 100;
    const letterGrade = calculateLetterGrade(percentage);
    
    const submitData = {
      ...formData,
      score: parseFloat(formData.score),
      maxScore: parseFloat(formData.maxScore),
      weight: formData.weight ? parseFloat(formData.weight) : 0,
      percentage,
      letterGrade
    };
    
    onSubmit(submitData);
  };

  const calculateLetterGrade = (percentage) => {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const assignmentTypes = [
    { value: 'homework', label: 'Homework' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'test', label: 'Test' },
    { value: 'exam', label: 'Exam' },
    { value: 'project', label: 'Project' },
    { value: 'participation', label: 'Participation' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student and Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Student & Subject</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student *</Label>
              <Select value={formData.studentId} onValueChange={(value) => handleSelectChange('studentId', value)}>
                <SelectTrigger className={errors.studentId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-sm text-destructive">{errors.studentId}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subjectId">Subject *</Label>
              <Select value={formData.subjectId} onValueChange={(value) => handleSelectChange('subjectId', value)}>
                <SelectTrigger className={errors.subjectId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId}</p>}
            </div>
          </div>
          
          {/* Selected Student/Subject Info */}
          {(selectedStudent || selectedSubject) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              {selectedStudent && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Selected Student:</p>
                  <p className="text-sm">{selectedStudent.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
                </div>
              )}
              {selectedSubject && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Selected Subject:</p>
                  <p className="text-sm">{selectedSubject.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSubject.code}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Assignment Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignmentType">Assignment Type</Label>
              <Select value={formData.assignmentType} onValueChange={(value) => handleSelectChange('assignmentType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={errors.title ? 'border-destructive' : ''}
              placeholder="Enter assignment title"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              placeholder="Additional comments or notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Scoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score *</Label>
              <Input
                id="score"
                name="score"
                type="number"
                step="0.01"
                min="0"
                value={formData.score}
                onChange={handleInputChange}
                className={errors.score ? 'border-destructive' : ''}
                placeholder="0.00"
              />
              {errors.score && <p className="text-sm text-destructive">{errors.score}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxScore">Maximum Score *</Label>
              <Input
                id="maxScore"
                name="maxScore"
                type="number"
                step="0.01"
                min="0"
                value={formData.maxScore}
                onChange={handleInputChange}
                className={errors.maxScore ? 'border-destructive' : ''}
                placeholder="100.00"
              />
              {errors.maxScore && <p className="text-sm text-destructive">{errors.maxScore}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.weight}
                onChange={handleInputChange}
                className={errors.weight ? 'border-destructive' : ''}
                placeholder="10.0"
              />
              {errors.weight && <p className="text-sm text-destructive">{errors.weight}</p>}
            </div>
          </div>
          
          {/* Grade Preview */}
          {formData.score && formData.maxScore && !isNaN(formData.score) && !isNaN(formData.maxScore) && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Grade Preview:</p>
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl font-bold ${getGradeColor((formData.score / formData.maxScore) * 100)}`}>
                      {calculateLetterGrade((formData.score / formData.maxScore) * 100)}
                    </span>
                    <span className="text-lg">
                      {((formData.score / formData.maxScore) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-lg font-medium">
                    {formData.score} / {formData.maxScore}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isFinal"
              name="isFinal"
              checked={formData.isFinal}
              onChange={handleInputChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isFinal" className="text-sm font-normal">
              This is a final grade (cannot be changed later)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Grade' : 'Save Grade'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default GradeForm; 