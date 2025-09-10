const mongoose = require('mongoose');
const logger = require('../utils/logger');

const themeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Theme name is required'],
    trim: true,
    minlength: [2, 'Theme name must be at least 2 characters long'],
    maxlength: [50, 'Theme name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Theme description is required'],
    trim: true,
    minlength: [5, 'Description must be at least 5 characters long'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  primaryColor: {
    type: String,
    required: [true, 'Primary color is required'],
    validate: {
      validator: function(color) {
        // Validate hex color format (#RRGGBB or #RGB)
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
      },
      message: 'Primary color must be a valid hex color (e.g., #FF0000 or #F00)'
    }
  },
  secondaryColor: {
    type: String,
    required: [true, 'Secondary color is required'],
    validate: {
      validator: function(color) {
        // Validate hex color format (#RRGGBB or #RGB)
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
      },
      message: 'Secondary color must be a valid hex color (e.g., #FF0000 or #F00)'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
themeSchema.index({ name: 1 });
themeSchema.index({ isActive: 1 });
themeSchema.index({ createdBy: 1 });

// Pre-save middleware to ensure only one default theme
themeSchema.pre('save', async function(next) {
  try {
    if (this.isDefault && this.isModified('isDefault')) {
      // Remove default flag from all other themes
      await this.constructor.updateMany(
        { _id: { $ne: this._id } },
        { $set: { isDefault: false } }
      );
      logger.info('THEME', 'Updated default theme', {
        newDefaultId: this._id,
        themeName: this.name
      });
    }
    next();
  } catch (error) {
    logger.error('THEME', 'Error in pre-save middleware', { error: error.message });
    next(error);
  }
});

// Static method to get default theme
themeSchema.statics.getDefaultTheme = async function() {
  try {
    const defaultTheme = await this.findOne({ isDefault: true, isActive: true });
    if (!defaultTheme) {
      // If no default theme exists, create one
      const fallbackTheme = new this({
        name: 'Default Theme',
        description: 'Classic blue theme',
        primaryColor: '#475569',
        secondaryColor: '#F8FAFC',
        isDefault: true,
        createdBy: new mongoose.Types.ObjectId() // System created
      });
      await fallbackTheme.save();
      logger.info('THEME', 'Created fallback default theme');
      return fallbackTheme;
    }
    return defaultTheme;
  } catch (error) {
    logger.error('THEME', 'Error getting default theme', { error: error.message });
    throw error;
  }
};

// Instance method to generate CSS variables
themeSchema.methods.generateCSSVariables = function() {
  const hexToHsl = (hex) => {
    const r = parseInt(hex.substr(1, 2), 16) / 255;
    const g = parseInt(hex.substr(3, 2), 16) / 255;
    const b = parseInt(hex.substr(5, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const primaryHsl = hexToHsl(this.primaryColor);
  const secondaryHsl = hexToHsl(this.secondaryColor);

  // Generate complementary colors for a complete theme
  const generateComplementaryColors = (primary, secondary) => {
    return {
      primary: primaryHsl,
      secondary: secondaryHsl,
      accent: primaryHsl, // Use primary as accent
      background: '#FEFEFE',
      foreground: '#1F2937',
      card: secondaryHsl,
      'card-foreground': '#1F2937',
      muted: secondaryHsl,
      'muted-foreground': '#6B7280',
      border: secondaryHsl,
      input: secondaryHsl,
      ring: primaryHsl
    };
  };

  return {
    colors: generateComplementaryColors(this.primaryColor, this.secondaryColor),
    darkColors: {
      primary: primaryHsl,
      secondary: '#1F2937',
      accent: primaryHsl,
      background: '#111827',
      foreground: secondaryHsl,
      card: '#1F2937',
      'card-foreground': secondaryHsl,
      muted: '#374151',
      'muted-foreground': primaryHsl,
      border: '#374151',
      input: '#1F2937',
      ring: primaryHsl
    }
  };
};

const Theme = mongoose.model('Theme', themeSchema);

module.exports = Theme;
