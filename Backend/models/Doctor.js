const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: String,
    unique: true,
    required: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
      'General Medicine', 'Gynecology', 'Neurology', 'Oncology',
      'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology',
      'Surgery', 'Urology', 'Emergency Medicine', 'Anesthesiology'
    ]
  },
  qualifications: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  }],
  department: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  about: {
    type: String,
    maxlength: [500, 'About section cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Generate doctor ID before saving
doctorSchema.pre('save', async function(next) {
  if (!this.doctorId) {
    const count = await this.constructor.countDocuments();
    this.doctorId = `DOC${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
doctorSchema.index({ doctorId: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ user: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
