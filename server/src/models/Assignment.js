import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned Team Member user ID is required'],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigning PMO user ID is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    unassignedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'ENDED'],
        message: 'Status must be ACTIVE or ENDED',
      },
      default: 'ACTIVE',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: {
        values: ['PMO_ASSIGNED', 'BULK_IMPORT', 'TEAM_MEMBER_SELF_ADDED', 'OTHER'],
        message: 'Invalid assignment source',
      },
      default: 'PMO_ASSIGNED',
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

        if (ret.assignedTo && typeof ret.assignedTo === 'object') {
          ret.assignedTo = {
            id: (ret.assignedTo._id || ret.assignedTo.id || '').toString(),
            name: ret.assignedTo.name || '',
            email: ret.assignedTo.email || '',
          };
        } else if (ret.assignedTo) {
          ret.assignedTo = ret.assignedTo.toString();
        }

        if (ret.assignedBy && typeof ret.assignedBy === 'object') {
          ret.assignedBy = {
            id: (ret.assignedBy._id || ret.assignedBy.id || '').toString(),
            name: ret.assignedBy.name || '',
            email: ret.assignedBy.email || '',
          };
        } else if (ret.assignedBy) {
          ret.assignedBy = ret.assignedBy.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Database-level constraint: at most ONE active assignment per company per organization
assignmentSchema.index(
  { organizationId: 1, companyId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

// Performance indexes
assignmentSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
assignmentSchema.index({ organizationId: 1, companyId: 1, createdAt: -1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
