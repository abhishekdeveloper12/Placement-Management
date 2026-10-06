import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [150, 'Organization name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Organization code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Organization code must be at least 2 characters'],
      maxlength: [20, 'Organization code cannot exceed 20 characters'],
      match: [/^[A-Z0-9_-]+$/, 'Organization code must contain only uppercase letters, numbers, hyphens, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
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
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
organizationSchema.index({ status: 1 });
organizationSchema.index({ name: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
