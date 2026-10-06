import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      validate: {
        validator: function (value) {
          // SUPER_ADMIN must NOT belong to an organization
          if (this.role === 'SUPER_ADMIN') {
            return value === null || value === undefined;
          }
          // PMO and TEAM_MEMBER MUST belong to an organization
          if (this.role === 'PMO' || this.role === 'TEAM_MEMBER') {
            return value !== null && value !== undefined;
          }
          return true;
        },
        message: 'PMO and TEAM_MEMBER roles must have a valid organizationId; SUPER_ADMIN must have null organizationId',
      },
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hash in regular queries
    },
    role: {
      type: String,
      enum: {
        values: ['SUPER_ADMIN', 'PMO', 'TEAM_MEMBER'],
        message: 'Role must be either SUPER_ADMIN, PMO, or TEAM_MEMBER',
      },
      required: [true, 'User role is required'],
    },
    phone: {
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
    lastLoginAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
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
          const orgId = (ret.organizationId._id || ret.organizationId.id || '').toString();
          ret.organization = ret.organizationId;
          ret.organizationId = orgId;
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // Critical: Never expose passwordHash in output
        return ret;
      },
    },
  }
);

// Compound and standalone indexes
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, status: 1 });
userSchema.index({ organizationId: 1, role: 1, status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

/**
 * Compare candidate password with stored bcrypt hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded for comparison');
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Static utility to hash plain password
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model('User', userSchema);

export default User;
