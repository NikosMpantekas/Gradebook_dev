const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Link parent to student
// @route   POST /api/users/link-parent
// @access  Private/Admin
const linkParentToStudent = asyncHandler(async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    console.log(`[Parent Link] Admin ${req.user._id} attempting to link parent ${parentId} to student ${studentId}`);

    // Validate inputs
    if (!parentId || !studentId) {
      console.log(`[Parent Link] Validation failed - missing parentId: ${parentId}, studentId: ${studentId}`);
      res.status(400);
      throw new Error('Parent ID and Student ID are required');
    }

    // Check if parent and student exist and belong to same school
    const parent = await User.findOne({ 
      _id: parentId, 
      role: 'parent', 
      schoolId: req.user.schoolId 
    });
    
    const student = await User.findOne({ 
      _id: studentId, 
      role: 'student', 
      schoolId: req.user.schoolId 
    });

    if (!parent) {
      console.log(`[Parent Link] Parent ${parentId} not found in school ${req.user.schoolId}`);
      res.status(404);
      throw new Error('Parent not found in your school');
    }

    if (!student) {
      console.log(`[Parent Link] Student ${studentId} not found in school ${req.user.schoolId}`);
      res.status(404);
      throw new Error('Student not found in your school');
    }

    // Check if already linked
    const isAlreadyLinked = parent.linkedStudentIds?.includes(studentId);
    if (isAlreadyLinked) {
      console.log(`[Parent Link] Parent ${parent.name} already linked to student ${student.name}`);
      res.status(400);
      throw new Error('Parent is already linked to this student');
    }

    // Add student to parent's linkedStudentIds
    if (!parent.linkedStudentIds) {
      parent.linkedStudentIds = [];
    }
    parent.linkedStudentIds.push(studentId);

    // Add parent to student's parentIds
    if (!student.parentIds) {
      student.parentIds = [];
    }
    student.parentIds.push(parentId);

    // Save both users
    await parent.save();
    await student.save();

    console.log(`[Parent Link] Successfully linked parent ${parent.name} (${parent.email}) to student ${student.name} (${student.email})`);

    res.json({
      message: 'Parent linked to student successfully',
      parent: {
        _id: parent._id,
        name: parent.name,
        email: parent.email
      },
      student: {
        _id: student._id,
        name: student.name,
        email: student.email
      }
    });

    
  } catch (error) {
    console.error('Error in linkParentToStudent:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to link parent to student');
  }
});

// @desc    Unlink parent from student
// @route   POST /api/users/unlink-parent
// @access  Private/Admin
const unlinkParentFromStudent = asyncHandler(async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    console.log(`[Parent Unlink] Admin ${req.user._id} attempting to unlink parent ${parentId} from student ${studentId}`);

    // Validate inputs
    if (!parentId || !studentId) {
      console.log(`[Parent Unlink] Validation failed - missing parentId: ${parentId}, studentId: ${studentId}`);
      res.status(400);
      throw new Error('Parent ID and Student ID are required');
    }

    // Check if parent and student exist and belong to same school
    const parent = await User.findOne({ 
      _id: parentId, 
      role: 'parent', 
      schoolId: req.user.schoolId 
    });
    
    const student = await User.findOne({ 
      _id: studentId, 
      role: 'student', 
      schoolId: req.user.schoolId 
    });

    if (!parent) {
      console.log(`[Parent Unlink] Parent ${parentId} not found in school ${req.user.schoolId}`);
      res.status(404);
      throw new Error('Parent not found in your school');
    }

    if (!student) {
      console.log(`[Parent Unlink] Student ${studentId} not found in school ${req.user.schoolId}`);
      res.status(404);
      throw new Error('Student not found in your school');
    }

    // Check if they are actually linked
    const isLinked = parent.linkedStudentIds?.includes(studentId);
    if (!isLinked) {
      console.log(`[Parent Unlink] Parent ${parent.name} is not linked to student ${student.name}`);
      res.status(400);
      throw new Error('Parent is not linked to this student');
    }

    // Remove student from parent's linkedStudentIds
    parent.linkedStudentIds = parent.linkedStudentIds.filter(id => id.toString() !== studentId);

    // Remove parent from student's parentIds
    student.parentIds = student.parentIds.filter(id => id.toString() !== parentId);

    // Save both users
    await parent.save();
    await student.save();

    console.log(`[Parent Unlink] Successfully unlinked parent ${parent.name} (${parent.email}) from student ${student.name} (${student.email})`);

    res.json({
      message: 'Parent unlinked from student successfully',
      parent: {
        _id: parent._id,
        name: parent.name,
        email: parent.email
      },
      student: {
        _id: student._id,
        name: student.name,
        email: student.email
      }
    });

  } catch (error) {
    console.error('Error in unlinkParentFromStudent:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to unlink parent from student');
  }
});

// @desc    Get all available parents for linking
// @route   GET /api/users/available-parents
// @access  Private/Admin
const getAvailableParents = asyncHandler(async (req, res) => {
  try {
    console.log(`[GET_PARENTS] Admin ${req.user.id} requesting available parents`);
    
    // Verify admin permissions
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Access denied - admin only');
    }
    
    // Get all parents in the same school
    const parents = await User.find({
      role: 'parent',
      schoolId: req.user.schoolId,
      active: true
    })
    .select('_id name email linkedStudentIds')
    .populate('linkedStudentIds', 'name email')
    .sort({ name: 1 });
    
    console.log(`[GET_PARENTS] Found ${parents.length} parents in school ${req.user.schoolId}`);
    
    res.status(200).json({
      parents: parents.map(parent => ({
        _id: parent._id,
        name: parent.name,
        email: parent.email,
        linkedStudents: parent.linkedStudentIds || [],
        linkedStudentsCount: parent.linkedStudentIds ? parent.linkedStudentIds.length : 0
      }))
    });
    
  } catch (error) {
    console.error('Error in getAvailableParents:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to get available parents');
  }
});

// @desc    Get student's linked parents
// @route   GET /api/users/student/:id/parents
// @access  Private/Admin
const getStudentParents = asyncHandler(async (req, res) => {
  try {
    const { id: studentId } = req.params;
    
    console.log(`[GET_STUDENT_PARENTS] Admin ${req.user.id} requesting parents for student ${studentId}`);
    
    // Verify admin permissions
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Access denied - admin only');
    }
    
    // Find student in the same school
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      schoolId: req.user.schoolId
    })
    .select('_id name email parentIds')
    .populate('parentIds', '_id name email linkedStudentIds');
    
    if (!student) {
      res.status(404);
      throw new Error('Student not found in this school');
    }
    
    const linkedParents = student.parentIds || [];
    
    console.log(`[GET_STUDENT_PARENTS] Student ${student.name} has ${linkedParents.length} linked parents`);
    
    res.status(200).json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email
      },
      linkedParents: linkedParents.map(parent => ({
        _id: parent._id,
        name: parent.name,
        email: parent.email,
        totalLinkedStudents: parent.linkedStudentIds ? parent.linkedStudentIds.length : 0
      }))
    });
    
  } catch (error) {
    console.error('Error in getStudentParents:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to get student parents');
  }
});

module.exports = {
  linkParentToStudent,
  unlinkParentFromStudent,
  getAvailableParents,
  getStudentParents,
};
