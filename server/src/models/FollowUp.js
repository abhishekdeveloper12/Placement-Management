import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
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
      required: [true, 'Assigned user ID is required'],
    },
    interactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interaction',
      default: null,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required for follow-up'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'COMPLETED', 'CANCELLED'],
        message: 'Status must be PENDING, COMPLETED, or CANCELLED',
      },
      default: 'PENDING',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    completedAt: {
      type: Date,
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
        ret.isOverdue = ret.status === 'PENDING' && new Date(ret.dueDate) < new Date();

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

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance & index optimization
followUpSchema.index({ organizationId: 1, assignedTo: 1, dueDate: 1, status: 1 });
followUpSchema.index({ organizationId: 1, companyId: 1, dueDate: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;
