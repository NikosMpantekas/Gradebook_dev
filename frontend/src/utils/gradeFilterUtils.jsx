/**
 * Utility functions for filtering and processing grades
 */

/**
 * Filter grades based on subject and student filters
 * @param {Array} grades - Array of grade objects
 * @param {String} subjectFilter - Subject ID to filter by
 * @param {String} studentFilter - Student ID to filter by
 * @returns {Array} Filtered grades
 */


/**
 * Resolve student and subject names from grade data
 * @param {Object} grade - Grade object
 * @param {Array} students - Array of student objects
 * @param {Array} subjects - Array of subject objects
 * @returns {Object} Object with resolved student and subject names and IDs
 */
export const resolveGradeEntities = (grade, students = [], subjects = []) => {
  if (!grade) return {};
  
  // Determine if student and subject are objects or just IDs
  const isStudentObject = typeof grade.student === 'object' && grade.student !== null;
  const isSubjectObject = typeof grade.subject === 'object' && grade.subject !== null;
  
  // Extract IDs and names
  const studentId = isStudentObject ? grade.student._id : grade.student;
  const studentName = isStudentObject ? grade.student.name : '';
  
  const subjectId = isSubjectObject ? grade.subject._id : grade.subject;
  const subjectName = isSubjectObject ? grade.subject.name : '';
  
  // If names weren't populated, try to find them in our arrays
  let resolvedStudentName = studentName;
  let resolvedSubjectName = subjectName;
  
  if (!resolvedStudentName && Array.isArray(students)) {
    const foundStudent = students.find(s => s._id === studentId);
    if (foundStudent) resolvedStudentName = foundStudent.name;
  }
  
  if (!resolvedSubjectName && Array.isArray(subjects)) {
    const foundSubject = subjects.find(s => s._id === subjectId);
    if (foundSubject) resolvedSubjectName = foundSubject.name;
  }
  
  return {
    studentId,
    studentName: resolvedStudentName || 'Unknown Student',
    subjectId,
    subjectName: resolvedSubjectName || 'Unknown Subject'
  };
};
