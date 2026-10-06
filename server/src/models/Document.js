import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobOpportunity',
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by user ID is required'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: {
        values: ['LOCAL', 'CLOUDFLARE_R2', 'S3'],
        message: 'Storage provider must be LOCAL, CLOUDFLARE_R2, or S3',
      },
      default: 'LOCAL',
    },
    documentType: {
      type: String,
      enum: {
        values: ['JOB_DESCRIPTION', 'COMPANY_BROCHURE', 'MOU', 'OTHER'],
        message: 'Document type must be JOB_DESCRIPTION, COMPANY_BROCHURE, MOU, or OTHER',
      },
      default: 'JOB_DESCRIPTION',
    },
    isTestData: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();

        if (ret.organizationId && typeof ret.organizationId === 'object') {
          ret.organizationId = (ret.organizationId._id || ret.organizationId.id || '').toString();
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }

        if (ret.companyId && typeof ret.companyId === 'object') {
          ret.companyId = (ret.companyId._id || ret.companyId.id || '').toString();
        } else if (ret.companyId) {
          ret.companyId = ret.companyId.toString();
        }

        if (ret.uploadedBy && typeof ret.uploadedBy === 'object') {
          ret.uploadedBy = {
            id: (ret.uploadedBy._id || ret.uploadedBy.id || '').toString(),
            name: ret.uploadedBy.name || '',
            email: ret.uploadedBy.email || '',
          };
        } else if (ret.uploadedBy) {
          ret.uploadedBy = ret.uploadedBy.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

documentSchema.index({ organizationId: 1, companyId: 1 });
documentSchema.index({ organizationId: 1, storageKey: 1 });
documentSchema.index({ opportunityId: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
