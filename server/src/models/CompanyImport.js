import mongoose from 'mongoose';

const companyImportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by user ID is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
      default: 'CSV',
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    invalidRows: {
      type: Number,
      default: 0,
    },
    duplicateRows: {
      type: Number,
      default: 0,
    },
    importedRows: {
      type: Number,
      default: 0,
    },
    failedRows: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'],
      default: 'PROCESSING',
    },
    errorReport: [
      {
        rowNumber: { type: Number, required: true },
        companyName: { type: String, default: '' },
        status: { type: String, default: 'INVALID' },
        reason: { type: String, default: '' },
      },
    ],
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
          ret.organizationId = {
            id: (ret.organizationId._id || ret.organizationId.id || '').toString(),
            name: ret.organizationId.name || '',
          };
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
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

companyImportSchema.index({ organizationId: 1, createdAt: -1 });

const CompanyImport = mongoose.model('CompanyImport', companyImportSchema);

export default CompanyImport;
