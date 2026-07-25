import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, BookOpen, User } from 'lucide-react';

const GradeFilters = ({
  subjectFilter,
  studentFilter,
  subjects,
  students,
  isLoadingSubjects,
  isLoadingStudents,
  handleSubjectFilterChange,
  handleStudentFilterChange
}) => {
  const onSubjectChange = (val) => {
    const rawVal = val === 'ALL_SUBJECTS' ? '' : val;
    handleSubjectFilterChange({ target: { value: rawVal } });
  };

  const onStudentChange = (val) => {
    const rawVal = val === 'ALL_STUDENTS' ? '' : val;
    handleStudentFilterChange({ target: { value: rawVal } });
  };

  return (
    <Card className="mb-6 shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filter Grades
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subject Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Filter by Subject
          </Label>
          <Select
            value={subjectFilter || 'ALL_SUBJECTS'}
            onValueChange={onSubjectChange}
            disabled={isLoadingSubjects}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_SUBJECTS">
                <span className="italic">All Subjects</span>
              </SelectItem>
              {(subjects || []).map((subject) => (
                subject && subject._id ? (
                  <SelectItem key={subject._id} value={subject._id}>
                    {subject.name || subject.value || 'Unknown Subject'}
                    {subject.className && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({subject.className})
                      </span>
                    )}
                  </SelectItem>
                ) : null
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isLoadingSubjects ? 'Loading subjects...' : 'Select a subject to filter grades'}
          </p>
        </div>

        {/* Student Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Filter by Student
          </Label>
          <Select
            value={studentFilter || 'ALL_STUDENTS'}
            onValueChange={onStudentChange}
            disabled={isLoadingStudents}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STUDENTS">
                <span className="italic">All Students</span>
              </SelectItem>
              {(students || []).map((student) => (
                student && student._id ? (
                  <SelectItem key={student._id} value={student._id}>
                    {student.name}
                    {student.classes && student.classes.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({student.classes[0].name || 'Unknown Class'})
                      </span>
                    )}
                  </SelectItem>
                ) : null
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isLoadingStudents ? 'Loading students...' : 'Select a student to filter grades'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GradeFilters;
