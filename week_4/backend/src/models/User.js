import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneOtpHash: {
      type: String,
      select: false,
    },
    phoneOtpExpiresAt: {
      type: Date,
      select: false,
    },
    phoneOtpSentAt: {
      type: Date,
      select: false,
    },
    phoneOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    shippingAddress: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)

export default User
