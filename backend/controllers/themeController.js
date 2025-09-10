const Theme = require('../models/themeModel');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Get all active themes
const getAllThemes = async (req, res) => {
  try {
    logger.info('THEME', 'Fetching all active themes', {
      userId: req.user._id
    });

    const themes = await Theme.find({ isActive: true })
      .populate('createdBy', 'name email role')
      .sort({ isDefault: -1, createdAt: -1 });

    // Transform themes to include CSS variables
    const themesWithCSS = themes.map(theme => ({
      ...theme.toObject(),
      cssVariables: theme.generateCSSVariables()
    }));

    logger.info('THEME', 'Successfully fetched themes', {
      count: themes.length,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Themes fetched successfully',
      themes: themesWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error fetching themes', {
      error: error.message,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch themes',
      error: error.message
    });
  }
};

// Get theme by ID
const getThemeById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('THEME', 'Fetching theme by ID', {
      themeId: id,
      userId: req.user._id
    });

    const theme = await Theme.findById(id)
      .populate('createdBy', 'name email role');

    if (!theme) {
      logger.warn('THEME', 'Theme not found', {
        themeId: id,
        userId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    const themeWithCSS = {
      ...theme.toObject(),
      cssVariables: theme.generateCSSVariables()
    };

    logger.info('THEME', 'Successfully fetched theme', {
      themeId: id,
      themeName: theme.name,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Theme fetched successfully',
      theme: themeWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error fetching theme by ID', {
      error: error.message,
      themeId: req.params.id,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch theme',
      error: error.message
    });
  }
};

// Create new theme (superadmin only)
const createTheme = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('THEME', 'Validation errors in create theme', {
        errors: errors.array(),
        userId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, primaryColor, secondaryColor, isDefault } = req.body;

    logger.info('THEME', 'Creating new theme', {
      name,
      description,
      primaryColor,
      secondaryColor,
      isDefault,
      userId: req.user._id
    });

    // Check if theme name already exists
    const existingTheme = await Theme.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true 
    });

    if (existingTheme) {
      logger.warn('THEME', 'Theme name already exists', {
        name,
        existingThemeId: existingTheme._id,
        userId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: 'Theme name already exists'
      });
    }

    const theme = new Theme({
      name,
      description,
      primaryColor,
      secondaryColor,
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    await theme.save();

    // Populate creator info
    await theme.populate('createdBy', 'name email role');

    const themeWithCSS = {
      ...theme.toObject(),
      cssVariables: theme.generateCSSVariables()
    };

    logger.info('THEME', 'Theme created successfully', {
      themeId: theme._id,
      name: theme.name,
      userId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Theme created successfully',
      theme: themeWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error creating theme', {
      error: error.message,
      body: req.body,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create theme',
      error: error.message
    });
  }
};

// Update theme (superadmin only)
const updateTheme = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('THEME', 'Validation errors in update theme', {
        errors: errors.array(),
        themeId: req.params.id,
        userId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description, primaryColor, secondaryColor, isDefault } = req.body;

    logger.info('THEME', 'Updating theme', {
      themeId: id,
      updates: { name, description, primaryColor, secondaryColor, isDefault },
      userId: req.user._id
    });

    // Check if theme exists
    const theme = await Theme.findById(id);
    if (!theme) {
      logger.warn('THEME', 'Theme not found for update', {
        themeId: id,
        userId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    // Check if new name conflicts with existing theme
    if (name && name !== theme.name) {
      const existingTheme = await Theme.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
        isActive: true
      });

      if (existingTheme) {
        logger.warn('THEME', 'Theme name already exists during update', {
          name,
          existingThemeId: existingTheme._id,
          updateThemeId: id,
          userId: req.user._id
        });
        return res.status(400).json({
          success: false,
          message: 'Theme name already exists'
        });
      }
    }

    // Update theme
    const updatedTheme = await Theme.findByIdAndUpdate(
      id,
      {
        name,
        description,
        primaryColor,
        secondaryColor,
        isDefault,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email role');

    const themeWithCSS = {
      ...updatedTheme.toObject(),
      cssVariables: updatedTheme.generateCSSVariables()
    };

    logger.info('THEME', 'Theme updated successfully', {
      themeId: id,
      name: updatedTheme.name,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Theme updated successfully',
      theme: themeWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error updating theme', {
      error: error.message,
      themeId: req.params.id,
      body: req.body,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update theme',
      error: error.message
    });
  }
};

// Delete theme (superadmin only)
const deleteTheme = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('THEME', 'Deleting theme', {
      themeId: id,
      userId: req.user._id
    });

    const theme = await Theme.findById(id);
    if (!theme) {
      logger.warn('THEME', 'Theme not found for deletion', {
        themeId: id,
        userId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    // Prevent deletion of default theme
    if (theme.isDefault) {
      logger.warn('THEME', 'Attempted to delete default theme', {
        themeId: id,
        themeName: theme.name,
        userId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default theme'
      });
    }

    // Soft delete by setting isActive to false
    await Theme.findByIdAndUpdate(id, { 
      isActive: false,
      updatedAt: new Date()
    });

    logger.info('THEME', 'Theme deleted successfully', {
      themeId: id,
      themeName: theme.name,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    logger.error('THEME', 'Error deleting theme', {
      error: error.message,
      themeId: req.params.id,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete theme',
      error: error.message
    });
  }
};

// Set default theme (superadmin only)
const setDefaultTheme = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('THEME', 'Setting default theme', {
      themeId: id,
      userId: req.user._id
    });

    const theme = await Theme.findById(id);
    if (!theme || !theme.isActive) {
      logger.warn('THEME', 'Theme not found or inactive for default setting', {
        themeId: id,
        userId: req.user._id
      });
      return res.status(404).json({
        success: false,
        message: 'Theme not found or inactive'
      });
    }

    // Set this theme as default (pre-save middleware will handle removing default from others)
    theme.isDefault = true;
    await theme.save();

    await theme.populate('createdBy', 'name email role');

    const themeWithCSS = {
      ...theme.toObject(),
      cssVariables: theme.generateCSSVariables()
    };

    logger.info('THEME', 'Default theme set successfully', {
      themeId: id,
      themeName: theme.name,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Default theme set successfully',
      theme: themeWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error setting default theme', {
      error: error.message,
      themeId: req.params.id,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to set default theme',
      error: error.message
    });
  }
};

// Get default theme
const getDefaultTheme = async (req, res) => {
  try {
    logger.info('THEME', 'Fetching default theme', {
      userId: req.user._id
    });

    const defaultTheme = await Theme.getDefaultTheme();
    await defaultTheme.populate('createdBy', 'name email role');

    const themeWithCSS = {
      ...defaultTheme.toObject(),
      cssVariables: defaultTheme.generateCSSVariables()
    };

    logger.info('THEME', 'Default theme fetched successfully', {
      themeId: defaultTheme._id,
      themeName: defaultTheme.name,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Default theme fetched successfully',
      theme: themeWithCSS
    });
  } catch (error) {
    logger.error('THEME', 'Error fetching default theme', {
      error: error.message,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default theme',
      error: error.message
    });
  }
};

module.exports = {
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  deleteTheme,
  setDefaultTheme,
  getDefaultTheme
};
