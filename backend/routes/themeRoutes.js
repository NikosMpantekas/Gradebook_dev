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
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

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
router.get('/', authenticate, getAllThemes);
router.get('/default', authenticate, getDefaultTheme);
router.get('/:id', authenticate, getThemeById);

// Protected routes (superadmin only)
router.post('/', authenticate, authorize('superadmin'), themeValidation, createTheme);
router.put('/:id', authenticate, authorize('superadmin'), themeValidation, updateTheme);
router.delete('/:id', authenticate, authorize('superadmin'), deleteTheme);
router.patch('/:id/default', authenticate, authorize('superadmin'), setDefaultTheme);

module.exports = router;
