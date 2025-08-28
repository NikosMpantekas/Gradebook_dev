const mongoose = require('mongoose');

const attachmentSchema = mongoose.Schema(
  {
    // Entity type this attachment belongs to
    entityType: {
      type: String,
      enum: ['Attendance', 'Session', 'Class', 'User'],
      required: true,
      index: true,
    },
    // Entity ID this attachment belongs to
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // School association for multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    // File information
    fileName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    originalFileName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    fileUrl: {
      type: String,
      required: true,
      maxlength: 500,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    mimeType: {
      type: String,
      maxlength: 100,
    },
    // Upload tracking
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Description or notes about the attachment
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Attachment category for organization
    category: {
      type: String,
      enum: ['medical_excuse', 'absence_note', 'late_justification', 'other'],
      default: 'other',
      index: true,
    },
    // Active status for soft deletion
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries by entity
attachmentSchema.index({ entityType: 1, entityId: 1 });

// Performance indexes
attachmentSchema.index({ schoolId: 1, uploadedAt: -1 });
attachmentSchema.index({ uploadedBy: 1, uploadedAt: -1 });
attachmentSchema.index({ category: 1, uploadedAt: -1 });

// Static method to get attachments for an entity
attachmentSchema.statics.getEntityAttachments = async function(entityType, entityId, options = {}) {
  try {
    console.log(`[ATTACHMENT_QUERY] Getting attachments for ${entityType} ${entityId}`);
    
    const query = { 
      entityType, 
      entityId: new mongoose.Types.ObjectId(entityId),
      active: true 
    };
    
    if (options.category) {
      query.category = options.category;
    }
    
    let attachmentQuery = this.find(query);
    
    if (options.populate) {
      attachmentQuery = attachmentQuery.populate('uploadedBy', 'name role');
    }
    
    const attachments = await attachmentQuery.sort({ uploadedAt: -1 });
    
    console.log(`[ATTACHMENT_QUERY] Found ${attachments.length} attachments for ${entityType} ${entityId}`);
    return attachments;
  } catch (error) {
    console.error('[ATTACHMENT_QUERY] Error getting entity attachments:', error);
    throw error;
  }
};

// Static method to create attachment
attachmentSchema.statics.createAttachment = async function(attachmentData) {
  try {
    const { entityType, entityId, schoolId, fileName, originalFileName, fileUrl, fileSize, mimeType, uploadedBy, description, category } = attachmentData;
    
    console.log(`[ATTACHMENT_CREATE] Creating attachment for ${entityType} ${entityId}`);
    
    const attachment = new this({
      entityType,
      entityId,
      schoolId,
      fileName,
      originalFileName,
      fileUrl,
      fileSize,
      mimeType,
      uploadedBy,
      description: description || '',
      category: category || 'other',
    });
    
    await attachment.save();
    
    console.log(`[ATTACHMENT_CREATE] Created attachment ${attachment._id}`);
    return attachment;
  } catch (error) {
    console.error('[ATTACHMENT_CREATE] Error creating attachment:', error);
    throw error;
  }
};

// Instance method to soft delete attachment
attachmentSchema.methods.softDelete = async function() {
  try {
    console.log(`[ATTACHMENT_DELETE] Soft deleting attachment ${this._id}`);
    this.active = false;
    await this.save();
    return this;
  } catch (error) {
    console.error('[ATTACHMENT_DELETE] Error soft deleting attachment:', error);
    throw error;
  }
};

module.exports = mongoose.model('Attachment', attachmentSchema);
