const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Subject = require('../models/subjectModel');
const Class = require('../models/classModel');

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin/Teacher
const getStudents = asyncHandler(async (req, res) => {

  try {
    // Find all students (users with role='student') in the current school context
    const students = await User.find({ 
      role: 'student',
      schoolId: req.user.schoolId
    })
    .select('-password')
    .populate('direction', 'name')
    .populate('school', 'name')
    .lean();

    res.json(students);
  } catch (error) {
    console.error('Error in getStudents:', error.message);
    res.status(500);
    throw new Error('Error retrieving students: ' + error.message);
  }
});

// @desc    Get students by subject
// @route   GET /api/students/subject/:id
// @access  Private/Admin/Teacher
const getStudentsBySubject = asyncHandler(async (req, res) => {
  const subjectId = req.params.id;

  try {
    // First verify the subject exists in this school
    const subject = await Subject.findOne({
      _id: subjectId,
      schoolId: req.user.schoolId
    });
    
    if (!subject) {

      res.status(404);
      throw new Error('Subject not found in this school');
    }
    
    // Get the direction IDs this subject belongs to
    const subjectDirections = subject.directions || [];

    // Find students who are in these directions and this school
    const students = await User.find({
      role: 'student',
      schoolId: req.user.schoolId,
      direction: { $in: subjectDirections }
    })
    .select('-password')
    .populate('direction', 'name')
    .populate('school', 'name')
    .lean();

    res.json(students);
  } catch (error) {
    console.error('Error in getStudentsBySubject:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Error retrieving students for this subject');
  }
});

// @desc    Get students by direction
// @route   GET /api/students/direction/:id
// @access  Private/Admin/Teacher
const getStudentsByDirection = asyncHandler(async (req, res) => {
  const directionId = req.params.id;

  try {
    // Find students in this direction and school
    const students = await User.find({
      role: 'student',
      schoolId: req.user.schoolId,
      direction: directionId
    })
    .select('-password')
    .populate('direction', 'name')
    .populate('school', 'name')
    .lean();

    res.json(students);
  } catch (error) {
    console.error('Error in getStudentsByDirection:', error.message);
    res.status(500);
    throw new Error('Error retrieving students for this direction: ' + error.message);
  }
});

// @desc    Get students for teacher based on their classes (NEW CLASS-BASED LOGIC)
// @route   GET /api/students/teacher/classes
// @access  Private/Teacher
const getStudentsForTeacher = asyncHandler(async (req, res) => {

  try {
    // Find all classes where this teacher is assigned
    const teacherClasses = await Class.find({
      schoolId: req.user.schoolId,
      teachers: req.user._id,
      active: true
    }).populate('students', 'name email');

    // Extract unique students from all the teacher's classes
    const studentIds = new Set();
    const studentsMap = new Map();
    
    teacherClasses.forEach(cls => {
      if (cls.students && Array.isArray(cls.students)) {
        cls.students.forEach(student => {
          if (student && student._id) {
            const studentId = student._id.toString();
            if (!studentIds.has(studentId)) {
              studentIds.add(studentId);
              studentsMap.set(studentId, {
                _id: student._id,
                name: student.name,
                email: student.email,
                // Add class context information
                classes: []
              });
            }
            // Add class information to student record
            studentsMap.get(studentId).classes.push({
              classId: cls._id,
              className: cls.name,
              subject: cls.subject,
              direction: cls.direction,
              schoolBranch: cls.schoolBranch
            });
          }
        });
      }
    });
    
    // Convert to array and add detailed student information
    const students = Array.from(studentsMap.values());

    res.json(students);
  } catch (error) {
    console.error('Error in getStudentsForTeacher:', error.message);
    res.status(500);
    throw new Error('Error retrieving students for teacher: ' + error.message);
  }
});

// @desc    Get students by subject for a teacher (NEW CLASS-BASED LOGIC)
// @route   GET /api/students/teacher/subject/:id
// @access  Private/Teacher
const getStudentsBySubjectForTeacher = asyncHandler(async (req, res) => {
  const subjectId = req.params.id;

  try {
    // First verify the subject exists in this school
    const subject = await Subject.findOne({
      _id: subjectId,
      schoolId: req.user.schoolId
    });
    
    if (!subject) {

      res.status(404);
      throw new Error('Subject not found in this school');
    }

    // Find classes where:
    // 1. Teacher is assigned
    // 2. Subject matches
    // 3. Same school
    const teacherClasses = await Class.find({
      schoolId: req.user.schoolId,
      teachers: req.user._id,
      subject: subject.name, // Match by subject name
      active: true
    }).populate('students', 'name email');

    // Extract unique students from matching classes
    const studentIds = new Set();
    const studentsMap = new Map();
    
    teacherClasses.forEach(cls => {

      if (cls.students && Array.isArray(cls.students)) {
        cls.students.forEach(student => {
          if (student && student._id) {
            const studentId = student._id.toString();
            if (!studentIds.has(studentId)) {
              studentIds.add(studentId);
              studentsMap.set(studentId, {
                _id: student._id,
                name: student.name,
                email: student.email,
                // Add class context information for this subject
                classes: []
              });
            }
            // Add class information to student record
            studentsMap.get(studentId).classes.push({
              classId: cls._id,
              className: cls.name,
              subject: cls.subject,
              direction: cls.direction,
              schoolBranch: cls.schoolBranch
            });
          }
        });
      }
    });
    
    // Convert to array
    const students = Array.from(studentsMap.values());

    res.json(students);
  } catch (error) {
    console.error('Error in getStudentsBySubjectForTeacher:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Error retrieving students for this subject');
  }
});

// @desc    Get filter options for teacher based on their classes (school branches, directions, subjects)
// @route   GET /api/students/teacher/filters
// @access  Private/Teacher/Admin
const getFilterOptionsForTeacher = asyncHandler(async (req, res) => {

  try {
    let teacherClasses = [];
    
    if (req.user.role === 'admin') {
      // Admin can see all classes in their school
      teacherClasses = await Class.find({
        schoolId: req.user.schoolId,
        active: true
      });

    } else {
      // Find all classes where this teacher is assigned
      teacherClasses = await Class.find({
        schoolId: req.user.schoolId,
        teachers: req.user._id,
        active: true
      });

    }
    
    // DEBUG: Log the actual class data to see what's in the schoolBranch field

    // Extract unique filter options
    const schoolBranchIds = new Set();
    const directions = new Set();
    const subjects = new Set();
    
    // Collect unique values from teacher's classes
    teacherClasses.forEach(cls => {
      if (cls.schoolBranch) schoolBranchIds.add(cls.schoolBranch);
      if (cls.direction) directions.add(cls.direction);
      if (cls.subject) subjects.add(cls.subject);
    });
    
    // Get school data to map branch IDs to names
    const schoolBranches = [];
    
    const branchIds = Array.from(schoolBranchIds);
    try {
      // Fetch actual school branch documents to get names
      const School = require('../models/schoolModel');
      const branchDocs = await School.find({
        _id: { $in: branchIds.filter(id => mongoose.Types.ObjectId.isValid(id)) }
      }).select('_id name');

      // Create mapping of branch IDs to names
      const branchNameMap = {};
      branchDocs.forEach(branch => {
        branchNameMap[branch._id.toString()] = branch.name;
      });
      
      // Create filter options with proper names as labels
      branchIds.forEach(branchId => {
        const branchName = branchNameMap[branchId.toString()] || `Branch ${branchId}`;
        schoolBranches.push({ 
          value: branchId, 
          label: branchName 
        });
      });
    } catch (branchError) {
      console.error('Error fetching branch names:', branchError);
      // Fallback: use IDs as labels if branch lookup fails
      branchIds.forEach(branch => {
        schoolBranches.push({ value: branch, label: branch });
      });
    }
    
    // Log the final school branches array

    const filterOptions = {
      schoolBranches,
      directions: Array.from(directions).map(direction => ({ value: direction, label: direction })),
      subjects: Array.from(subjects).map(subject => ({ value: subject, label: subject }))
    };

    res.json(filterOptions);
  } catch (error) {
    console.error('Error in getFilterOptionsForTeacher:', error);
    res.status(500);
    throw new Error('Failed to get filter options');
  }
});

// @desc    Get students for teacher with multiple filters (school branch, direction, subject)
// @route   GET /api/students/teacher/filtered
// @access  Private/Teacher/Admin
const getFilteredStudentsForTeacher = asyncHandler(async (req, res) => {
  const { schoolBranch, direction, subject } = req.query;

  try {
    // Build the filter for classes
    const classFilter = {
      schoolId: req.user.schoolId,
      active: true
    };
    
    // Add teacher filter only if user is not admin
    if (req.user.role !== 'admin') {
      classFilter.teachers = req.user._id;
    }
    
    // Add optional filters
    if (schoolBranch) classFilter.schoolBranch = schoolBranch;
    if (direction) classFilter.direction = direction;
    if (subject) classFilter.subject = subject;

    // Find classes matching the criteria
    const matchingClasses = await Class.find(classFilter).populate('students', 'name email');

    // Extract unique students from all matching classes
    const studentMap = new Map();
    
    matchingClasses.forEach(cls => {
      if (cls.students && cls.students.length > 0) {
        cls.students.forEach(student => {
          if (!studentMap.has(student._id.toString())) {
            studentMap.set(student._id.toString(), {
              _id: student._id,
              name: student.name,
              email: student.email,
              classes: []
            });
          }
          // Add class context to student
          studentMap.get(student._id.toString()).classes.push({
            _id: cls._id,
            name: cls.name,
            subject: cls.subject,
            direction: cls.direction,
            schoolBranch: cls.schoolBranch
          });
        });
      }
    });
    
    const students = Array.from(studentMap.values());

    res.json(students);
  } catch (error) {
    console.error('Error in getFilteredStudentsForTeacher:', error);
    res.status(500);
    throw new Error('Failed to get filtered students');
  }
});

// @desc    Get filter options for notification recipients (supports both students and teachers)
// @route   GET /api/students/notification/filters
// @access  Private (Teachers and Admins)
const getFilterOptionsForNotifications = asyncHandler(async (req, res) => {

  try {
    // Build the filter for classes
    const classFilter = {
      schoolId: req.user.schoolId,
      active: true
    };
    
    // Add teacher filter only if user is not admin
    if (req.user.role !== 'admin') {
      classFilter.teachers = req.user._id;
    }

    // Find all classes the user has access to
    const classes = await Class.find(classFilter);

    // Extract unique filter options
    const schoolBranchIds = new Set();
    const directions = new Set();
    const subjects = new Set();
    
    classes.forEach(cls => {
      if (cls.schoolBranch) schoolBranchIds.add(cls.schoolBranch);
      if (cls.direction) directions.add(cls.direction);
      if (cls.subject) subjects.add(cls.subject);
    });
    
    // Get school data to map branch IDs to names
    const schoolBranches = [];
    
    try {
      const School = require('../models/schoolModel');
      const branchIds = Array.from(schoolBranchIds);
      const branchDocs = await School.find({
        _id: { $in: branchIds.filter(id => mongoose.Types.ObjectId.isValid(id)) }
      }).select('_id name');
      
      const branchNameMap = {};
      branchDocs.forEach(branch => {
        branchNameMap[branch._id.toString()] = branch.name;
      });
      
      branchIds.forEach(branchId => {
        const branchName = branchNameMap[branchId.toString()] || `Branch ${branchId}`;
        schoolBranches.push({ 
          value: branchId, 
          label: branchName 
        });
      });
    } catch (branchError) {
      console.error('[NOTIFICATION FILTERS] Error fetching branch names for notifications:', branchError);
      Array.from(schoolBranchIds).forEach(branch => {
        schoolBranches.push({ value: branch, label: branch });
      });
    }
    
    const filterOptions = {
      schoolBranches,
      directions: Array.from(directions).map(direction => ({ value: direction, label: direction })),
      subjects: Array.from(subjects).map(subject => ({ value: subject, label: subject }))
    };

    res.json(filterOptions);
  } catch (error) {
    console.error('[NOTIFICATION FILTERS] Error in getFilterOptionsForNotifications:', error);
    res.status(500);
    throw new Error('Failed to get notification filter options');
  }
});

// @desc    Get filtered users for notifications (students and teachers)
// @route   GET /api/students/notification/filtered
// @access  Private (Teachers and Admins)
const getFilteredUsersForNotifications = asyncHandler(async (req, res) => {
  const { schoolBranch, direction, subject, userRole } = req.query;
  console.log(`[FILTERED USERS] getFilteredUsersForNotifications called for user: ${req.user._id} (${req.user.role})`, { 
    schoolBranch, direction, subject, userRole 
  });

  try {
    // Build the filter for classes
    const classFilter = {
      schoolId: req.user.schoolId,
      active: true
    };
    
    // Add specific filters
    if (schoolBranch) classFilter.schoolBranch = schoolBranch;
    if (direction) classFilter.direction = direction;
    if (subject) classFilter.subject = subject;
    
    // Add teacher filter only if user is not admin
    if (req.user.role !== 'admin') {
      classFilter.teachers = req.user._id;
    }

    // Find all classes matching the criteria
    const classes = await Class.find(classFilter);

    if (classes.length === 0) {

      return res.json([]);
    }
    
    // Get all student IDs from these classes
    const studentIds = new Set();
    const teacherIds = new Set();
    
    classes.forEach(cls => {
      if (cls.students && cls.students.length > 0) {
        cls.students.forEach(studentId => studentIds.add(studentId.toString()));
      }
      if (cls.teachers && cls.teachers.length > 0) {
        cls.teachers.forEach(teacherId => teacherIds.add(teacherId.toString()));
      }
    });

    let users = [];
    
    // Determine which users to fetch based on userRole
    if (!userRole || userRole === 'all' || userRole === 'student') {
      // Fetch students
      const students = await User.find({
        _id: { $in: Array.from(studentIds) },
        role: 'student',
        schoolId: req.user.schoolId
      })
      .select('_id name email role')
      .lean();

      users = users.concat(students);
    }
    
    if (!userRole || userRole === 'all' || userRole === 'teacher') {
      // Fetch teachers
      const teachers = await User.find({
        _id: { $in: Array.from(teacherIds) },
        role: 'teacher',
        schoolId: req.user.schoolId
      })
      .select('_id name email role')
      .lean();

      users = users.concat(teachers);
    }
    
    if (!userRole || userRole === 'all' || userRole === 'parent') {
      // Fetch parents linked to students from these classes
      const parents = await User.find({
        linkedStudentIds: { $in: Array.from(studentIds) },
        role: 'parent',
        schoolId: req.user.schoolId
      })
      .select('_id name email role linkedStudentIds')
      .lean();

      users = users.concat(parents);
    }
    
    // GHOST USER FIX: Filter out users with missing names or emails to prevent ghost users
    const validUsers = users.filter(user => {
      const hasValidName = user.name && user.name.trim().length > 0;
      const hasValidEmail = user.email && user.email.trim().length > 0;
      
      if (!hasValidName || !hasValidEmail) {
        console.warn(`[FILTERED USERS] Filtering out invalid user: ID=${user._id}, name="${user.name}", email="${user.email}"`);
        return false;
      }
      return true;
    });
    
    // Sort users by name for better UX
    validUsers.sort((a, b) => a.name.localeCompare(b.name));

    res.json(validUsers);
  } catch (error) {
    console.error('[FILTERED USERS] Error in getFilteredUsersForNotifications:', error);
    res.status(500);
    throw new Error('Failed to get filtered users for notifications');
  }
});

module.exports = {
  getStudents,
  getStudentsBySubject,
  getStudentsByDirection,
  getStudentsForTeacher,
  getStudentsBySubjectForTeacher,
  getFilterOptionsForTeacher,
  getFilteredStudentsForTeacher,
  getFilterOptionsForNotifications,
  getFilteredUsersForNotifications
};
