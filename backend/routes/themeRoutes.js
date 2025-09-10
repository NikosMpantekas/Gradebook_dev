const express = require('express');
const { body } = require('express-validator');
const {
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  deleteTheme,
  setDefaultTheme,
  getDefaultTheme
} = require('../controllers/themeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const themeValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Theme name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Theme name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('description')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Description must be between 5 and 200 characters'),
  
  body('primaryColor')
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Primary color must be a valid hex color (e.g., #FF0000 or #F00)'),
  
  body('secondaryColor')
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Secondary color must be a valid hex color (e.g., #FF0000 or #F00)'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value')
];

// Public routes (authenticated users)
router.get('/', protect, getAllThemes);
router.get('/default', protect, getDefaultTheme);
router.get('/:id', protect, getThemeById);

// Protected routes (superadmin only)
router.post('/', protect, authorize('superadmin'), themeValidation, createTheme);
router.put('/:id', protect, authorize('superadmin'), themeValidation, updateTheme);
router.delete('/:id', protect, authorize('superadmin'), deleteTheme);
router.patch('/:id/default', protect, authorize('superadmin'), setDefaultTheme);

module.exports = router;
