import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema(
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
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID (conductedBy) is required'],
    },
    interactionType: {
      type: String,
      enum: {
        values: ['PHONE_CALL', 'EMAIL', 'MEETING'],
        message: 'Interaction type must be PHONE_CALL, EMAIL, or MEETING',
      },
      default: 'PHONE_CALL',
    },
    outcome: {
      type: String,
      enum: {
        values: [
          'HIRING_NOW',
          'HIRING_PLANNED',
          'NOT_HIRING',
          'NOT_SURE',
          'WAITING_FOR_JD',
          'FOLLOW_UP_REQUIRED',
          'NO_RESPONSE',
        ],
        message: 'Invalid outcome value',
      },
      required: [true, 'Interaction outcome is required'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    interactionDate: {
      type: Date,
      default: Date.now,
    },
    nextAction: {
      type: String,
      enum: {
        values: ['FOLLOW_UP', 'WAITING_FOR_JD', 'NO_ACTION', 'OTHER'],
        message: 'Invalid next action value',
      },
      default: 'NO_ACTION',
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    callDetails: {
      hiringStatus: {
        type: String,
        enum: {
          values: ['YES', 'NO', 'HIRING_PLANNED', 'NOT_SURE'],
          message: 'Invalid hiring status',
        },
        default: 'NOT_SURE',
      },
      profiles: {
        type: [String],
        default: [],
      },
      jobRoleIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'JobRole',
        },
      ],
      jobRoleSnapshots: [
        {
          roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JobRole',
          },
          name: {
            type: String,
            trim: true,
          },
        },
      ],
      candidateType: {
        type: String,
        enum: {
          values: ['FRESHERS', 'EXPERIENCED', 'BOTH'],
          message: 'Invalid candidate type',
        },
        default: 'BOTH',
      },
      openings: {
        type: Number,
        default: null,
        min: [0, 'Openings cannot be negative'],
      },
      opportunityType: {
        type: String,
        enum: {
          values: ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO', 'MULTIPLE'],
          message: 'Invalid opportunity type',
        },
        default: 'FULL_TIME',
      },
      ppoAvailable: {
        type: String,
        enum: {
          values: ['YES', 'NO', 'NOT_SURE'],
          message: 'Invalid PPO availability',
        },
        default: 'NOT_SURE',
      },
      location: {
        type: String,
        trim: true,
        default: '',
      },
      workMode: {
        type: String,
        enum: {
          values: ['ONSITE', 'HYBRID', 'REMOTE', 'NOT_SPECIFIED'],
          message: 'Invalid work mode',
        },
        default: 'NOT_SPECIFIED',
      },
      salaryOrStipend: {
        type: String,
        trim: true,
        default: '',
      },
      bond: {
        type: String,
        enum: {
          values: ['YES', 'NO', 'NOT_SURE'],
          message: 'Invalid bond value',
        },
        default: 'NOT_SURE',
      },
      specificRequirement: {
        type: String,
        trim: true,
        default: '',
      },
      hrResponse: {
        type: String,
        trim: true,
        default: '',
      },
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
          };
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }

        if (ret.companyId && typeof ret.companyId === 'object') {
          ret.companyId = {
            id: (ret.companyId._id || ret.companyId.id || '').toString(),
            companyName: ret.companyId.companyName || '',
            industry: ret.companyId.industry || '',
            city: ret.companyId.city || '',
          };
        } else if (ret.companyId) {
          ret.companyId = ret.companyId.toString();
        }

        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = {
            id: (ret.userId._id || ret.userId.id || '').toString(),
            name: ret.userId.name || '',
            email: ret.userId.email || '',
          };
        } else if (ret.userId) {
          ret.userId = ret.userId.toString();
        }

        if (ret.contactId && typeof ret.contactId === 'object') {
          ret.contactId = {
            id: (ret.contactId._id || ret.contactId.id || '').toString(),
            name: ret.contactId.name || '',
            designation: ret.contactId.designation || '',
            email: ret.contactId.email || '',
            phone: ret.contactId.phone || '',
          };
        } else if (ret.contactId) {
          ret.contactId = ret.contactId.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance & query indexes
interactionSchema.index({ organizationId: 1, companyId: 1, interactionDate: -1 });
interactionSchema.index({ organizationId: 1, userId: 1, interactionDate: -1 });
interactionSchema.index({ organizationId: 1, outcome: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;
