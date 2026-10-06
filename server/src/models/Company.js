import mongoose from 'mongoose';

/**
 * Normalizes company name for deterministic duplicate detection within an organization.
 * Lowercases and strips non-alphanumeric characters.
 */
export const normalizeCompanyName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Normalizes website URL by removing protocols, www prefix, and trailing slashes.
 */
export const normalizeWebsite = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
};

const companySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry cannot exceed 100 characters'],
      default: '',
    },
    website: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    linkedin: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'INACTIVE'],
        message: 'Status must be either ACTIVE or INACTIVE',
      },
      default: 'ACTIVE',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source: {
      type: String,
      enum: {
        values: ['MANUAL_PMO', 'BULK_IMPORT', 'TEAM_MEMBER_SELF_ADDED', 'OTHER'],
        message: 'Invalid company source',
      },
      default: 'MANUAL_PMO',
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

        // Safe transform for populated organizationId
        if (ret.organizationId && typeof ret.organizationId === 'object') {
          const orgIdStr = (ret.organizationId._id || ret.organizationId.id || '').toString();
          ret.organizationId = {
            id: orgIdStr,
            name: ret.organizationId.name || '',
            code: ret.organizationId.code || '',
          };
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }

        // Safe transform for populated createdBy
        if (ret.createdBy && typeof ret.createdBy === 'object') {
          const userIdStr = (ret.createdBy._id || ret.createdBy.id || '').toString();
          ret.createdBy = {
            id: userIdStr,
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

// Pre-validate middleware to set normalizedName
companySchema.pre('validate', function (next) {
  if (this.companyName) {
    this.normalizedName = normalizeCompanyName(this.companyName);
  }
  next();
});

// Performance & uniqueness indexes
companySchema.index({ organizationId: 1, normalizedName: 1 }, { unique: true });
companySchema.index({ organizationId: 1, status: 1 });
companySchema.index({ organizationId: 1, industry: 1 });
companySchema.index({ organizationId: 1, city: 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;
