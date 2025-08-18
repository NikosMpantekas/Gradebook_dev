const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { canManageStudents } = require('../middleware/authMiddleware');

// Import the controller functions
const { 
  getStudentStats, 
  getStudentDetailedStats,
  getStudentDashboard 
} = require('../controllers/studentStatsController');

// @route   GET /api/stats/student-dashboard
// @desc    Get student dashboard data (quick stats and recent grades)
// @access  Private (Student only - their own data)
router.get('/student-dashboard', protect, getStudentDashboard);

// @route   GET /api/stats/students
// @desc    Get student statistics with grade averages and counts
// @access  Private (Admin: all students, Teacher: only shared students)
router.get('/students', protect, canManageStudents, getStudentStats);

// @route   GET /api/stats/students/:id
// @desc    Get detailed statistics for a specific student
// @access  Private (Admin: any student, Teacher: only shared students)
router.get('/students/:id', protect, canManageStudents, getStudentDetailedStats);

module.exports = router;
