import mongoose from 'mongoose';

const jobOpportunitySchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Job title / profile is required'],
      trim: true,
      minlength: [2, 'Job title must be at least 2 characters'],
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    opportunityType: {
      type: String,
      enum: {
        values: ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO', 'MULTIPLE'],
        message: 'Opportunity type must be FULL_TIME, INTERNSHIP, INTERNSHIP_PPO, or MULTIPLE',
      },
      required: [true, 'Opportunity type is required'],
    },
    candidateType: {
      type: String,
      enum: {
        values: ['FRESHERS', 'EXPERIENCED', 'BOTH'],
        message: 'Candidate type must be FRESHERS, EXPERIENCED, or BOTH',
      },
      required: [true, 'Candidate type is required'],
    },
    openings: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    workMode: {
      type: String,
      enum: {
        values: ['ON_SITE', 'HYBRID', 'REMOTE', ''],
        message: 'Work mode must be ON_SITE, HYBRID, or REMOTE',
      },
      default: '',
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    stipend: {
      type: String,
      trim: true,
      default: '',
    },
    bond: {
      type: String,
      trim: true,
      default: '',
    },
    specialRequirement: {
      type: String,
      trim: true,
      default: '',
    },
    hiringStatus: {
      type: String,
      enum: {
        values: ['HIRING_NOW', 'HIRING_PLANNED', 'NOT_HIRING', 'ON_HOLD', 'CLOSED'],
        message: 'Hiring status must be HIRING_NOW, HIRING_PLANNED, NOT_HIRING, ON_HOLD, or CLOSED',
      },
      default: 'HIRING_NOW',
    },
    source: {
      type: String,
      enum: {
        values: ['HR_CALL', 'HR_EMAIL', 'HR_WHATSAPP', 'LINKEDIN', 'WEBSITE', 'REFERRAL', 'MANUAL', 'OTHER'],
        message: 'Source must be HR_CALL, HR_EMAIL, HR_WHATSAPP, LINKEDIN, WEBSITE, REFERRAL, MANUAL, or OTHER',
      },
      default: 'MANUAL',
    },
    interactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interaction',
      default: null,
    },
    jobRoleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobRole',
      },
    ],
    jdDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    isShortlisted: {
      type: Boolean,
      default: false,
    },
    shortlistedAt: {
      type: Date,
      default: null,
    },
    shortlistedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pmoReviewNote: {
      type: String,
      trim: true,
      default: '',
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
          ret.company = {
            id: (ret.companyId._id || ret.companyId.id || '').toString(),
            name: ret.companyId.name || ret.companyId.companyName || '',
            website: ret.companyId.website || '',
            industry: ret.companyId.industry || '',
            city: ret.companyId.city || '',
          };
          ret.companyId = ret.company.id;
        } else if (ret.companyId) {
          ret.companyId = ret.companyId.toString();
        }

        if (ret.createdBy && typeof ret.createdBy === 'object') {
          ret.creator = {
            id: (ret.createdBy._id || ret.createdBy.id || '').toString(),
            name: ret.createdBy.name || '',
            email: ret.createdBy.email || '',
          };
          ret.createdBy = ret.creator.id;
        } else if (ret.createdBy) {
          ret.createdBy = ret.createdBy.toString();
        }

        if (ret.shortlistedBy && typeof ret.shortlistedBy === 'object') {
          ret.shortlistedByUser = {
            id: (ret.shortlistedBy._id || ret.shortlistedBy.id || '').toString(),
            name: ret.shortlistedBy.name || '',
            email: ret.shortlistedBy.email || '',
          };
          ret.shortlistedBy = ret.shortlistedByUser.id;
        } else if (ret.shortlistedBy) {
          ret.shortlistedBy = ret.shortlistedBy.toString();
        }

        if (ret.jdDocumentId && typeof ret.jdDocumentId === 'object') {
          ret.jdDocument = {
            id: (ret.jdDocumentId._id || ret.jdDocumentId.id || '').toString(),
            originalFileName: ret.jdDocumentId.originalFileName || '',
            mimeType: ret.jdDocumentId.mimeType || '',
            fileSize: ret.jdDocumentId.fileSize || 0,
            createdAt: ret.jdDocumentId.createdAt,
          };
          ret.jdDocumentId = ret.jdDocument.id;
        } else if (ret.jdDocumentId) {
          ret.jdDocumentId = ret.jdDocumentId.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
jobOpportunitySchema.index({ organizationId: 1, hiringStatus: 1 });
jobOpportunitySchema.index({ organizationId: 1, companyId: 1 });
jobOpportunitySchema.index({ organizationId: 1, opportunityType: 1 });
jobOpportunitySchema.index({ organizationId: 1, isShortlisted: 1 });
jobOpportunitySchema.index({ organizationId: 1, hiringStatus: 1, isShortlisted: 1 });
jobOpportunitySchema.index({ organizationId: 1, createdAt: -1 });

const JobOpportunity = mongoose.model('JobOpportunity', jobOpportunitySchema);

export default JobOpportunity;
