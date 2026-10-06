import mongoose from 'mongoose';

const jobRoleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Job role name is required'],
      trim: true,
      maxlength: [100, 'Job role name cannot exceed 100 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'INACTIVE'],
        message: 'Status must be ACTIVE or INACTIVE',
      },
      default: 'ACTIVE',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
          ret.organizationId = {
            id: (ret.organizationId._id || ret.organizationId.id || '').toString(),
            name: ret.organizationId.name || '',
            code: ret.organizationId.code || '',
          };
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }

        if (ret.createdBy && typeof ret.createdBy === 'object') {
          ret.createdBy = {
            id: (ret.createdBy._id || ret.createdBy.id || '').toString(),
            name: ret.createdBy.name || '',
            email: ret.createdBy.email || '',
          };
        } else if (ret.createdBy) {
          ret.createdBy = ret.createdBy.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index enforcing uniqueness per organization
jobRoleSchema.index({ organizationId: 1, normalizedName: 1 }, { unique: true });
jobRoleSchema.index({ organizationId: 1, status: 1 });

const JobRole = mongoose.model('JobRole', jobRoleSchema);

export default JobRole;
